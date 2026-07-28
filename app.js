const DRUMS = [
  { id: "kick", label: "Kick", pitch: 36 },
  { id: "snare", label: "Snare", pitch: 38 },
  { id: "closedHat", label: "Closed Hat", pitch: 42 },
  { id: "openHat", label: "Open Hat", pitch: 46 },
  { id: "clap", label: "Clap", pitch: 39 },
  { id: "rim", label: "Rim", pitch: 37 },
  { id: "crash", label: "Crash", pitch: 49 }
];

const BASS_NOTES = [];
for (let p = 72; p >= 36; p--) BASS_NOTES.push(p);
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

let BAR_COUNT = 1;
const STEPS_PER_BAR = 16;
let TOTAL_STEPS = BAR_COUNT * STEPS_PER_BAR;

const TRACKS = [
  { id: "rhythm1", name: "Rhythm 1", midiChannel: 9 },
  { id: "rhythm2", name: "Rhythm 2", midiChannel: 8 },
  { id: "bass", name: "Bass", midiChannel: 10 },
  { id: "chord1", name: "Chord 1", midiChannel: 11 },
  { id: "chord2", name: "Chord 2", midiChannel: 12 },
  { id: "pad", name: "Pad", midiChannel: 13 },
  { id: "phrase1", name: "Phrase 1", midiChannel: 14 },
  { id: "phrase2", name: "Phrase 2", midiChannel: 15 }
];

const TRACK_PROFILES = {
  "PSR-E Series": [
    ["rhythm1", "Drums"],
    ["bass", "Bass"],
    ["chord1", "Chords 1"],
    ["chord2", "Chords 2"],
    ["pad", "Pad"],
    ["phrase1", "Phrases"]
  ],
  "PSR-SX600": [
    ["rhythm1", "Rhythm 1"],
    ["rhythm2", "Rhythm 2"],
    ["bass", "Bass"],
    ["chord1", "Chord 1"],
    ["chord2", "Chord 2"],
    ["pad", "Pad"],
    ["phrase1", "Phrase 1"],
    ["phrase2", "Phrase 2"]
  ],
  "Generic-XG": [
    ["rhythm1", "Rhythm 1"],
    ["rhythm2", "Rhythm 2"],
    ["bass", "Bass"],
    ["chord1", "Chord 1"],
    ["chord2", "Chord 2"],
    ["pad", "Pad"],
    ["phrase1", "Phrase 1"],
    ["phrase2", "Phrase 2"]
  ]
};

const SECTION_PROFILES = {
  "PSR-E Series": [
    ["mainA", "Main A"],
    ["mainB", "Main B"],
    ["fillA", "Fill A→B"],
    ["fillBA", "Fill B→A"],
    ["introA", "Intro A"],
    ["endingA", "Ending A"]
  ],
  "PSR-SX600": [
    ["mainA", "Main A"],
    ["mainB", "Main B"],
    ["mainC", "Main C"],
    ["mainD", "Main D"],
    ["fillA", "Fill A"],
    ["fillB", "Fill B"],
    ["fillC", "Fill C"],
    ["fillD", "Fill D"],
    ["introA", "Intro A"],
    ["introB", "Intro B"],
    ["introC", "Intro C"],
    ["endingA", "Ending A"],
    ["endingB", "Ending B"],
    ["endingC", "Ending C"]
  ],
  "Generic-XG": [
    ["mainA", "Main A"],
    ["mainB", "Main B"],
    ["mainC", "Main C"],
    ["mainD", "Main D"],
    ["fillA", "Fill A"],
    ["fillB", "Fill B"],
    ["fillC", "Fill C"],
    ["fillD", "Fill D"],
    ["introA", "Intro A"],
    ["introB", "Intro B"],
    ["introC", "Intro C"],
    ["endingA", "Ending A"],
    ["endingB", "Ending B"],
    ["endingC", "Ending C"]
  ]
};

