/*
  player.js
  ---------
  Everything to do with actually playing audio through YouTube lives here.

  What this file does
   - loads the official YouTube IFrame Player API (once, up-front, with a
     timeout + error handler so a blocked / offline API can never leave the
     UI hanging on "loading")
   - creates ONE real YT.Player instance inside the hidden #yt-player div
   - exposes a small API (Player.start, Player.next, Player.seekTo, ...) so
     app.js never touches the YouTube object directly
   - AUTOPLAY GATE: playback is always started from inside a real click
     handler. If the browser still refuses (autoplay blocked), we emit
     "autoplayblocked" so the UI can show a "बैठ जा / गाना चलाओ" button.
   - ERROR RESILIENCE: codes 2 / 5 / 100 / 101 / 150 auto-skip to the next
     playable song in the active queue; a start-up watchdog catches songs
     that never begin; a session "failed" list stops us retrying dead songs.
   - STATE SYNC: one place (handleStateChange) turns YouTube states into
     UI events, and progress is only reported for the *current* video, so a
     stale time from the previous song can never flicker onto the seek bar.

  We never download, extract, or store audio. Playback always happens
  inside YouTube's own official player.

  Events emitted (subscribe with Player.on(name, cb)):
    ready              player is ready to accept commands
    songchange         { song, index, total }
    playstate          { playing }
    buffering          { on }
    progress           { current, duration }
    shuffle            { on }
    volume             { percent }
    songerror          { song, code, meaning, skipping }
    autoplayblocked    {}       browser refused to start sound
    apierror           { message }   API script / iframe never came up
    allfailed          {}       every song in the queue failed
    duration           { youtubeId, seconds }   a song's length was discovered
*/

