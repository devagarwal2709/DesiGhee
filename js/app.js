/*
  app.js
  ------
  Wires the DOM up to Player (player.js) and songs/CATEGORIES (songs.js).
  This file does NOT talk to YouTube directly — it only calls Player.*
  and listens to Player.on(...) events.
*/

document.addEventListener("DOMContentLoaded", () => {
  // ---- DOM references -----------------------------------------------------
  const $ = (id) => document.getElementById(id);

  const enterOverlay  = $("enter-overlay");
  const enterBtn      = $("enter-btn");

  const dock          = $("player-dock");
  const nowTitle      = $("now-title");
  const nowArtist     = $("now-artist");
  const nowThumb      = $("now-thumb");
  const nowThumbImg   = $("now-thumb-img");
  const playPauseBtn  = $("play-pause-btn");
  const prevBtn       = $("prev-btn");
  const nextBtn       = $("next-btn");
  const seekBar       = $("seek-bar");
  const currentTimeEl = $("current-time");
  const durationEl    = $("duration-time");
  const volumeSlider  = $("volume-slider");
  const muteBtn       = $("mute-btn");
  const toast         = $("dock-toast");
  const toastText     = $("dock-toast-text");
  const toastBtn      = $("dock-toast-btn");

  const marqueeTrack  = $("marquee-track");
  const chipRow       = $("mood-chips");
  const moodGrid      = $("mood-grid");

  const ALL_LABEL     = "सारे";

  // Visual background positioning for the 3x2 mood cards
  const MOOD_ART = {
    all:     { size: "cover", pos: "50% 45%" },
    banger:  { size: "260% auto", pos: "13% 75%" },
    tractor: { size: "300% auto", pos: "52% 60%" },
    hukka:   { size: "260% auto", pos: "89% 88%" },
    byah:    { size: "300% auto", pos: "16% 11%" },
    akhada:  { size: "340% auto", pos: "62% 100%" },
  };

  let activeCategory = "all";
  let isSeeking = false;
  let toastTimer = null;
  let toastSticky = false;
  let activeSongId = null;

  // ---- Durations -------------------------------------------------------------
  const DURATION_KEY = "desi-ghee:durations";
  let learnedDurations = {};
  try { learnedDurations = JSON.parse(localStorage.getItem(DURATION_KEY)) || {}; } catch (_) {}

  function learnDuration(song, seconds) {
    if (!song || !(seconds > 0) || song.duration) return;
    const rounded = Math.round(seconds);
    if (learnedDurations[song.youtubeId] === rounded) return;
    learnedDurations[song.youtubeId] = rounded;
    try { localStorage.setItem(DURATION_KEY, JSON.stringify(learnedDurations)); } catch (_) {}
  }

  function learnDurationById(youtubeId, seconds) {
    learnDuration(songs.find((s) => s.youtubeId === youtubeId), seconds);
  }

  // ---- Helpers --------------------------------------------------------------
  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function thumbnailUrl(youtubeId) {
    return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  }

  function songsForCategory(catId) {
    return catId === "all" ? songs.slice() : songs.filter((s) => s.category === catId);
  }

  function paintRange(input) {
    const min = Number(input.min) || 0;
    const max = Number(input.max) || 0;
    const val = Number(input.value) || 0;
    const pct = max > min ? Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100)) : 0;
    input.style.setProperty("--fill", pct + "%");
  }

  // ---- Toast ----------------------------------------------------------------
  function showToast(message, { action = null, duration = 0 } = {}) {
    clearTimeout(toastTimer);
    toastSticky = !duration;
    toastText.textContent = message;
    if (action) {
      toastBtn.textContent = action.label;
      toastBtn.hidden = false;
      toastBtn.onclick = () => { hideToast(); action.onClick(); };
    } else {
      toastBtn.hidden = true;
      toastBtn.onclick = null;
    }
    toast.classList.add("is-visible");
    if (duration) toastTimer = setTimeout(hideToast, duration);
  }
  function hideToast() {
    clearTimeout(toastTimer);
    toast.classList.remove("is-visible");
  }

  // ---- Sync Layout with Dock Height -----------------------------------------
  function syncDockHeight() {
    const bottom = parseFloat(getComputedStyle(dock).bottom) || 0;
    const h = Math.ceil(dock.getBoundingClientRect().height + bottom);
    document.documentElement.style.setProperty("--dock-h", h + "px");
  }
  if ("ResizeObserver" in window) new ResizeObserver(syncDockHeight).observe(dock);
  window.addEventListener("resize", syncDockHeight);
  syncDockHeight();

  // ---- Whitelisted 6 Categories ---------------------------------------------
  function allCategories() {
    const allowed = [
      { id: "banger",  label: "बेंगर",        emoji: "🔥" },
      { id: "tractor", label: "ट्रैक्टर राइड", emoji: "🚜" },
      { id: "hukka",   label: "हुक्का बैठक",  emoji: "🪑" },
      { id: "byah",    label: "ब्याह-शादी",   emoji: "💍" },
      { id: "akhada",  label: "अखाड़ा",       emoji: "💪" }
    ];
    return [{ id: "all", label: ALL_LABEL, emoji: "🎵", hinglish: "ALL" }, ...allowed];
  }

  function renderChips() {
    chipRow.innerHTML = "";
    allCategories().forEach((cat) => {
      const btn = document.createElement("button");
      btn.className = "chip" + (cat.id === activeCategory ? " chip--active" : "");
      btn.type = "button";
      btn.innerHTML = `<span class="chip__emoji">${cat.emoji}</span><span class="chip__label">${cat.label}</span>`;
      btn.setAttribute("aria-pressed", cat.id === activeCategory ? "true" : "false");
      btn.addEventListener("click", () => selectCategory(cat.id));
      chipRow.appendChild(btn);
    });
  }

  // Change #4: Mood cards render cleanly without "15 गाने" / "जल्दी आ रहे हैं"
  function renderMoodCards() {
    moodGrid.innerHTML = "";
    allCategories().forEach((cat) => {
      const art = MOOD_ART[cat.id] || MOOD_ART.all;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "mood-card" + (cat.id === activeCategory ? " mood-card--active" : "");
      card.setAttribute("aria-pressed", cat.id === activeCategory ? "true" : "false");
      card.innerHTML = `
        <span class="mood-card__bg" style="--size:${art.size}; --pos:${art.pos}" aria-hidden="true"></span>
        <span class="mood-card__icon" aria-hidden="true">${cat.emoji}</span>
        <span class="mood-card__text">
          <span class="mood-card__label">${cat.label}</span>
        </span>`;
      card.addEventListener("click", () => selectCategory(cat.id));
      moodGrid.appendChild(card);
    });
  }

  // Instant Radio-Style Playback
  function selectCategory(catId) {
    activeCategory = catId;
    const list = songsForCategory(catId);
    renderChips();
    renderMoodCards();

    if (!list.length) {
      showToast("इस मूड के गाने जल्दी आ रहे हैं!", { duration: 3000 });
      return;
    }

    const randomIndex = Math.floor(Math.random() * list.length);
    Player.playAt(list, randomIndex);
  }

  // ---- Thumbnail Handler ----------------------------------------------------
  nowThumbImg.addEventListener("load",  () => nowThumb.classList.add("has-img"));
  nowThumbImg.addEventListener("error", () => nowThumb.classList.remove("has-img"));

  function setThumbnail(youtubeId) {
    nowThumb.classList.remove("has-img");
    nowThumbImg.src = thumbnailUrl(youtubeId);
  }

  // ---- Player Subscriptions -------------------------------------------------
  Player.on("songchange", ({ song }) => {
    if (!song) return;
    nowTitle.textContent = song.title;
    nowArtist.textContent = song.artist;
    setThumbnail(song.youtubeId);
    seekBar.value = 0;
    seekBar.max = 0;
    paintRange(seekBar);
    currentTimeEl.textContent = "0:00";
    durationEl.textContent = "0:00";
    activeSongId = song.id;
  });

  Player.on("playstate", ({ playing }) => {
    dock.classList.toggle("is-playing", playing);
    playPauseBtn.classList.toggle("is-playing", playing);
    playPauseBtn.setAttribute("aria-label", playing ? "गाना रोकें" : "गाना चलाएं");
    if (playing && toastSticky) hideToast();
  });

  Player.on("buffering", ({ on }) => {
    dock.classList.toggle("is-loading", on);
    dock.setAttribute("aria-busy", on ? "true" : "false");
  });

  Player.on("progress", ({ current, duration }) => {
    if (!isSeeking) {
      seekBar.max = duration || 0;
      seekBar.value = current || 0;
      paintRange(seekBar);
      currentTimeEl.textContent = formatTime(current);
    }
    durationEl.textContent = formatTime(duration);
    if (duration > 0 && activeSongId !== null) {
      learnDuration(songs.find((x) => x.id === activeSongId), duration);
    }
  });

  Player.on("duration", ({ youtubeId, seconds }) => learnDurationById(youtubeId, seconds));

  let probeScheduled = false;
  Player.on("playstate", ({ playing }) => {
    if (!playing || probeScheduled) return;
    probeScheduled = true;
    setTimeout(() => {
      const unknown = songs.filter((s) => !s.duration && !learnedDurations[s.youtubeId]).map((s) => s.youtubeId);
      if (unknown.length) Player.probeDurations(unknown);
    }, 2500);
  });

  Player.on("autoplayblocked", () => {
    showToast("ब्राउज़र ने गाना रोक दिया —", {
      action: { label: "▶ बैठ जा / गाना चलाओ", onClick: () => Player.togglePlay() },
    });
  });

  Player.on("songerror", ({ song, code, skipping }) => {
    const name = song ? `“${song.title}”` : "ये गाना";
    if (skipping) {
      showToast(`${name} नहीं चल पाया — अगला चला रहे हैं…`, { duration: 4500 });
    } else if (code === 153) {
      showToast("प्लेयर सेटअप में दिक्कत है — साइट को file:// की जगह http:// (Live Server) से खोलो।");
    } else {
      showToast(`${name} नहीं चल पाया।`, { duration: 4500 });
    }
  });

  Player.on("allfailed", () => {
    showToast("अभी इस लिस्ट का कोई गाना चल नहीं पा रहा — कोई दूसरा मूड आज़माओ।", { duration: 6000 });
  });

  Player.on("apierror", () => {
    showToast("प्लेयर लोड नहीं हो पाया — नेट चेक करो।", {
      action: { label: "दोबारा कोशिश", onClick: () => Player.retry(true) },
    });
  });

  // ---- Controls -------------------------------------------------------------
  playPauseBtn.addEventListener("click", () => Player.togglePlay());
  nextBtn.addEventListener("click", () => Player.next());
  prevBtn.addEventListener("click", () => Player.prev());

  seekBar.addEventListener("input", () => {
    isSeeking = true;
    paintRange(seekBar);
    currentTimeEl.textContent = formatTime(Number(seekBar.value));
  });
  seekBar.addEventListener("change", () => {
    Player.seekTo(Number(seekBar.value));
    isSeeking = false;
  });

  let lastVolume = Number(volumeSlider.value) || 70;
  function applyVolume(percent) {
    volumeSlider.value = percent;
    paintRange(volumeSlider);
    dock.classList.toggle("is-muted", percent === 0);
    Player.setVolume(percent);
  }
  volumeSlider.addEventListener("input", () => {
    const v = Number(volumeSlider.value);
    if (v > 0) lastVolume = v;
    applyVolume(v);
  });
  muteBtn.addEventListener("click", () => {
    const current = Number(volumeSlider.value);
    if (current > 0) { lastVolume = current; applyVolume(0); }
    else applyVolume(lastVolume || 70);
  });

  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (["INPUT", "TEXTAREA"].includes(tag)) return;
    if (e.code === "Space") {
      if (tag === "BUTTON" || tag === "A") return;
      e.preventDefault();
      Player.togglePlay();
    }
    if (e.code === "ArrowRight") Player.next();
    if (e.code === "ArrowLeft") Player.prev();
  });

  enterBtn.addEventListener("click", () => {
    enterOverlay.classList.add("is-leaving");
    setTimeout(() => enterOverlay.remove(), 900);
    Player.setQueue(songs.slice());
    Player.start();
  });

  // ---- Jugnu (Firefly) Field Effect ------------------------------------------
  function initJugnuEffect() {
    const canvas = $("jugnu-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    const particles = Array.from({ length: 18 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.8 + 1.2,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.6 + 0.2,
      fadeSpeed: (Math.random() * 0.01 + 0.006) * (Math.random() > 0.5 ? 1 : -1)
    }));

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += p.fadeSpeed;

        if (p.alpha <= 0.15 || p.alpha >= 0.85) p.fadeSpeed = -p.fadeSpeed;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(250, 204, 21, ${p.alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(245, 158, 11, 0.8)";
        ctx.fill();
        ctx.restore();
      });
      requestAnimationFrame(loop);
    }
    loop();
  }

  // ---- Ember & Smoke Effect (lanterns, diyas, chulha, hookah, tractor) -------
  // Unlike the free-floating jugnu fireflies above, every point here has to sit
  // exactly on a lantern/flame/pipe painted in hero-village.png, so this reads
  // the image's real object-position (which changes at the 640px breakpoint)
  // and maps image-space pixel coordinates to canvas pixels the same way
  // object-fit: cover does — then relies on #ember-canvas sharing the image's
  // own "scene-drift" CSS animation (see style.css) to stay glued to it.
  function initEmberEffect() {
    const canvas = $("ember-canvas");
    const scene  = $("scene");
    const img    = document.querySelector(".scene__bg");
    if (!canvas || !scene || !img || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");

    const IMG_W = 1673, IMG_H = 940; // natural size of hero-village.png

    // Every lantern/diya/chulha we could find in the artwork (image-space pixels).
    const FLAMES = [
      { x: 325, y: 195, r: 7 },  { x: 365, y: 165, r: 7 },     // tree lanterns
      { x: 438, y: 255, r: 7 },  { x: 500, y: 270, r: 7 },
      { x: 605, y: 310, r: 7 },
      { x: 185, y: 460, r: 6 },  { x: 225, y: 425, r: 6 },     // dhaba wall lanterns
      { x: 452, y: 468, r: 6 },
      { x: 565, y: 832, r: 8 },                                 // ground lantern by the khaat
      { x: 428, y: 662, r: 11 },                                // chulha fire — bigger, hotter
      { x: 1305, y: 447, r: 6 }, { x: 1370, y: 442, r: 6 },     // near hut door lamps
      { x: 1553, y: 452, r: 6 }, { x: 1636, y: 452, r: 6 },     // far hut door lamps
      { x: 1165, y: 441, r: 4 },                                // distant hut lamp — small & dim
    ].map((f, i) => ({
      ...f,
      u: f.x / IMG_W, v: f.y / IMG_H,
      speed: 1.6 + Math.random() * 1.3,
      speed2: 2.9 + Math.random() * 2.1,
      phase: Math.random() * Math.PI * 2,
      phase2: Math.random() * Math.PI * 2,
    }));

    // Smoke/steam sources — chulha, both hookahs, and a subtle tractor exhaust puff.
    const SMOKE_SOURCES = [
      { x: 400, y: 635, rate: 1.0,  drift: -0.15 },
      { x: 655, y: 608, rate: 0.7,  drift: 0.05 },
      { x: 1245, y: 615, rate: 0.7, drift: -0.05 },
      { x: 700, y: 428, rate: 0.25, drift: 0.2 },
    ].map((s) => ({ ...s, u: s.x / IMG_W, v: s.y / IMG_H, timer: Math.random() * 2 }));

    let smokeParticles = [];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let W = 0, H = 0, ox = 0, oy = 0, dw = 0, dh = 0, scale = 1;
    function layout() {
      W = canvas.clientWidth; H = canvas.clientHeight;
      if (!W || !H) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const s = Math.max(W / IMG_W, H / IMG_H);   // same math as object-fit: cover
      dw = IMG_W * s; dh = IMG_H * s;
      scale = s;

      // Read the *actual* object-position (it changes at the 640px breakpoint,
      // and swaps to a differently-cropped image below it too).
      const pos = getComputedStyle(img).objectPosition.split(" ");
      const px = parseFloat(pos[0]) / 100, py = parseFloat(pos[1]) / 100;
      ox = (W - dw) * (isFinite(px) ? px : 0.5);
      oy = (H - dh) * (isFinite(py) ? py : 0.5);
    }

    function spawnSmoke(src, t) {
      smokeParticles.push({
        x: ox + src.u * dw, y: oy + src.v * dh,
        born: t, life: 4.5 + Math.random() * 2.5,
        drift: src.drift + (Math.random() - 0.5) * 0.15,
        sway: 0.4 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        size: (5 + Math.random() * 4) * scale,
        riseSpeed: (10 + Math.random() * 6) * scale,
      });
    }

    function draw(t, still) {
      if (!W || !H) return;
      ctx.clearRect(0, 0, W, H);

      // ---- flame flicker: warm additive glow, two out-of-phase sine waves
      //      (not one) so it reads as irregular candle-flicker, not a clean pulse ----
      ctx.globalCompositeOperation = "lighter";
      FLAMES.forEach((f) => {
        const x = ox + f.u * dw, y = oy + f.v * dh;
        if (x < -20 || y < -20 || x > W + 20 || y > H + 20) return;
        let flick = still ? 0.7
          : 0.55 + 0.28 * Math.sin(t * f.speed + f.phase) + 0.17 * Math.sin(t * f.speed2 + f.phase2);
        flick = Math.max(0.25, Math.min(1, flick));
        const r = f.r * scale * 4.2 * flick;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0.00, `rgba(255, 236, 180, ${0.55 * flick})`);
        grad.addColorStop(0.30, `rgba(250, 180, 60, ${0.4 * flick})`);
        grad.addColorStop(1.00, "rgba(234, 88, 12, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });

      // ---- smoke: soft grey wisps, normal blending, rise + sway + fade ----
      ctx.globalCompositeOperation = "source-over";
      smokeParticles.forEach((p) => {
        const age = t - p.born;
        const life = age / p.life;
        if (life >= 1) return;
        const y = p.y - age * p.riseSpeed;
        const x = p.x + Math.sin(age * p.sway + p.phase) * 8 * scale + age * p.drift * 10 * scale;
        const alpha = (life < 0.15 ? life / 0.15 : 1 - (life - 0.15) / 0.85) * 0.22;
        const r = p.size * (1 + life * 1.8);
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(210, 205, 195, ${alpha})`);
        grad.addColorStop(1, "rgba(210, 205, 195, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    let time = 0, last = 0, rafId = 0, heroVisible = true;
    function frame(now) {
      const dt = Math.min(0.1, (now - last) / 1000 || 0);
      last = now;
      time += dt;

      SMOKE_SOURCES.forEach((src) => {
        src.timer -= dt;
        if (src.timer <= 0) {
          spawnSmoke(src, time);
          src.timer = (1.6 + Math.random() * 1.4) / src.rate;
        }
      });
      smokeParticles = smokeParticles.filter((p) => time - p.born < p.life);
      if (smokeParticles.length > 60) smokeParticles.splice(0, smokeParticles.length - 60);

      draw(time, false);
      rafId = requestAnimationFrame(frame);
    }
    function update() {
      const shouldRun = heroVisible && !document.hidden && !reduceMotion.matches;
      if (shouldRun && !rafId) { last = performance.now(); rafId = requestAnimationFrame(frame); }
      if (!shouldRun && rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      if (reduceMotion.matches) { layout(); draw(1, true); }   // one calm still frame
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => { heroVisible = entries[0].isIntersecting; update(); }).observe(scene);
    }
    document.addEventListener("visibilitychange", update);
    if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", update);
    if ("ResizeObserver" in window) new ResizeObserver(layout).observe(canvas);
    window.addEventListener("resize", layout);

    layout();
    update();
  }

  // ---- Boot ------------------------------------------------------------------
  applyVolume(Number(volumeSlider.value));
  paintRange(seekBar);
  Player.setQueue(songs.slice());
  Player.init(songs.slice()).catch(() => {});

  if (marqueeTrack) marqueeTrack.innerHTML += marqueeTrack.innerHTML;

  renderChips();
  renderMoodCards();
  initJugnuEffect();
  initEmberEffect();
});