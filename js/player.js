/*
  player.js — Unified YouTube + SoundCloud Engine
  -----------------------------------------------
*/

const Player = (() => {
  const API_TIMEOUT_MS    = 12000;
  const START_WATCHDOG_MS = 8000;

  let queue = [];
  let queueIndex = 0;
  let volume = 70;
  let activeSource = null;

  let hasLoaded = false;
  let pending = null;
  let progressTimer = null;
  let watchdogTimer = null;
  let bufferRetried = false;

  const failed = new Set();
  let consecutiveFailures = 0;
  const listeners = {};

  function on(eventName, cb) {
    (listeners[eventName] = listeners[eventName] || []).push(cb);
  }
  function emit(eventName, payload) {
    (listeners[eventName] || []).forEach((cb) => {
      try { cb(payload); } catch (err) { console.error(`Player listener "${eventName}" error:`, err); }
    });
  }

  function songKey(song) {
    if (!song) return "";
    return song.source === "soundcloud" ? `sc:${song.soundcloudUrl}` : `yt:${song.youtubeId}`;
  }

  // =========================================================================
  // 1. YouTube Engine
  // =========================================================================
  let ytPlayer = null;
  let ytReady = false;
  let apiPromise = null;
  let initPromise = null;

  function loadYouTubeAPI() {
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) { resolve(); return; }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === "function") prev();
        resolve();
      };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.onerror = () => reject(new Error("YouTube API failed to load"));
      document.head.appendChild(tag);
      setTimeout(() => reject(new Error("YouTube API load timeout")), API_TIMEOUT_MS);
    }).catch((err) => {
      apiPromise = null;
      throw err;
    });
    return apiPromise;
  }

  function createYouTubePlayer() {
    return new Promise((resolve, reject) => {
      const readyTimeout = setTimeout(() => reject(new Error("YouTube player ready timeout")), API_TIMEOUT_MS);
      const vars = {
        playsinline: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        iv_load_policy: 3,
      };
      if (/^https?:$/.test(window.location.protocol)) {
        vars.origin = window.location.origin;
      }
      ytPlayer = new YT.Player("yt-player", {
        height: "100%",
        width: "100%",
        playerVars: vars,
        events: {
          onReady: () => {
            clearTimeout(readyTimeout);
            ytReady = true;
            try { ytPlayer.setVolume(volume); } catch (_) {}
            emit("ready");
            resolve();
            runPending();
          },
          onStateChange: handleYtStateChange,
          onError: handleYtError,
          onAutoplayBlocked: signalAutoplayBlocked,
        },
      });
    });
  }

  function handleYtStateChange(event) {
    if (activeSource !== "youtube") return;
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
        if (watchdogTimer) {
          clearWatchdog();
          watchdogTimer = setTimeout(onWatchdog, 1500);
        }
        break;
      case S.ENDED:
        stopProgressTimer();
        emit("playstate", { playing: false });
        next();
        break;
    }
  }

  const YT_ERROR_MEANINGS = {
    2: "Invalid video ID",
    5: "HTML5 error",
    100: "Not found/private",
    101: "Embed disabled by uploader",
    150: "Embed blocked by label",
    153: "File:// origin restriction",
  };
  const SKIPPABLE = new Set([2, 5, 100, 101, 150]);

  function handleYtError(event) {
    if (activeSource !== "youtube") return;
    clearWatchdog();
    const song = currentSong();
    const code = event && typeof event.data !== "undefined" ? event.data : "unknown";
    const meaning = YT_ERROR_MEANINGS[code] || "Playback failed";
    const skipping = SKIPPABLE.has(code);

    if (song) failed.add(songKey(song));
    consecutiveFailures++;
    stopProgressTimer();
    emit("songerror", { song, code, meaning, skipping });

    if (skipping) skipToNextPlayable();
    else {
      emit("buffering", { on: false });
      emit("playstate", { playing: false });
    }
  }

  // =========================================================================
  // 2. SoundCloud Engine
  // =========================================================================
  let scWidget = null;
  let scReady = false;
  let scInitPromise = null;
  let scIsPlaying = false;
  let scApiPromise = null;

  function loadSoundCloudAPI() {
    if (scApiPromise) return scApiPromise;
    scApiPromise = new Promise((resolve, reject) => {
      if (window.SC && window.SC.Widget) { resolve(); return; }
      const tag = document.createElement("script");
      tag.src = "https://w.soundcloud.com/player/api.js";
      tag.async = true;
      tag.onerror = () => reject(new Error("SoundCloud Widget API failed to load"));
      tag.onload = () => resolve();
      document.head.appendChild(tag);
      setTimeout(() => reject(new Error("SoundCloud API load timeout")), API_TIMEOUT_MS);
    }).catch((err) => {
      scApiPromise = null;
      throw err;
    });
    return scApiPromise;
  }

  function ensureSoundCloudReady(trackUrl) {
    if (scReady) return Promise.resolve();
    if (scInitPromise) return scInitPromise;

    scInitPromise = loadSoundCloudAPI().then(() => new Promise((resolve) => {
      const iframe = document.getElementById("sc-player");
      iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(trackUrl)}&auto_play=false&visual=false`;
      scWidget = SC.Widget(iframe);

      scWidget.bind(SC.Widget.Events.READY, () => {
        scReady = true;
        try { scWidget.setVolume(volume); } catch (_) {}

        scWidget.bind(SC.Widget.Events.PLAY, () => {
          if (activeSource !== "soundcloud") return;
          clearWatchdog();
          bufferRetried = false;
          consecutiveFailures = 0;
          scIsPlaying = true;
          emit("buffering", { on: false });
          emit("playstate", { playing: true });
          startProgressTimer();
        });

        scWidget.bind(SC.Widget.Events.PAUSE, () => {
          if (activeSource !== "soundcloud") return;
          clearWatchdog();
          scIsPlaying = false;
          stopProgressTimer();
          emit("buffering", { on: false });
          emit("playstate", { playing: false });
          reportProgress();
        });

        scWidget.bind(SC.Widget.Events.FINISH, () => {
          if (activeSource !== "soundcloud") return;
          stopProgressTimer();
          emit("playstate", { playing: false });
          next();
        });

        scWidget.bind(SC.Widget.Events.ERROR, () => {
          if (activeSource !== "soundcloud") return;
          clearWatchdog();
          const song = currentSong();
          if (song) failed.add(songKey(song));
          consecutiveFailures++;
          stopProgressTimer();
          emit("songerror", { song, code: "sc_error", meaning: "SoundCloud stream unavailable", skipping: true });
          skipToNextPlayable();
        });

        resolve();
      });
    })).catch((err) => {
      scInitPromise = null;
      console.warn("SoundCloud initialization error:", err);
      emit("apierror", { message: err.message });
    });

    return scInitPromise;
  }

  // =========================================================================
  // 3. Watchdog & Recovery
  // =========================================================================
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
    const song = currentSong();
    if (!song) return;

    if (activeSource === "youtube") {
      if (!ytReady) return;
      const state = ytPlayer.getPlayerState();
      if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.PAUSED) return;
      if (state === YT.PlayerState.BUFFERING) {
        if (!bufferRetried) { bufferRetried = true; armWatchdog(); return; }
        bufferRetried = false;
        failed.add(songKey(song));
        consecutiveFailures++;
        emit("songerror", { song, code: "timeout", meaning: "Song took too long to start", skipping: true });
        skipToNextPlayable();
        return;
      }
      signalAutoplayBlocked();
    } else if (activeSource === "soundcloud") {
      if (scIsPlaying) return;
      signalAutoplayBlocked();
    }
  }

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

  // =========================================================================
  // 4. Queue & Playback Handoff
  // =========================================================================
  function setQueue(newQueue, startIndex = 0) {
    queue = newQueue;
    queueIndex = Math.max(0, Math.min(startIndex, queue.length - 1));
  }

  function currentSong() {
    return queue[queueIndex] || null;
  }

  function pickIndex(direction) {
    const n = queue.length;
    if (n === 0) return -1;
    if (direction > 0 && n > 1) {
      const pool = [];
      for (let i = 0; i < n; i++) {
        if (i !== queueIndex && !failed.has(songKey(queue[i]))) pool.push(i);
      }
      if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
    }
    for (let step = 1; step <= n; step++) {
      const i = (((queueIndex + direction * step) % n) + n) % n;
      if (!failed.has(songKey(queue[i]))) return i;
    }
    return -1;
  }

  function loadCurrent(autoplay = true) {
    const song = currentSong();
    if (!song) return;

    const nextSource = song.source === "soundcloud" ? "soundcloud" : "youtube";

    // Stop whichever engine was previously running
    if (activeSource && activeSource !== nextSource) {
      if (activeSource === "youtube" && ytReady) {
        try { ytPlayer.pauseVideo(); } catch (_) {}
      }
      if (activeSource === "soundcloud" && scReady && scWidget) {
        try { scWidget.pause(); } catch (_) {}
      }
    }
    activeSource = nextSource;

    emit("songchange", { song, index: queueIndex, total: queue.length });

    hasLoaded = true;
    bufferRetried = false;
    stopProgressTimer();
    emit("progress", { current: 0, duration: 0 });
    emit("buffering", { on: true });

    if (activeSource === "soundcloud") {
      armWatchdog();
      ensureSoundCloudReady(song.soundcloudUrl).then(() => {
        if (!scWidget) return;
        scWidget.load(song.soundcloudUrl, {
          auto_play: autoplay,
          callback: () => {
            try { scWidget.setVolume(volume); } catch (_) {}
            if (autoplay) scWidget.play();
          },
        });
      });
    } else {
      if (!ytReady) {
        pending = "current";
        ensureBooting();
        return;
      }
      armWatchdog();
      if (autoplay) ytPlayer.loadVideoById(song.youtubeId);
      else ytPlayer.cueVideoById(song.youtubeId);
    }
  }

  function runPending() {
    const action = pending;
    pending = null;
    if (action === "random") playRandom();
    else if (action === "current") loadCurrent(true);
  }

  function playAt(list, index) {
    setQueue(list, index);
    const song = currentSong();
    if (song) failed.delete(songKey(song));
    consecutiveFailures = 0;
    loadCurrent(true);
  }

  function playRandom() {
    if (!queue.length) return;
    consecutiveFailures = 0;
    queueIndex = Math.floor(Math.random() * queue.length);
    loadCurrent(true);
  }

  function start() {
    playRandom();
  }

  function play() {
    armWatchdog();
    if (activeSource === "soundcloud") {
      if (scWidget) scWidget.play();
    } else {
      if (!ytReady) { pending = "random"; ensureBooting(); return; }
      if (!hasLoaded) { playRandom(); return; }
      ytPlayer.playVideo();
    }
  }

  function pause() {
    clearWatchdog();
    if (activeSource === "soundcloud") {
      if (scWidget) scWidget.pause();
    } else {
      if (ytReady) ytPlayer.pauseVideo();
    }
  }

  function togglePlay() {
    if (activeSource === "soundcloud") {
      if (!scWidget) return;
      if (scIsPlaying) pause(); else play();
    } else {
      if (!ytReady) { pending = "random"; emit("buffering", { on: true }); ensureBooting(); return; }
      if (!hasLoaded) { playRandom(); return; }
      const s = ytPlayer.getPlayerState();
      if (s === YT.PlayerState.PLAYING || s === YT.PlayerState.BUFFERING) pause();
      else play();
    }
  }

  function next() {
    if (queue.length === 0) return;
    const idx = pickIndex(1);
    queueIndex = idx === -1 ? (queueIndex + 1) % queue.length : idx;
    loadCurrent(true);
  }

  function prev() {
    if (queue.length === 0) return;
    let idx = pickIndex(-1);
    queueIndex = idx === -1 ? (queueIndex - 1 + queue.length) % queue.length : idx;
    loadCurrent(true);
  }

  function seekTo(seconds) {
    if (activeSource === "soundcloud") {
      if (scReady && scWidget) {
        scWidget.seekTo(seconds * 1000);
        setTimeout(reportProgress, 120);
      }
    } else {
      if (ytReady && hasLoaded) {
        ytPlayer.seekTo(seconds, true);
        setTimeout(reportProgress, 120);
      }
    }
  }

  function setVolume(percent) {
    volume = Math.max(0, Math.min(100, Number(percent) || 0));
    if (ytReady && ytPlayer && ytPlayer.setVolume) {
      try { ytPlayer.setVolume(volume); } catch (_) {}
    }
    if (scReady && scWidget && scWidget.setVolume) {
      try { scWidget.setVolume(volume); } catch (_) {}
    }
    emit("volume", { percent: volume });
  }

  function reportProgress() {
    const song = currentSong();
    if (!song) return;

    if (activeSource === "soundcloud") {
      if (!scWidget || !scReady) return;
      scWidget.getPosition((posMs) => {
        scWidget.getDuration((durMs) => {
          const current = (posMs || 0) / 1000;
          const duration = (durMs || 0) / 1000;
          emit("progress", { current, duration });
          if (duration > 0) emit("duration", { youtubeId: songKey(song), seconds: duration });
        });
      });
    } else {
      if (!ytReady || !hasLoaded) return;
      try {
        if (typeof ytPlayer.getVideoData === "function") {
          const data = ytPlayer.getVideoData();
          if (data && data.video_id && data.video_id !== song.youtubeId) return;
        }
      } catch (_) {}
      const current = ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() || 0 : 0;
      const duration = ytPlayer.getDuration ? ytPlayer.getDuration() || 0 : 0;
      emit("progress", { current, duration });
    }
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

  function init(initialQueue) {
    if (Array.isArray(initialQueue)) queue = initialQueue;
    if (initPromise) return initPromise;
    initPromise = loadYouTubeAPI()
      .then(createYouTubePlayer)
      .catch((err) => {
        initPromise = null;
        pending = null;
        console.error("Player init error:", err);
        emit("buffering", { on: false });
        emit("apierror", { message: err.message });
        throw err;
      });
    return initPromise;
  }

  function retry(thenStart = true) {
    if (thenStart) pending = "random";
    emit("buffering", { on: true });
    return init().catch(() => {});
  }

  function ensureBooting() {
    if (!initPromise) init().catch(() => {});
  }

  // Background probe for YouTube songs
  function probeDurations(youtubeIds) {
    const ids = [...new Set(youtubeIds)].filter(Boolean);
    const wrap = document.querySelector(".yt-wrap--probe");
    if (!ids.length || !wrap || !ytReady) return;
    let holder = document.getElementById("yt-probe");
    if (!holder) {
      holder = document.createElement("div");
      holder.id = "yt-probe";
      wrap.appendChild(holder);
    }
    let i = 0;
    let poll = null;
    let probe = null;

    const finish = () => {
      clearInterval(poll);
      try { probe && probe.destroy(); } catch (_) {}
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
          const data = typeof probe.getVideoData === "function" ? probe.getVideoData() : null;
          if (!data || !data.video_id || data.video_id === id) seconds = probe.getDuration();
        } catch (_) {}
        if (seconds > 0) { emit("duration", { youtubeId: id, seconds }); nextId(); }
        else if (tries >= 16) nextId();
      }, 250);
    };

    try {
      probe = new YT.Player("yt-probe", {
        height: "100%",
        width: "100%",
        playerVars: { playsinline: 1, controls: 0, disablekb: 1 },
        events: {
          onReady: (e) => {
            try { e.target.mute(); e.target.setVolume(0); } catch (_) {}
            nextId();
          },
          onError: () => nextId(),
        },
      });
    } catch (_) {}
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