const Player = (() => {
  // ---- tunables --------------------------------------------------------------
  const API_TIMEOUT_MS    = 12000; // YouTube API script / iframe must be ready by then
  const START_WATCHDOG_MS = 8000;  // a requested song must be playing/buffering by then

  // ---- state -----------------------------------------------------------------
  let ytPlayer = null;
  let ytReady = false;
  let apiPromise = null;
  let initPromise = null;

  let queue = [];              // the current (possibly filtered) list of songs
  let queueIndex = 0;          // where we are in `queue`

  let volume = 70;

  let hasLoaded = false;       // has any song been requested from YouTube yet?
  let pending = null;          // "random" | "current" — a start requested before the player was ready
  let progressTimer = null;
  let watchdogTimer = null;
  let bufferRetried = false;

  const failed = new Set();    // youtubeIds that errored this session
  let consecutiveFailures = 0; // reset as soon as any song actually plays

  const listeners = {};

  function on(eventName, cb) {
    (listeners[eventName] = listeners[eventName] || []).push(cb);
  }
  function emit(eventName, payload) {
    (listeners[eventName] || []).forEach((cb) => {
      try { cb(payload); } catch (err) { console.error(`Player listener for "${eventName}" threw:`, err); }
    });
  }

  // ---- 1. Boot the official YouTube IFrame API ---------------------------------
  function loadYouTubeAPI() {
    if (apiPromise) return apiPromise;

    apiPromise = new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) { resolve(); return; }

      const previousHandler = window.onYouTubeIframeAPIReady; // don't clobber anyone else's
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previousHandler === "function") previousHandler();
        resolve();
      };

      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.onerror = () => reject(new Error("The YouTube API script could not be loaded (offline, blocked or ad-blocker?)."));
      document.head.appendChild(tag);

      setTimeout(() => reject(new Error("The YouTube API took too long to load.")), API_TIMEOUT_MS);
    }).catch((err) => {
      apiPromise = null; // allow a retry
      throw err;
    });

    return apiPromise;
  }

  function buildPlayerVars() {
    const vars = {
      playsinline: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      iv_load_policy: 3,
    };
    // "origin" is only valid on http(s). On file:// it would be the string
    // "null" and YouTube answers with error 153 — so we simply leave it out.
    if (/^https?:$/.test(window.location.protocol)) {
      vars.origin = window.location.origin;
    }
    return vars;
  }

  function createPlayer() {
    return new Promise((resolve, reject) => {
      const readyTimeout = setTimeout(
        () => reject(new Error("The YouTube player did not become ready in time.")),
        API_TIMEOUT_MS
      );

      const playerVars = buildPlayerVars();

      ytPlayer = new YT.Player("yt-player", {
        height: "100%",
        width: "100%",
        playerVars,
        events: {
          onReady: () => {
            clearTimeout(readyTimeout);
            ytReady = true;
            try { ytPlayer.setVolume(volume); } catch (_) { /* ignore */ }
            emit("ready");
            resolve();
            runPending();
          },
          onStateChange: handleStateChange,
          onError: handleError,
          onAutoplayBlocked: signalAutoplayBlocked,
        },
      });
    });
  }

  /** Load the API and build the player. Safe to call more than once. */
  function init(initialQueue) {
    if (Array.isArray(initialQueue)) queue = initialQueue;
    if (initPromise) return initPromise;

    initPromise = loadYouTubeAPI()
      .then(createPlayer)
      .catch((err) => {
        initPromise = null;
        pending = null;
        console.error("Player init failed:", err);
        emit("buffering", { on: false });
        emit("apierror", { message: err.message });
        throw err;
      });
    return initPromise;
  }

  /** Try booting again after an "apierror" (used by the retry button). */
  function retry(thenStart = true) {
    if (thenStart) pending = "random";
    emit("buffering", { on: true });
    return init().catch(() => {});
  }

  /** If a previous boot attempt failed, any new user action quietly tries again. */
  function ensureBooting() {
    if (!initPromise) init().catch(() => {});
  }

  function runPending() {
    const action = pending;
    pending = null;
    if (action === "random") playRandom();
    else if (action === "current") loadCurrent(true);
  }

  // ---- 2. State handling — the ONE place YouTube states become UI events -------
  function handleStateChange(event) {
    const S = YT.PlayerState;
    switch (event.data) {
      case S.PLAYING:
        clearWatchdog();
        bufferRetried = false;
        consecutiveFailures = 0;
        emit("buffering", { on: false });
        emit("playstate", { playing: true });
        startProgressTimer();
        break;

      case S.PAUSED:
        clearWatchdog();
        stopProgressTimer();
        emit("buffering", { on: false });
        emit("playstate", { playing: false });
        reportProgress();
        break;

      case S.BUFFERING:
        emit("buffering", { on: true });
        break;

      case S.CUED:
        stopProgressTimer();
        emit("buffering", { on: false });
        emit("playstate", { playing: false });
        // We asked for autoplay but the video just sat there cued → browser said no.
        if (watchdogTimer) {
          clearWatchdog();
          watchdogTimer = setTimeout(onWatchdog, 1500);
        }
        break;

      case S.ENDED:
        stopProgressTimer();
        emit("playstate", { playing: false });
        next(); // auto-play the next song when one finishes
        break;

      default: // UNSTARTED (-1): nothing to do, the watchdog covers a stall
        break;
    }
  }

  // ---- 3. Errors ---------------------------------------------------------------
  // https://developers.google.com/youtube/iframe_api_reference#onError
  const YT_ERROR_MEANINGS = {
    2:   "Invalid video ID — the youtubeId in songs.js is malformed.",
    5:   "HTML5 player error — the video cannot be played in the HTML5 player.",
    100: "Video not found — it was removed or marked private.",
    101: "Embedding disabled — the owner does not allow playback on other sites.",
    150: "Embedding disabled — same restriction as 101.",
    153: "Missing referrer / origin — open the site through http(s), not file://.",
  };
  // These are problems with ONE video, so skipping to another song makes sense.
  const SKIPPABLE = new Set([2, 5, 100, 101, 150]);

  function handleError(event) {
    clearWatchdog();
    const song = currentSong();
    const code = event && typeof event.data !== "undefined" ? event.data : "unknown";
    const meaning = YT_ERROR_MEANINGS[code] || "Unrecognised error code — see the YouTube IFrame API docs.";
    const skipping = SKIPPABLE.has(code);

    console.error(
      "YouTube playback error:\n" +
      `Song: ${song ? song.title : "(unknown)"}\n` +
      `Video ID: ${song ? song.youtubeId : "(unknown)"}\n` +
      `Error code: ${code}\n` +
      `Meaning: ${meaning}`
    );

    if (song) failed.add(song.youtubeId);
    consecutiveFailures++;
    stopProgressTimer();
    emit("songerror", { song, code, meaning, skipping });

    if (skipping) {
      skipToNextPlayable();
    } else {
      // e.g. 153: a setup problem — skipping through the whole list can't fix it.
      emit("buffering", { on: false });
      emit("playstate", { playing: false });
    }
  }

  /** Move on after a failure, never landing on a song we already know is dead. */
  function skipToNextPlayable() {
    if (queue.length === 0 || consecutiveFailures >= queue.length) return giveUp();
    const idx = pickIndex(1);
    if (idx === -1) return giveUp();
    queueIndex = idx;
    loadCurrent(true);
  }

  function giveUp() {
    emit("buffering", { on: false });
    emit("playstate", { playing: false });
    emit("allfailed", {});
  }

  // ---- 4. Autoplay gate + start-up watchdog ------------------------------------
  function signalAutoplayBlocked() {
    clearWatchdog();
    emit("buffering", { on: false });
    emit("autoplayblocked", {});
  }

  function armWatchdog() {
    clearWatchdog();
    watchdogTimer = setTimeout(onWatchdog, START_WATCHDOG_MS);
  }
  function clearWatchdog() {
    if (watchdogTimer) clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
  function onWatchdog() {
    watchdogTimer = null;
    if (!ytReady) return;
    const S = YT.PlayerState;
    const state = ytPlayer.getPlayerState();

    if (state === S.PLAYING || state === S.PAUSED) return; // all fine (or the user paused)

    if (state === S.BUFFERING) {
      // Slow network: wait one more cycle, then give up on this song.
      if (!bufferRetried) { bufferRetried = true; armWatchdog(); return; }
      bufferRetried = false;
      const song = currentSong();
      if (song) failed.add(song.youtubeId);
      consecutiveFailures++;
      emit("songerror", { song, code: "timeout", meaning: "The song took too long to start.", skipping: true });
      skipToNextPlayable();
      return;
    }

    // UNSTARTED / CUED after we asked it to play → the browser blocked autoplay.
    signalAutoplayBlocked();
  }

  // ---- 5. Queue / song selection -----------------------------------------------
  function setQueue(newQueue, startIndex = 0) {
    queue = newQueue;
    queueIndex = Math.max(0, Math.min(startIndex, queue.length - 1));
  }

  function currentSong() {
    return queue[queueIndex] || null;
  }

  /** Index of the next/previous song, avoiding known-bad ones. -1 if none left. */
  function pickIndex(direction) {
    const n = queue.length;
    if (n === 0) return -1;

    // Every "next" is random — this is a radio-style shuffle-always player,
    // there's no sequential/ordered mode to opt in or out of.
    if (direction > 0 && n > 1) {
      const pool = [];
      for (let i = 0; i < n; i++) {
        if (i !== queueIndex && !failed.has(queue[i].youtubeId)) pool.push(i);
      }
      if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
    }
    for (let step = 1; step <= n; step++) {
      const i = (((queueIndex + direction * step) % n) + n) % n;
      if (!failed.has(queue[i].youtubeId)) return i;
    }
    return -1;
  }

  function loadCurrent(autoplay = true) {
    const song = currentSong();
    if (!song) return;

    // The UI always learns about the new song straight away...
    emit("songchange", { song, index: queueIndex, total: queue.length });

    // ...but if the player isn't ready yet, remember the request and run it on ready.
    if (!ytReady) {
      pending = "current";
      emit("buffering", { on: true });
      ensureBooting();
      return;
    }

    hasLoaded = true;
    bufferRetried = false;
    stopProgressTimer();
    emit("progress", { current: 0, duration: 0 });
    emit("buffering", { on: true });

    if (autoplay) {
      armWatchdog(); // arm first: state events may arrive before loadVideoById() returns
      ytPlayer.loadVideoById(song.youtubeId);
    } else {
      ytPlayer.cueVideoById(song.youtubeId);
    }
  }

  /** Play queue[index] because the user asked for it explicitly (retries dead songs too). */
  function playAt(list, index) {
    setQueue(list, index);
    const song = currentSong();
    if (song) failed.delete(song.youtubeId);
    consecutiveFailures = 0;
    loadCurrent(true);
  }

  function playRandom() {
    if (!queue.length) return;
    if (!ytReady) { pending = "random"; emit("buffering", { on: true }); ensureBooting(); return; }
    consecutiveFailures = 0;
    queueIndex = Math.floor(Math.random() * queue.length);
    loadCurrent(true);
  }

  /**
   * Call this from inside a click handler (the entry button). Doing the
   * loadVideoById() call synchronously in the gesture is what lets the
   * browser allow sound.
   */
  function start() {
    playRandom();
  }

  // ---- 6. Transport ------------------------------------------------------------
  function play() {
    if (!ytReady) { pending = pending || "random"; ensureBooting(); return; }
    if (!hasLoaded) { playRandom(); return; }
    ytPlayer.playVideo();
    armWatchdog();
  }

  function pause() {
    if (!ytReady) return;
    ytPlayer.pauseVideo();
  }

  function togglePlay() {
    if (!ytReady) { pending = pending || "random"; emit("buffering", { on: true }); ensureBooting(); return; }
    if (!hasLoaded) { playRandom(); return; }
    const S = YT.PlayerState;
    const state = ytPlayer.getPlayerState();
    if (state === S.PLAYING || state === S.BUFFERING) pause();
    else play();
  }

  function next() {
    if (queue.length === 0) return;
    let idx = pickIndex(1);
    if (idx === -1) idx = (queueIndex + 1) % queue.length; // everything failed: just try the neighbour
    queueIndex = idx;
    loadCurrent(true);
  }

  function prev() {
    if (queue.length === 0) return;
    let idx = pickIndex(-1);
    if (idx === -1) idx = (queueIndex - 1 + queue.length) % queue.length;
    queueIndex = idx;
    loadCurrent(true);
  }

  function seekTo(seconds) {
    if (!ytReady || !hasLoaded) return;
    ytPlayer.seekTo(seconds, true);
    setTimeout(reportProgress, 120); // update the bar even while paused
  }

  function setVolume(percent) {
    volume = Math.max(0, Math.min(100, Number(percent) || 0));
    if (ytReady) {
      try { ytPlayer.setVolume(volume); } catch (_) { /* ignore */ }
    }
    emit("volume", { percent: volume });
  }

  // ---- 7. Progress reporting -----------------------------------------------------
  function reportProgress() {
    if (!ytReady || !hasLoaded) return;
    const song = currentSong();
    if (!song) return;

    // Race guard: right after a song change YouTube can still report the
    // PREVIOUS video's time for a moment. Only accept data for the current one.
    try {
      if (typeof ytPlayer.getVideoData === "function") {
        const data = ytPlayer.getVideoData();
        if (data && data.video_id && data.video_id !== song.youtubeId) return;
      }
    } catch (_) { /* fall through */ }

    emit("progress", {
      current: ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() || 0 : 0,
      duration: ytPlayer.getDuration ? ytPlayer.getDuration() || 0 : 0,
    });
  }

  function startProgressTimer() {
    stopProgressTimer();
    reportProgress();
    progressTimer = setInterval(reportProgress, 500);
  }

  function stopProgressTimer() {
    if (progressTimer) clearInterval(progressTimer);
    progressTimer = null;
  }

  // ---- 8. Background duration probe -----------------------------------------------
  // Playlist rows show each song's length. YouTube only reveals a video's
  // length by loading it, so once music is already playing we quietly *cue*
  // (never play) each song in a second, muted, hidden player and read its
  // duration. app.js remembers the answers in localStorage. If a song can't be
  // probed (embedding disabled...) it is simply skipped. Set false to disable.
  const PROBE_DURATIONS = true;
  let probing = false;

  function probeDurations(youtubeIds) {
    if (!PROBE_DURATIONS || probing || !ytReady) return;
    const ids = [...new Set(youtubeIds)].filter(Boolean);
    const wrap = document.querySelector(".yt-wrap--probe");
    if (!ids.length || !wrap) return;

    let holder = document.getElementById("yt-probe");
    if (!holder) {                       // recreate after a previous destroy()
      holder = document.createElement("div");
      holder.id = "yt-probe";
      wrap.appendChild(holder);
    }

    probing = true;
    let probe = null;
    let i = 0;
    let poll = null;

    const finish = () => {
      clearInterval(poll);
      probing = false;
      try { probe && probe.destroy(); } catch (_) { /* ignore */ }
    };

    const nextId = () => {
      clearInterval(poll);
      if (i >= ids.length) { finish(); return; }
      const id = ids[i++];
      let tries = 0;
      try { probe.cueVideoById(id); } catch (_) { nextId(); return; }
      poll = setInterval(() => {
        tries++;
        let seconds = 0;
        try {
          // Only trust the answer once the probe really holds *this* video —
          // right after cueing, getDuration() can still describe the previous one.
          const data = typeof probe.getVideoData === "function" ? probe.getVideoData() : null;
          if (!data || !data.video_id || data.video_id === id) seconds = probe.getDuration();
        } catch (_) { /* keep waiting */ }
        if (seconds > 0) { emit("duration", { youtubeId: id, seconds }); nextId(); }
        else if (tries >= 16) nextId();   // ~4 s: give up on this one
      }, 250);
    };

    try {
      probe = new YT.Player("yt-probe", {
        height: "100%",
        width: "100%",
        playerVars: buildPlayerVars(),
        events: {
          onReady: (e) => {
            try { e.target.mute(); e.target.setVolume(0); } catch (_) { /* ignore */ }
            nextId();
          },
          onError: () => nextId(),        // removed / embedding disabled: move on
        },
      });
    } catch (err) {
      console.warn("Duration probe could not start:", err);
      probing = false;
    }
  }

  return {
    on,
    init,
    retry,
    start,
    setQueue,
    currentSong,
    loadCurrent,
    playAt,
    playRandom,
    play,
    pause,
    togglePlay,
    next,
    prev,

    seekTo,
    setVolume,
    isReady: () => ytReady,
    probeDurations,
  };
})();