const ALL_SECTION_IDS = [
  "mainA", "mainB", "mainC", "mainD",
  "fillA", "fillB", "fillC", "fillD", "fillBA",
  "introA", "introB", "introC",
  "endingA", "endingB", "endingC"
];

const PIANO_TRACKS = ["bass", "chord1", "chord2", "pad", "phrase1", "phrase2"];
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.12;

let project = createDefaultProject();
let selectedTrackId = "rhythm1";
let voiceDb = [];
let activeBar = 0;
let audioCtx = null;
let masterGain = null;
let isPlaying = false;
let playTimer = null;
let currentStep = 0;
let nextNoteTime = 0;

function activeProfile() { return TRACK_PROFILES[project.keyboard] || TRACK_PROFILES["PSR-E Series"]; }
function activeTrackIds() { return activeProfile().map(x => x[0]); }
function activeSectionProfile() { return SECTION_PROFILES[project.keyboard] || SECTION_PROFILES["PSR-E Series"]; }
function activeSectionIds() { return activeSectionProfile().map(x => x[0]); }
function displayName(track) { const x = activeProfile().find(a => a[0] === track.id); return x ? x[1] : track.name; }
function sectionLabel(id) { const x = activeSectionProfile().find(a => a[0] === id); return x ? x[1] : id; }
function activeTracks(sec = project.sections[currentSection()]) { return sec.tracks.filter(t => activeTrackIds().includes(t.id)); }
function isDrumTrack(track) { return track.id === "rhythm1" || track.id === "rhythm2"; }
function isBassTrack(track) { return track.id === "bass"; }
function isPianoTrack(track) { return PIANO_TRACKS.includes(track.id); }
function currentSection() { return sectionSelect.value || activeSectionIds()[0]; }
function currentTrack() { return project.sections[currentSection()].tracks.find(t => t.id === selectedTrackId); }
function noteName(p) { return NOTE_NAMES[p % 12] + (Math.floor(p / 12) - 1); }
function isBlack(p) { return [1, 3, 6, 8, 10].includes(p % 12); }

function defaultVoiceForTrack(id) {
  if (id === "rhythm1" || id === "rhythm2") return "Standard Kit";
  if (id === "bass") return "Finger Bass";
  if (id === "pad") return "Warm Pad";
  return "Grand Piano";
}

function makeSection() {
  return {
    bars: BAR_COUNT,
    stepsPerBar: STEPS_PER_BAR,
    tracks: TRACKS.map(t => ({ ...t, voice: defaultVoiceForTrack(t.id), notes: [] }))
  };
}

function createDefaultProject() {
  const sections = {};
  ALL_SECTION_IDS.forEach(id => sections[id] = makeSection());
  return {
    app: "StyleForge Lite",
    version: "1.4.0",
    name: "Test Style",
    tempo: 120,
    barCount: BAR_COUNT,
    timeSignature: "4/4",
    keyboard: "PSR-E Series",
    sections
  };
}

async function init() {
  await loadVoices();
  bindUI();
  renderAll();
}

async function loadVoices() {
  try {
    const res = await fetch("data/voices/psr-sx600.json");
    voiceDb = await res.json();
  } catch {
    voiceDb = [
      { name: "Standard Kit", category: "Drums", msb: 127, lsb: 0, pc: 1 },
      { name: "Room Kit", category: "Drums", msb: 127, lsb: 0, pc: 9 },
      { name: "Grand Piano", category: "Piano", msb: 0, lsb: 0, pc: 1 },
      { name: "Finger Bass", category: "Bass", msb: 0, lsb: 0, pc: 34 },
      { name: "Nylon Guitar", category: "Guitar", msb: 0, lsb: 0, pc: 25 },
      { name: "Warm Pad", category: "Pad", msb: 0, lsb: 0, pc: 90 }
    ];
  }
}

