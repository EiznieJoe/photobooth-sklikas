/* Photobooth Majlis Apresiasi Cemerlang Tahun 6 SK Likas 2026
   Plain JS, tiada build step. */
(function () {
  "use strict";

  const CFG = Object.assign({
    UPLOAD_URL: "", UPLOAD_KEY: "", FILE_PREFIX: "SKLikas2026", OUTPUT_SCALE: 1.5, JPEG_QUALITY: 0.9
  }, window.APP_CONFIG || {});

  // Ukuran frame & kedudukan tingkap foto (piksel dalam fail frame asal)
  const FRAMES = {
    potret:   { w: 941,  h: 1672, x: 90, y: 381, ww: 760,  wh: 1087 },
    landskap: { w: 1448, h: 1086, x: 94, y: 301, ww: 1260, wh: 691 }
  };
  const THEME_COLOR = { ungu: "#2a0f5c", biru: "#0b2356" };
  const ZMAX = 1000;          // julat slider
  const ZOOM_IN_MAX = 3;      // boleh zum sehingga 3x "penuh tingkap"

  const $ = (id) => document.getElementById(id);
  const ua = navigator.userAgent;
  const IS_IOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const IS_STANDALONE = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

  const state = {
    color: "ungu",
    orient: "potret",
    facing: "user",
    stream: null,
    deviceId: null,
    source: "camera",     // "camera" | "image"
    img: null,
    mirror: true,
    zoom: 500,
    busy: false,
    raf: 0,
    lastBlob: null,
    lastId: null
  };

  // ---------------------------------------------------------------- util
  function store(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function recall(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  const imgCache = {};
  function loadImage(src) {
    if (!imgCache[src]) {
      imgCache[src] = new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = src;
      });
    }
    return imgCache[src];
  }
  const frameSrc = (c, o) => `frames/${c}_${o}.webp`;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pad = (n) => String(n).padStart(2, "0");

  function showScreen(name) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === "screen-" + name));
  }

  // ---------------------------------------------------------------- tema
  function applyTheme(color) {
    state.color = color === "biru" ? "biru" : "ungu";
    document.documentElement.dataset.theme = state.color;
    document.querySelector('meta[name="theme-color"]').setAttribute("content", THEME_COLOR[state.color]);
    document.querySelectorAll(".seg-btn").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.color === state.color)));
    $("thumb-potret").src = frameSrc(state.color, "potret");
    $("thumb-landskap").src = frameSrc(state.color, "landskap");
    store("skl_color", state.color);
    // preload frame lain
    loadImage(frameSrc(state.color, "potret")); loadImage(frameSrc(state.color, "landskap"));
  }

  // ---------------------------------------------------------------- lukisan
  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = 48; blurCanvas.height = 48;
  const blurCtx = blurCanvas.getContext("2d");

  function scales(sw, sh, win) {
    const contain = Math.min(win.w / sw, win.h / sh);
    const cover = Math.max(win.w / sw, win.h / sh);
    const max = cover * ZOOM_IN_MAX;
    return { contain, cover, max };
  }
  function scaleFromSlider(t, s) {
    return s.contain * Math.pow(s.max / s.contain, t / ZMAX);
  }
  function sliderForCover(sw, sh, meta) {
    const s = scales(sw, sh, { w: meta.ww, h: meta.wh });
    if (s.max <= s.contain) return 0;
    return Math.round(ZMAX * Math.log(s.cover / s.contain) / Math.log(s.max / s.contain));
  }

  function sourceSize() {
    if (state.source === "image" && state.img) return [state.img.naturalWidth || state.img.width, state.img.naturalHeight || state.img.height];
    const v = $("video");
    return [v.videoWidth, v.videoHeight];
  }
  function sourceEl() { return state.source === "image" ? state.img : $("video"); }

  // Satu fungsi lukis untuk preview DAN gambar akhir -> hasil sama persis.
  function drawComposite(ctx, W, H, frameImg) {
    const meta = FRAMES[state.orient];
    const k = W / meta.w;
    const win = { x: meta.x * k, y: meta.y * k, w: meta.ww * k, h: meta.wh * k };
    const [sw, sh] = sourceSize();
    const src = sourceEl();

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    if (src && sw && sh) {
      const sc = scales(sw, sh, win);
      const s = scaleFromSlider(state.zoom, sc);
      const dw = sw * s, dh = sh * s;
      const dx = win.x + (win.w - dw) / 2, dy = win.y + (win.h - dh) / 2;

      ctx.beginPath();
      ctx.rect(win.x, win.y, win.w, win.h);
      ctx.clip();
      if (state.mirror) {
        ctx.translate(win.x + win.w / 2, 0); ctx.scale(-1, 1); ctx.translate(-(win.x + win.w / 2), 0);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Ruang kosong? Isi dengan salinan kabur (cara kecil-besarkan: jalan di semua pelayar)
      if (dw < win.w - 0.5 || dh < win.h - 0.5) {
        const bw = 40, bh = Math.max(8, Math.round(40 * win.h / win.w));
        if (blurCanvas.width !== bw || blurCanvas.height !== bh) { blurCanvas.width = bw; blurCanvas.height = bh; }
        const cs = Math.max(bw / sw, bh / sh);
        blurCtx.imageSmoothingEnabled = true;
        blurCtx.drawImage(src, (bw - sw * cs) / 2, (bh - sh * cs) / 2, sw * cs, sh * cs);
        ctx.drawImage(blurCanvas, win.x - win.w * 0.05, win.y - win.h * 0.05, win.w * 1.1, win.h * 1.1);
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(win.x, win.y, win.w, win.h);
      }
      ctx.drawImage(src, dx, dy, dw, dh);
    }
    ctx.restore();
    if (frameImg) ctx.drawImage(frameImg, 0, 0, W, H);
  }

  // ---------------------------------------------------------------- preview
  const preview = $("preview");
  const pctx = preview.getContext("2d");
  let currentFrame = null;

  function fitPreview() {
    const meta = FRAMES[state.orient];
    const st = $("stage");
    const availW = st.clientWidth - 20, availH = st.clientHeight - 8;
    if (availW <= 0 || availH <= 0) return;
    const ar = meta.w / meta.h;
    let w = availW, h = w / ar;
    if (h > availH) { h = availH; w = h * ar; }
    preview.style.width = Math.floor(w) + "px";
    preview.style.height = Math.floor(h) + "px";
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pw = Math.min(meta.w, Math.round(w * dpr));
    preview.width = pw;
    preview.height = Math.round(pw / ar);
  }

  function loop() {
    drawComposite(pctx, preview.width, preview.height, currentFrame);
    state.raf = requestAnimationFrame(loop);
  }
  function startLoop() { cancelAnimationFrame(state.raf); state.raf = requestAnimationFrame(loop); }
  function stopLoop() { cancelAnimationFrame(state.raf); state.raf = 0; }

  function resetZoom() {
    const [sw, sh] = sourceSize();
    if (!sw || !sh) return;
    state.zoom = sliderForCover(sw, sh, FRAMES[state.orient]);
    $("zoom").value = state.zoom;
  }

  // ---------------------------------------------------------------- kamera
  function camMsg(text) {
    const m = $("cam-msg");
    if (text) { m.textContent = text; m.hidden = false; } else { m.hidden = true; }
  }
  function stopStream() {
    if (state.stream) state.stream.getTracks().forEach((t) => t.stop());
    state.stream = null;
  }

  async function startCamera(opts) {
    opts = opts || {};
    stopStream();
    camMsg("");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      camMsg("Pelayar ini tidak menyokong kamera. Guna butang Galeri untuk pilih gambar.");
      return;
    }
    // Minta gambar asli 4:3. TIDAK paksa bentuk tinggi (elak gambar nampak terzum).
    const video = { width: { ideal: 1920 }, height: { ideal: 1440 } };
    if (opts.deviceId) video.deviceId = { exact: opts.deviceId };
    else video.facingMode = { ideal: state.facing };
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video });
    } catch (err) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: opts.deviceId ? { deviceId: { exact: opts.deviceId } } : { facingMode: state.facing } });
      } catch (err2) {
        const n = (err2 && err2.name) || "";
        if (n === "NotAllowedError" || n === "SecurityError") camMsg("Akses kamera ditolak. Benarkan kamera dalam tetapan pelayar, kemudian buka semula. Atau guna butang Galeri.");
        else if (n === "NotFoundError" || n === "OverconstrainedError") camMsg("Kamera tidak dijumpai. Guna butang Galeri untuk pilih gambar.");
        else camMsg("Kamera tidak dapat dibuka. Cuba tutup app lain yang guna kamera, atau guna butang Galeri.");
        return;
      }
    }
    state.stream = stream;
    const track = stream.getVideoTracks()[0];
    const set = (track && track.getSettings) ? track.getSettings() : {};
    state.deviceId = set.deviceId || null;
    const facing = set.facingMode || state.facing;
    state.mirror = facing !== "environment";
    const v = $("video");
    v.srcObject = stream;
    try { await v.play(); } catch (e) {}
    if (!v.videoWidth) await new Promise((r) => v.addEventListener("loadedmetadata", r, { once: true }));
    resetZoom();
    updateSwitchButton();
  }

  async function updateSwitchButton() {
    let count = 2;
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      count = devs.filter((d) => d.kind === "videoinput").length;
    } catch (e) {}
    $("btn-switch").disabled = state.source !== "camera" || count < 2;
  }

  async function switchCamera() {
    if (state.source !== "camera") return;
    const before = state.deviceId;
    state.facing = state.facing === "user" ? "environment" : "user";
    await startCamera();
    // Desktop: facingMode tak berubah apa-apa -> pusing ikut senarai kamera
    if (before && state.deviceId === before) {
      try {
        const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
        if (cams.length > 1) {
          const i = cams.findIndex((c) => c.deviceId === before);
          await startCamera({ deviceId: cams[(i + 1) % cams.length].deviceId });
        }
      } catch (e) {}
    }
  }

  async function openCamera(orient) {
    state.orient = orient;
    state.source = "camera";
    state.img = null;
    $("cam-title").textContent = orient === "potret" ? "Potret" : "Landskap";
    $("btn-use-camera").hidden = true;
    showScreen("camera");
    currentFrame = null;
    loadImage(frameSrc(state.color, orient)).then((im) => { currentFrame = im; });
    fitPreview();
    startLoop();
    await startCamera();
  }

  function closeCamera() {
    stopLoop();
    stopStream();
    showScreen("home");
    refreshQueueInfo();
  }

  // ---------------------------------------------------------------- galeri
  function pickFromGallery() { $("file-input").value = ""; $("file-input").click(); }
  async function onFilePicked(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const im = new Image();
    im.src = url;
    try { await im.decode(); } catch (err) {
      await new Promise((r, j) => { im.onload = r; im.onerror = j; }).catch(() => null);
    }
    if (!im.naturalWidth) { camMsg("Gambar ini tidak dapat dibuka. Cuba gambar lain."); return; }
    stopStream();
    camMsg("");
    state.source = "image";
    state.img = im;
    state.mirror = false;
    $("btn-use-camera").hidden = false;
    $("btn-switch").disabled = true;
    resetZoom();
  }
  async function backToCamera() {
    state.source = "camera"; state.img = null;
    $("btn-use-camera").hidden = true;
    await startCamera();
  }

  // ---------------------------------------------------------------- ambil gambar
  async function countdown() {
    const el = $("countdown");
    el.hidden = false;
    for (let n = 3; n >= 1; n--) {
      el.textContent = n;
      el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
      await sleep(1000);
    }
    el.hidden = true;
  }
  function flash() {
    const f = $("flash");
    f.classList.remove("go"); void f.offsetWidth; f.classList.add("go");
  }

  function makeFileName(d) {
    const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    return `${CFG.FILE_PREFIX}_${state.color}_${state.orient}_${date}_${time}.jpg`;
  }
  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  async function takePhoto() {
    if (state.busy) return;
    const [sw, sh] = sourceSize();
    if (!sw || !sh) return;
    state.busy = true;
    $("btn-shutter").disabled = true;
    try {
      if (state.source === "camera") await countdown();
      flash();
      const meta = FRAMES[state.orient];
      const frameImg = await loadImage(frameSrc(state.color, state.orient));
      const scale = Math.max(0.5, Math.min(3, Number(CFG.OUTPUT_SCALE) || 1));
      const out = document.createElement("canvas");
      out.width = Math.round(meta.w * scale);
      out.height = Math.round(meta.h * scale);
      drawComposite(out.getContext("2d"), out.width, out.height, frameImg);
      const blob = await new Promise((r) => out.toBlob(r, "image/jpeg", Number(CFG.JPEG_QUALITY) || 0.9));
      if (!blob) throw new Error("toBlob gagal");
      const item = { id: newId(), name: makeFileName(new Date()), blob, created: Date.now() };
      state.lastBlob = blob; state.lastId = item.id; state.lastName = item.name;
      stopLoop();
      stopStream();
      showResult(item);
      await queueAdd(item);
      processQueue();
    } catch (err) {
      console.error(err);
      camMsg("Maaf, gambar tidak dapat disimpan. Cuba lagi.");
    } finally {
      state.busy = false;
      $("btn-shutter").disabled = false;
    }
  }

  // ---------------------------------------------------------------- hasil
  let resultUrl = null;
  function showResult(item) {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = URL.createObjectURL(item.blob);
    $("result-img").src = resultUrl;
    $("btn-save").textContent = IS_IOS ? "Simpan ke Foto" : "Muat Turun";
    $("ios-save-tip").hidden = !IS_IOS;
    setStatus(item.id, CFG.UPLOAD_URL ? "saving" : "nourl");
    showScreen("result");
  }

  async function savePhoto() {
    if (!state.lastBlob) return;
    const name = state.lastName;
    const file = new File([state.lastBlob], name, { type: "image/jpeg" });
    if (IS_IOS) {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file] }); } catch (e) { /* pengguna batal */ }
      } else {
        alert("Tekan lama pada gambar, kemudian pilih \"Save to Photos\" / \"Tambah ke Foto\".");
      }
      return;
    }
    const a = document.createElement("a");
    a.href = resultUrl; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }

  // ---------------------------------------------------------------- baris gilir (IndexedDB)
  const DB_NAME = "skl-photobooth", STORE = "queue";
  let dbp = null;
  function db() {
    if (!dbp) {
      dbp = new Promise((res, rej) => {
        const r = indexedDB.open(DB_NAME, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    }
    return dbp;
  }
  async function tx(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(STORE, mode);
      const s = t.objectStore(STORE);
      let out;
      Promise.resolve(fn(s)).then((v) => { out = v; });
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
    });
  }
  const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  async function queueAdd(item) {
    // simpan sebagai ArrayBuffer (Safari lama kadang-kadang gagal simpan Blob)
    const buf = await item.blob.arrayBuffer();
    return tx("readwrite", (s) => s.put({ id: item.id, name: item.name, data: buf, created: item.created }));
  }
  async function queueAll() {
    const d = await db();
    return new Promise((res, rej) => {
      const r = d.transaction(STORE, "readonly").objectStore(STORE).getAll();
      r.onsuccess = () => res((r.result || []).sort((a, b) => a.created - b.created));
      r.onerror = () => rej(r.error);
    });
  }
  async function queueDel(id) { return tx("readwrite", (s) => s.delete(id)); }

  // ---------------------------------------------------------------- status
  const STATUS_TEXT = {
    saving: ["Menyimpan ke Google Drive...", ""],
    saved: ["Tersimpan ke Google Drive.", "ok"],
    waiting: ["Menunggu internet. Gambar disimpan dalam peranti dan akan dimuat naik secara automatik.", "wait"],
    nourl: ["Gambar disimpan dalam peranti. Upload ke Drive belum disetup (config.js).", "wait"],
    error: ["Upload ditolak oleh server. Gambar masih disimpan dalam peranti.", "err"]
  };
  const statusById = {};
  function setStatus(id, kind) {
    statusById[id] = kind;
    if (id === state.lastId) {
      const el = $("upload-status");
      const [txt, cls] = STATUS_TEXT[kind] || ["", ""];
      el.textContent = txt;
      el.className = "status-line " + cls;
    }
  }
  async function refreshQueueInfo() {
    let n = 0;
    try { n = (await queueAll()).length; } catch (e) {}
    const el = $("queue-home");
    if (n > 0) {
      el.hidden = false;
      el.className = "status-line wait";
      el.textContent = `${n} gambar menunggu untuk dimuat naik ke Drive.`;
    } else el.hidden = true;
  }

  // ---------------------------------------------------------------- upload
  function toBase64(buf) {
    const bytes = new Uint8Array(buf);
    let bin = "";
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(bin);
  }
  async function uploadOne(item) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 90000);
    try {
      // Tiada header Content-Type -> "simple request", tiada CORS preflight untuk Apps Script
      const res = await fetch(CFG.UPLOAD_URL, {
        method: "POST",
        body: JSON.stringify({ key: CFG.UPLOAD_KEY, id: item.id, name: item.name, mimeType: "image/jpeg", data: toBase64(item.data) }),
        signal: ctrl.signal,
        redirect: "follow"
      });
      if (!res.ok) return { ok: false, retry: true };
      let j = null;
      try { j = await res.json(); } catch (e) { return { ok: false, retry: true }; }
      if (j && j.ok) return { ok: true };
      return { ok: false, retry: false, error: j && j.error };
    } catch (e) {
      return { ok: false, retry: true };
    } finally { clearTimeout(timer); }
  }

  let running = false, retryTimer = 0;
  async function processQueue() {
    if (running) return;
    running = true;
    clearTimeout(retryTimer);
    try {
      const items = await queueAll();
      if (!items.length) return;
      if (!CFG.UPLOAD_URL) { items.forEach((it) => setStatus(it.id, "nourl")); return; }
      if (navigator.onLine === false) { items.forEach((it) => setStatus(it.id, "waiting")); scheduleRetry(); return; }
      for (const it of items) {
        setStatus(it.id, "saving");
        const r = await uploadOne(it);
        if (r.ok) { await queueDel(it.id); setStatus(it.id, "saved"); }
        else if (r.retry) {
          items.forEach((x) => { if (statusById[x.id] !== "saved") setStatus(x.id, "waiting"); });
          scheduleRetry();
          break;
        } else { console.warn("Upload ditolak:", r.error); setStatus(it.id, "error"); }
      }
    } catch (e) {
      console.error(e);
    } finally {
      running = false;
      refreshQueueInfo();
    }
  }
  function scheduleRetry() { clearTimeout(retryTimer); retryTimer = setTimeout(processQueue, 20000); }

  // ---------------------------------------------------------------- install
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $("btn-install").hidden = false;
  });
  window.addEventListener("appinstalled", () => { $("btn-install").hidden = true; deferredPrompt = null; });
  async function doInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch (e) {}
    deferredPrompt = null;
    $("btn-install").hidden = true;
  }

  // ---------------------------------------------------------------- mula
  function init() {
    applyTheme(recall("skl_color") || "ungu");
    if (IS_IOS && !IS_STANDALONE) $("ios-tip").hidden = false;

    document.querySelectorAll(".seg-btn").forEach((b) => b.addEventListener("click", () => applyTheme(b.dataset.color)));
    document.querySelectorAll(".frame-card").forEach((b) => b.addEventListener("click", () => openCamera(b.dataset.orient)));
    $("btn-install").addEventListener("click", doInstall);
    $("btn-back").addEventListener("click", closeCamera);
    $("btn-shutter").addEventListener("click", takePhoto);
    $("btn-switch").addEventListener("click", switchCamera);
    $("btn-gallery").addEventListener("click", pickFromGallery);
    $("file-input").addEventListener("change", onFilePicked);
    $("btn-use-camera").addEventListener("click", backToCamera);
    $("zoom").addEventListener("input", (e) => { state.zoom = Number(e.target.value); });
    $("btn-save").addEventListener("click", savePhoto);
    $("btn-retake").addEventListener("click", () => openCamera(state.orient));
    $("btn-home").addEventListener("click", () => { showScreen("home"); refreshQueueInfo(); });

    if (window.ResizeObserver) new ResizeObserver(() => { if ($("screen-camera").classList.contains("active")) fitPreview(); }).observe($("stage"));
    window.addEventListener("resize", () => { if ($("screen-camera").classList.contains("active")) fitPreview(); });

    window.addEventListener("online", processQueue);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") processQueue();
      else if ($("screen-camera").classList.contains("active") && state.source === "camera") stopStream();
      if (document.visibilityState === "visible" && $("screen-camera").classList.contains("active") && state.source === "camera" && !state.stream) startCamera();
    });

    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW", e));

    refreshQueueInfo();
    processQueue();
  }

  // untuk ujian automatik
  window.__pb = { state, processQueue, queueAll };

  init();
})();
