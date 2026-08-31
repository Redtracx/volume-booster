const slider = document.getElementById("slider");
const percentLabel = document.getElementById("percentLabel");
const muteBtn = document.getElementById("muteBtn");
const resetBtn = document.getElementById("resetBtn");
const presetButtons = document.querySelectorAll(".presets button");
const controls = document.getElementById("controls");
const unsupported = document.getElementById("unsupported");
const levelingToggle = document.getElementById("levelingToggle");
const levelingIntensity = document.getElementById("levelingIntensity");

let activeTabId = null;
let muted = false;

function setLabel(percent) {
  percentLabel.textContent = `${percent}%`;
}

function updateMuteButton() {
  muteBtn.textContent = muted ? "🔇" : "🔈";
  muteBtn.classList.toggle("active", muted);
}

function showUnsupported() {
  controls.classList.add("hidden");
  unsupported.classList.remove("hidden");
}

function showControls() {
  controls.classList.remove("hidden");
  unsupported.classList.add("hidden");
}

async function sendToActiveTab(message) {
  return browser.tabs.sendMessage(activeTabId, message);
}

async function init() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    showUnsupported();
    return;
  }
  activeTabId = tab.id;

  try {
    const state = await sendToActiveTab({ type: "vb:getState" });
    if (!state) {
      showUnsupported();
      return;
    }
    const percent = Math.round(state.volume * 100);
    slider.value = percent;
    setLabel(percent);
    muted = !!state.muted;
    updateMuteButton();

    const leveling = state.leveling || { enabled: false, intensity: "normal" };
    levelingToggle.checked = leveling.enabled;
    levelingIntensity.value = leveling.intensity;
    levelingIntensity.disabled = !leveling.enabled;

    showControls();
  } catch (e) {
    // No content script on this page (e.g. about:, addons.mozilla.org).
    showUnsupported();
  }
}

async function setVolume(percent) {
  setLabel(percent);
  if (muted) {
    muted = false;
    updateMuteButton();
    await sendToActiveTab({ type: "vb:setMuted", value: false }).catch(() => {});
  }
  await sendToActiveTab({ type: "vb:setVolume", value: percent / 100 }).catch(() => {});
}

slider.addEventListener("input", () => {
  setVolume(Number(slider.value));
});

muteBtn.addEventListener("click", async () => {
  muted = !muted;
  updateMuteButton();
  await sendToActiveTab({ type: "vb:setMuted", value: muted }).catch(() => {});
});

resetBtn.addEventListener("click", async () => {
  slider.value = 100;
  await setVolume(100);
});

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const value = Number(button.dataset.value);
    slider.value = value;
    setVolume(value);
  });
});

async function sendLeveling() {
  levelingIntensity.disabled = !levelingToggle.checked;
  await sendToActiveTab({
    type: "vb:setLeveling",
    enabled: levelingToggle.checked,
    intensity: levelingIntensity.value,
  }).catch(() => {});
}

levelingToggle.addEventListener("change", sendLeveling);
levelingIntensity.addEventListener("change", sendLeveling);

init();