function bindUI() {
  playBtn.onclick = togglePlayback;
  saveJsonBtn.onclick = saveProjectJson;
  loadJsonInput.onchange = loadProjectJson;
  exportMidiBtn.onclick = exportMidi;
  applyVoiceBtn.onclick = applyVoiceToTrack;
  clearTrackBtn.onclick = clearSelectedTrack;
  demoBtn.onclick = loadDemoBeat;
  scrollStartBtn.onclick = () => { activeBar = (activeBar + BAR_COUNT - 1) % BAR_COUNT; renderGrid(); };
  scrollEndBtn.onclick = () => { activeBar = (activeBar + 1) % BAR_COUNT; renderGrid(); };
  styleName.oninput = e => project.name = e.target.value;
  tempo.oninput = e => project.tempo = Number(e.target.value) || 120;
  keyboardSelect.onchange = e => {
    project.keyboard = e.target.value;
    if (!activeTrackIds().includes(selectedTrackId)) selectedTrackId = activeTrackIds()[0];
    renderAll();
    if (typeof syncStyleExportProfile === "function") syncStyleExportProfile();
  };
  sectionSelect.onchange = () => { activeBar = 0; renderAll(); };
  barsSelect.onchange = e => setBarCount(Number(e.target.value));
}

function migrateProject() {
  BAR_COUNT = Number(project.barCount || BAR_COUNT || 1);
  if (![1, 2, 4].includes(BAR_COUNT)) BAR_COUNT = 1;
  TOTAL_STEPS = BAR_COUNT * STEPS_PER_BAR;
  project.barCount = BAR_COUNT;
  project.keyboard = project.keyboard || "PSR-E Series";
  project.sections = project.sections || {};

  ALL_SECTION_IDS.forEach(id => { if (!project.sections[id]) project.sections[id] = makeSection(); });

  Object.values(project.sections).forEach(sec => {
    sec.bars = BAR_COUNT;
    sec.stepsPerBar = STEPS_PER_BAR;
    sec.tracks = sec.tracks || [];
    TRACKS.forEach(dt => {
      if (!sec.tracks.some(t => t.id === dt.id)) {
        sec.tracks.push({ ...dt, voice: defaultVoiceForTrack(dt.id), notes: [] });
      }
    });
    sec.tracks.forEach(track => {
      track.notes = (track.notes || []).filter(n => Math.round(n.start * 4) < TOTAL_STEPS);
    });
  });

  if (!activeTrackIds().includes(selectedTrackId)) selectedTrackId = activeTrackIds()[0];
  if (!activeSectionIds().includes(sectionSelect.value)) sectionSelect.value = activeSectionIds()[0];
  activeBar = Math.min(activeBar, BAR_COUNT - 1);
}

function setBarCount(count) {
  BAR_COUNT = count;
  TOTAL_STEPS = BAR_COUNT * STEPS_PER_BAR;
  project.barCount = BAR_COUNT;
  activeBar = Math.min(activeBar, BAR_COUNT - 1);
  Object.values(project.sections).forEach(sec => {
    sec.bars = BAR_COUNT;
    sec.tracks.forEach(track => {
      track.notes = track.notes.filter(n => Math.round(n.start * 4) < TOTAL_STEPS);
    });
  });
  renderAll();
}

function renderAll() {
  migrateProject();
  styleName.value = project.name;
  tempo.value = project.tempo;
  barsSelect.value = String(BAR_COUNT);
  renderKeyboardSelect();
  renderSectionSelect();
  renderVoiceSelect();
  renderTrackList();
  renderGrid();
  syncInspector();
}

function renderKeyboardSelect() {
  keyboardSelect.innerHTML = Object.keys(TRACK_PROFILES).map(k => `<option value="${k}">${k === "Generic-XG" ? "Generic XG" : k}</option>`).join("");
  keyboardSelect.value = project.keyboard || "PSR-E Series";
}

