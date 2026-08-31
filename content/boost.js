// Boosts <audio>/<video> playback in this frame via a Web Audio GainNode,
// so volume can go beyond the browser's native 100% ceiling. Optionally
// also runs the signal through a DynamicsCompressorNode ("Lautstärke-
// Ausgleich") to even out sudden jumps between quiet and loud passages
// (e.g. quiet dialogue vs. loud action scenes while streaming).
(function () {
  const STORAGE_KEY = "vb:" + location.origin;

  const LEVELING_PRESETS = {
    normal: { threshold: -24, knee: 30, ratio: 6, attack: 0.02, release: 0.3 },
    stark: { threshold: -40, knee: 12, ratio: 14, attack: 0.005, release: 0.2 },
  };
  const LEVELING_OFF = { threshold: 0, knee: 0, ratio: 1, attack: 0.003, release: 0.25 };

  let audioCtx = null;
  let gainNode = null;
  let compressorNode = null;
  let gainValue = 1; // 1 = 100%
  let muted = false;
  let leveling = { enabled: false, intensity: "normal" };
  const hooked = new WeakSet();

  function ensureContext() {
    if (!audioCtx) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextCtor();
      compressorNode = audioCtx.createDynamicsCompressor();
      gainNode = audioCtx.createGain();
      compressorNode.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      applyGain();
      applyLeveling();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
  }

  function applyGain() {
    if (gainNode) {
      gainNode.gain.value = muted ? 0 : gainValue;
    }
  }

  function applyLeveling() {
    if (!compressorNode) return;
    const preset = leveling.enabled
      ? LEVELING_PRESETS[leveling.intensity] || LEVELING_PRESETS.normal
      : LEVELING_OFF;
    const now = audioCtx.currentTime;
    compressorNode.threshold.setTargetAtTime(preset.threshold, now, 0.01);
    compressorNode.knee.setTargetAtTime(preset.knee, now, 0.01);
    compressorNode.ratio.setTargetAtTime(preset.ratio, now, 0.01);
    compressorNode.attack.setTargetAtTime(preset.attack, now, 0.01);
    compressorNode.release.setTargetAtTime(preset.release, now, 0.01);
  }

  function hook(el) {
    if (!(el instanceof HTMLMediaElement) || hooked.has(el)) return;
    try {
      ensureContext();
      const source = audioCtx.createMediaElementSource(el);
      source.connect(compressorNode);
      hooked.add(el);
    } catch (e) {
      // Element may already be routed through another graph; ignore.
    }
  }

  function scan(root) {
    root.querySelectorAll("audio, video").forEach(hook);
  }

  function observeNewMedia() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches("audio, video")) hook(node);
          scan(node);
        });
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  // Catches elements that start playing before the MutationObserver sees them.
  document.addEventListener(
    "play",
    (event) => {
      if (event.target instanceof HTMLMediaElement) hook(event.target);
    },
    true
  );

  function loadSavedState() {
    browser.storage.local
      .get(STORAGE_KEY)
      .then((data) => {
        const saved = data[STORAGE_KEY];
        if (saved && typeof saved.volume === "number") {
          gainValue = saved.volume;
          muted = !!saved.muted;
        }
        if (saved && saved.leveling) {
          leveling = {
            enabled: !!saved.leveling.enabled,
            intensity: saved.leveling.intensity === "stark" ? "stark" : "normal",
          };
        }
        if (audioCtx) {
          applyGain();
          applyLeveling();
        }
      })
      .catch(() => {});
  }

  function saveState() {
    browser.storage.local
      .set({ [STORAGE_KEY]: { volume: gainValue, muted, leveling } })
      .catch(() => {});
  }

  function init() {
    scan(document);
    observeNewMedia();
    loadSavedState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || !message.type) return;

    if (message.type === "vb:getState") {
      sendResponse({
        volume: gainValue,
        muted,
        leveling,
        hasMedia: document.querySelectorAll("audio, video").length > 0,
      });
      return;
    }

    if (message.type === "vb:setVolume") {
      gainValue = Math.max(0, Number(message.value) || 0);
      ensureContext();
      applyGain();
      saveState();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "vb:setMuted") {
      muted = !!message.value;
      ensureContext();
      applyGain();
      saveState();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "vb:setLeveling") {
      leveling = {
        enabled: !!message.enabled,
        intensity: message.intensity === "stark" ? "stark" : "normal",
      };
      ensureContext();
      applyLeveling();
      saveState();
      sendResponse({ ok: true });
      return;
    }
  });
})();