function renderSectionSelect() {
  const current = sectionSelect.value;
  sectionSelect.innerHTML = activeSectionProfile().map(([id, label]) => `<option value="${id}">${label}</option>`).join("");
  sectionSelect.value = activeSectionIds().includes(current) ? current : activeSectionIds()[0];
}

function renderVoiceSelect() {
  voiceSelect.innerHTML = voiceDb.map(v => `<option value="${v.name}">${v.category} — ${v.name}</option>`).join("");
}

function renderTrackList() {
  const sec = project.sections[currentSection()];
  trackList.innerHTML = "";
  activeTracks(sec).forEach(track => {
    const div = document.createElement("button");
    div.type = "button";
    div.className = "track" + (track.id === selectedTrackId ? " active" : "");
    div.innerHTML = `<strong>${displayName(track)}</strong><br/><small>${track.voice} • ${track.notes.length} notes</small>`;
    div.onclick = () => { selectedTrackId = track.id; renderAll(); };
    trackList.appendChild(div);
  });
}

function commonHeader(title, help) {
  editorTitle.textContent = title;
  editorHelp.textContent = help;
  barIndicator.textContent = `${sectionLabel(currentSection())} • Bar ${activeBar + 1} / ${BAR_COUNT}`;
  barIndicator.classList.toggle("hidden", BAR_COUNT <= 1);
  barTools.classList.toggle("hidden", BAR_COUNT <= 1);
}

function renderGrid() {
  const track = currentTrack();
  if (isPianoTrack(track)) renderPianoRoll(track);
  else renderDrumGrid(track);
}

function renderDrumGrid(track) {
  commonHeader(`${displayName(track)} Grid`, "Rhythm tracks use the drum grid. Melodic tracks use the piano roll.");
  const start = activeBar * STEPS_PER_BAR;
  const end = start + STEPS_PER_BAR;
  const html = ['<div class="grid-table"><div></div>'];
  html.push(`<div class="bar-label" style="grid-column:span 16">${sectionLabel(currentSection())}</div><div></div>`);
  for (let step = start; step < end; step++) html.push(`<div class="step-label">${step - start + 1}</div>`);
  DRUMS.forEach(drum => {
    html.push(`<div class="drum-label">${drum.label}</div>`);
    for (let step = start; step < end; step++) {
      const local = step - start;
      const beat = Math.floor(local / 4);
      const isOn = track.notes.some(n => n.pitch === drum.pitch && Math.round(n.start * 4) === step);
      html.push(`<button class="cell ${beat % 2 === 0 ? "beat-even" : "beat-odd"} ${local % 4 === 0 ? "beat-start" : ""} ${isOn ? "on" : ""}" data-pitch="${drum.pitch}" data-step="${step}"></button>`);
    }
  });
  html.push("</div>");
  grid.innerHTML = html.join("");
  grid.querySelectorAll(".cell").forEach(cell => {
    cell.onclick = () => {
      toggleNote(track, Number(cell.dataset.pitch), Number(cell.dataset.step));
      renderGrid();
      renderTrackList();
    };
  });
}

function getPianoScroll() {
  const wrap = grid.querySelector(".piano-wrap");
  return wrap ? { x: wrap.scrollLeft, y: wrap.scrollTop } : { x: 0, y: 0 };
}

function restorePianoScroll(pos) {
  requestAnimationFrame(() => {
    const wrap = grid.querySelector(".piano-wrap");
    if (wrap) { wrap.scrollLeft = pos.x; wrap.scrollTop = pos.y; }
  });
}

function renderPianoRoll(track) {
  commonHeader(`${displayName(track)} Piano Roll`, `Tap keys to preview. Tap grid cells to place/remove ${displayName(track)} notes.`);
  const start = activeBar * STEPS_PER_BAR;
  const end = start + STEPS_PER_BAR;
  const html = ['<div class="piano-wrap"><div class="piano-grid"><div></div>'];
  html.push(`<div class="bar-label" style="grid-column:span 16">${sectionLabel(currentSection())}</div><div></div>`);
  for (let step = start; step < end; step++) html.push(`<div class="step-label">${step - start + 1}</div>`);
  BASS_NOTES.forEach(p => {
    html.push(`<button class="key-label ${isBlack(p) ? "key-black" : "key-white"}" data-preview-pitch="${p}">${noteName(p)}</button>`);
    for (let step = start; step < end; step++) {
      const local = step - start;
      const beat = Math.floor(local / 4);
      const isOn = track.notes.some(n => n.pitch === p && Math.round(n.start * 4) === step);
      html.push(`<button class="piano-cell ${isBlack(p) ? "black" : "white"} ${beat % 2 === 0 ? "beat-even" : "beat-odd"} ${local % 4 === 0 ? "beat-start" : ""} ${isOn ? "on" : ""}" data-pitch="${p}" data-step="${step}"></button>`);
    }
  });
  html.push("</div></div>");
  grid.innerHTML = html.join("");
  grid.querySelectorAll(".piano-cell").forEach(cell => {
    cell.onclick = async () => {
      const pos = getPianoScroll();
      const pitch = Number(cell.dataset.pitch);
      toggleNote(track, pitch, Number(cell.dataset.step));
      await previewTone(track, pitch);
      renderGrid();
      renderTrackList();
      restorePianoScroll(pos);
    };
  });
  grid.querySelectorAll(".key-label").forEach(key => {
    key.onclick = async () => previewTone(track, Number(key.dataset.previewPitch));
  });
}

function syncInspector() {
  const track = currentTrack();
  channelSelect.innerHTML = activeProfile().map(([id, label]) => `<option value="${id}">${label}</option>`).join("");
  channelSelect.value = track.id;
  voiceSelect.value = track.voice;
  channelSelect.onchange = e => { selectedTrackId = e.target.value; renderAll(); };
}

function toggleNote(track, pitch, step) {
  const start = step / 4;
  const idx = track.notes.findIndex(n => n.pitch === pitch && Math.round(n.start * 4) === step);
  if (idx >= 0) track.notes.splice(idx, 1);
  else track.notes.push({ pitch, start, duration: 0.25, velocity: 105 });
}

function applyVoiceToTrack() { currentTrack().voice = voiceSelect.value; renderAll(); }
function clearSelectedTrack() { currentTrack().notes = []; renderAll(); }

function loadDemoBeat() {
  const track = currentTrack();
  track.notes = [];
  if (isPianoTrack(track)) {
    const base = track.id === "bass" ? 36 : 60;
    [[base, 0], [base + 7, 4], [base + 5, 8], [base + 12, 12]].forEach(([p, s]) => {
      if (s < TOTAL_STEPS) track.notes.push({ pitch: p, start: s / 4, duration: 0.25, velocity: 105 });
    });
  } else {
    const add = (pitch, steps, velocity = 105) => steps.forEach(step => {
      if (step < TOTAL_STEPS) track.notes.push({ pitch, start: step / 4, duration: 0.25, velocity });
    });
    for (let bar = 0; bar < BAR_COUNT; bar++) {
      const o = bar * STEPS_PER_BAR;
      add(36, [o, o + 8]);
      add(38, [o + 4, o + 12]);
      add(42, [o, o + 2, o + 4, o + 6, o + 8, o + 10, o + 12, o + 14], 72);
    }
    add(49, [0]);
  }
  renderAll();
}

async function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") await audioCtx.resume();
}
function out() { return masterGain || audioCtx.destination; }
function midiFreq(p) { return 440 * Math.pow(2, (p - 69) / 12); }
async function previewTone(track, p) { await ensureAudio(); playTone(track, p, audioCtx.currentTime, 0.22); }

function playTone(track, p, time, dur = 0.18) {
  if (isBassTrack(track)) return playBass(p, time, dur);
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  osc.type = track.id.startsWith("phrase") ? "square" : track.id === "pad" ? "triangle" : "sine";
  osc.frequency.setValueAtTime(midiFreq(p), time);
  filter.type = "lowpass";
  filter.frequency.value = track.id === "pad" ? 900 : 1800;
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.exponentialRampToValueAtTime(track.id === "pad" ? 0.22 : 0.28, time + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
  osc.connect(filter).connect(gain).connect(out());
  osc.start(time);
  osc.stop(time + dur + 0.03);
}

function playBass(p, time, dur = 0.18) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(midiFreq(p), time);
  filter.type = "lowpass";
  filter.frequency.value = 500;
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.exponentialRampToValueAtTime(0.35, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
  osc.connect(filter).connect(gain).connect(out());
  osc.start(time);
  osc.stop(time + dur + 0.02);
}

function playDrumSound(pitch, time) {
  if (pitch === 36) return drumKick(time);
  if ([37, 38, 39].includes(pitch)) return drumSnare(time);
  if ([42, 46, 49].includes(pitch)) return drumHat(time, pitch !== 42);
}
function drumKick(time) {
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.type = "sine"; osc.frequency.setValueAtTime(140, time); osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
  gain.gain.setValueAtTime(0.9, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
  osc.connect(gain).connect(out()); osc.start(time); osc.stop(time + 0.17);
}
function drumSnare(time) {
  const b = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.16, audioCtx.sampleRate);
  const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const n = audioCtx.createBufferSource(); const f = audioCtx.createBiquadFilter(); const g = audioCtx.createGain();
  n.buffer = b; f.type = "highpass"; f.frequency.value = 1200; g.gain.setValueAtTime(0.45, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
  n.connect(f).connect(g).connect(out()); n.start(time);
}
function drumHat(time, open = false) {
  const len = open ? 0.28 : 0.06;
  const b = audioCtx.createBuffer(1, audioCtx.sampleRate * len, audioCtx.sampleRate);
  const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const n = audioCtx.createBufferSource(); const f = audioCtx.createBiquadFilter(); const g = audioCtx.createGain();
  n.buffer = b; f.type = "highpass"; f.frequency.value = 6000; g.gain.setValueAtTime(0.25, time); g.gain.exponentialRampToValueAtTime(0.001, time + len);
  n.connect(f).connect(g).connect(out()); n.start(time);
}

function togglePlayback() { isPlaying ? stopPlayback() : startPlayback(); }
async function startPlayback() {
  stopPlayback(); await ensureAudio(); isPlaying = true; playBtn.textContent = "■ Stop";
  currentStep = 0; nextNoteTime = audioCtx.currentTime + 0.04; scheduler(); playTimer = setInterval(scheduler, LOOKAHEAD_MS);
}
function scheduler() {
  while (isPlaying && nextNoteTime < audioCtx.currentTime + SCHEDULE_AHEAD_SEC) {
    scheduleStep(currentStep, nextNoteTime);
    const step = currentStep, time = nextNoteTime;
    setTimeout(() => highlightStep(step), Math.max(0, (time - audioCtx.currentTime) * 1000));
    nextNoteTime += 60 / (Number(project.tempo) || 120) / 4;
    currentStep = (currentStep + 1) % TOTAL_STEPS;
  }
}
function scheduleStep(step, time) {
  activeTracks(project.sections[currentSection()]).forEach(track => {
    track.notes.filter(n => Math.round(n.start * 4) === step).forEach(n => {
      if (isDrumTrack(track)) playDrumSound(n.pitch, time); else playTone(track, n.pitch, time, 0.2);
    });
  });
}
function highlightStep(step) {
  const bar = Math.floor(step / STEPS_PER_BAR);
  if (bar !== activeBar) { activeBar = bar; renderGrid(); }
  document.querySelectorAll(".cell,.piano-cell").forEach(c => c.classList.remove("playing"));
  document.querySelectorAll(`[data-step="${step}"]`).forEach(c => c.classList.add("playing"));
}
function stopPlayback() {
  isPlaying = false; if (playTimer) clearInterval(playTimer); playTimer = null;
  if (typeof playBtn !== "undefined") playBtn.textContent = "▶ Play";
  document.querySelectorAll(".cell,.piano-cell").forEach(c => c.classList.remove("playing"));
}

function saveProjectJson() {
  project.name = styleName.value || "Untitled Style";
  project.tempo = Number(tempo.value) || 120;
  project.barCount = BAR_COUNT;
  downloadBlob(JSON.stringify(project, null, 2), `${safeName(project.name)}.styleforge.json`, "application/json");
}
function loadProjectJson(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try { project = JSON.parse(reader.result); selectedTrackId = "rhythm1"; activeBar = 0; renderAll(); if (typeof syncStyleExportProfile === "function") syncStyleExportProfile(); }
    catch { alert("Could not load project JSON."); }
  };
  reader.readAsText(file);
}
function safeName(name) { return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "styleforge"; }
function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}

function exportMidi() {
  project.name = styleName.value || "Untitled Style";
  project.tempo = Number(tempo.value) || 120;
  const ppq = 480;
  const events = [];
  const sec = project.sections[currentSection()];
  const mode = exportMode?.value || "section";
  const tracks = mode === "track" ? [currentTrack()] : activeTracks(sec);
  tracks.forEach(track => track.notes.forEach(n => {
    const tick = Math.round(n.start * ppq);
    const dur = Math.round((n.duration || 0.25) * ppq);
    const ch = track.midiChannel || 9;
    events.push({ tick, bytes: [0x90 + ch, n.pitch, n.velocity || 100] });
    events.push({ tick: tick + dur, bytes: [0x80 + ch, n.pitch, 0] });
  }));
  events.sort((a, b) => a.tick - b.tick);
  const endTick = ppq * 4 * BAR_COUNT;
  const tempoTrack = makeTrack([{ tick: 0, meta: [0xFF, 0x51, 0x03, ...tempoBytes(project.tempo)] }, { tick: endTick, meta: [0xFF, 0x2F, 0] }]);
  const pes = [];
  let lastTick = 0;
  for (const ev of events) { pes.push({ delta: ev.tick - lastTick, bytes: ev.bytes }); lastTick = ev.tick; }
  pes.push({ delta: Math.max(0, endTick - lastTick), bytes: [0xFF, 0x2F, 0] });
  const patternTrack = makeTrack(pes, true);
  const header = [...strBytes("MThd"), 0, 0, 0, 6, 0, 1, 0, 2, (ppq >> 8) & 255, ppq & 255];
  const midi = new Uint8Array([...header, ...tempoTrack, ...patternTrack]);
  const suffix = mode === "track" ? selectedTrackId : currentSection();
  downloadBlob(midi, `${safeName(project.name)}-${suffix}.mid`, "audio/midi");
}

function tempoBytes(bpm) { const mpqn = Math.round(60000000 / bpm); return [(mpqn >> 16) & 255, (mpqn >> 8) & 255, mpqn & 255]; }
function makeTrack(events, alreadyDelta = false) {
  const data = []; let lastTick = 0;
  for (const ev of events) {
    const delta = alreadyDelta ? ev.delta : ev.tick - lastTick;
    data.push(...varLen(delta)); data.push(...(ev.bytes || ev.meta));
    if (!alreadyDelta) lastTick = ev.tick;
  }
  return [...strBytes("MTrk"), ...u32(data.length), ...data];
}
function varLen(value) {
  let buffer = value & 0x7F, bytes = [];
  while (value >>= 7) { buffer <<= 8; buffer |= ((value & 0x7F) | 0x80); }
  while (true) { bytes.push(buffer & 0xFF); if (buffer & 0x80) buffer >>= 8; else break; }
  return bytes;
}
function strBytes(s) { return [...s].map(c => c.charCodeAt(0)); }
function u32(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }

init();
