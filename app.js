const DRUMS = [
  { id: "kick", label: "Kick", pitch: 36 },
  { id: "snare", label: "Snare", pitch: 38 },
  { id: "closedHat", label: "Closed Hat", pitch: 42 },
  { id: "openHat", label: "Open Hat", pitch: 46 },
  { id: "clap", label: "Clap", pitch: 39 },
  { id: "rim", label: "Rim", pitch: 37 },
  { id: "crash", label: "Crash", pitch: 49 }
];

const BARS = 4;
const STEPS_PER_BAR = 16;
const TOTAL_STEPS = BARS * STEPS_PER_BAR;

const TRACKS = [
  { id: "rhythm1", name: "Rhythm 1", channel: "rhythm1", midiChannel: 9 },
  { id: "rhythm2", name: "Rhythm 2", channel: "rhythm2", midiChannel: 9 },
  { id: "bass", name: "Bass", channel: "bass", midiChannel: 10 },
  { id: "chord1", name: "Chord 1", channel: "chord1", midiChannel: 11 },
  { id: "chord2", name: "Chord 2", channel: "chord2", midiChannel: 12 },
  { id: "pad", name: "Pad", channel: "pad", midiChannel: 13 },
  { id: "phrase1", name: "Phrase 1", channel: "phrase1", midiChannel: 14 },
  { id: "phrase2", name: "Phrase 2", channel: "phrase2", midiChannel: 15 }
];

let project = createDefaultProject();
let selectedTrackId = "rhythm1";
let audioCtx = null;
let playing = false;
let playTimer = null;
let currentStep = 0;
let voiceDb = [];

function createDefaultProject() {
  const sections = {};
  ["mainA", "mainB", "fillA", "introA", "endingA"].forEach(sectionId => {
    sections[sectionId] = {
      bars: BARS,
      stepsPerBar: STEPS_PER_BAR,
      tracks: TRACKS.map(t => ({
        id: t.id,
        name: t.name,
        channel: t.channel,
        midiChannel: t.midiChannel,
        voice: t.id.startsWith("rhythm") ? "Standard Kit" : "Grand Piano",
        notes: []
      }))
    };
  });

  return {
    app: "StyleForge Lite",
    version: "0.2",
    name: "Test Style",
    tempo: 120,
    timeSignature: "4/4",
    keyboard: "PSR-SX600",
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
  } catch (e) {
    voiceDb = [
      { name: "Standard Kit", category: "Drums", msb: 127, lsb: 0, pc: 1 },
      { name: "Grand Piano", category: "Piano", msb: 0, lsb: 0, pc: 1 },
      { name: "Finger Bass", category: "Bass", msb: 0, lsb: 0, pc: 34 },
      { name: "Nylon Guitar", category: "Guitar", msb: 0, lsb: 0, pc: 25 },
      { name: "Warm Pad", category: "Pad", msb: 0, lsb: 0, pc: 90 }
    ];
  }
}

function bindUI() {
  document.getElementById("playBtn").onclick = startPlayback;
  document.getElementById("stopBtn").onclick = stopPlayback;
  document.getElementById("saveJsonBtn").onclick = saveProjectJson;
  document.getElementById("loadJsonInput").onchange = loadProjectJson;
  document.getElementById("exportMidiBtn").onclick = exportMidi;
  document.getElementById("applyVoiceBtn").onclick = applyVoiceToTrack;
  document.getElementById("clearTrackBtn").onclick = clearSelectedTrack;
  document.getElementById("demoBtn").onclick = loadDemoBeat;
  document.getElementById("scrollStartBtn").onclick = () => document.getElementById("grid").scrollLeft = 0;
  document.getElementById("scrollEndBtn").onclick = () => document.getElementById("grid").scrollLeft = 99999;

  document.getElementById("styleName").oninput = e => project.name = e.target.value;
  document.getElementById("tempo").oninput = e => project.tempo = Number(e.target.value) || 120;
  document.getElementById("keyboardSelect").onchange = e => project.keyboard = e.target.value;
  document.getElementById("sectionSelect").onchange = renderAll;
}

function currentSection() {
  return document.getElementById("sectionSelect").value;
}

function currentTrack() {
  return project.sections[currentSection()].tracks.find(t => t.id === selectedTrackId);
}

function migrateProject() {
  Object.values(project.sections || {}).forEach(sec => {
    sec.bars = sec.bars || BARS;
    sec.stepsPerBar = sec.stepsPerBar || STEPS_PER_BAR;
    sec.tracks = sec.tracks || [];
    TRACKS.forEach(defaultTrack => {
      if (!sec.tracks.some(t => t.id === defaultTrack.id)) {
        sec.tracks.push({
          ...defaultTrack,
          voice: defaultTrack.id.startsWith("rhythm") ? "Standard Kit" : "Grand Piano",
          notes: []
        });
      }
    });
  });
}

function renderAll() {
  migrateProject();
  document.getElementById("styleName").value = project.name;
  document.getElementById("tempo").value = project.tempo;
  renderKeyboardSelect();
  renderVoiceSelect();
  renderTrackList();
  renderGrid();
  syncInspector();
}

function renderKeyboardSelect() {
  const select = document.getElementById("keyboardSelect");
  select.innerHTML = `<option value="PSR-SX600">PSR-SX600</option><option value="Generic-XG">Generic XG</option>`;
  select.value = project.keyboard || "PSR-SX600";
}

function renderVoiceSelect() {
  const select = document.getElementById("voiceSelect");
  select.innerHTML = voiceDb.map(v => `<option value="${v.name}">${v.category} — ${v.name}</option>`).join("");
}

function renderTrackList() {
  const list = document.getElementById("trackList");
  list.innerHTML = "";
  project.sections[currentSection()].tracks.forEach(track => {
    const div = document.createElement("div");
    div.className = "track" + (track.id === selectedTrackId ? " active" : "");
    div.innerHTML = `<strong>${track.name}</strong><br/><small>${track.voice} • ${track.notes.length} notes</small>`;
    div.onclick = () => {
      selectedTrackId = track.id;
      renderAll();
    };
    list.appendChild(div);
  });
}

function renderGrid() {
  const grid = document.getElementById("grid");
  const track = currentTrack();
  const html = [];
  html.push(`<div class="grid-table">`);

  html.push(`<div></div>`);
  for (let step = 0; step < TOTAL_STEPS; step++) {
    if (step % STEPS_PER_BAR === 0) {
      html.push(`<div class="bar-label" style="grid-column: span 4;">Bar ${step / STEPS_PER_BAR + 1}</div>`);
      step += 3;
    }
  }

  html.push(`<div></div>`);
  for (let step = 0; step < TOTAL_STEPS; step++) {
    html.push(`<div class="step-label">${(step % STEPS_PER_BAR) + 1}</div>`);
  }

  DRUMS.forEach(drum => {
    html.push(`<div class="drum-label">${drum.label}</div>`);
    for (let step = 0; step < TOTAL_STEPS; step++) {
      const barIndex = Math.floor(step / STEPS_PER_BAR);
      const isOn = track.notes.some(n => n.pitch === drum.pitch && Math.round(n.start * 4) === step);
      const beatClass = step % 4 === 0 ? "beat" : "";
      const barClass = barIndex % 2 === 0 ? "bar-even" : "bar-odd";
      html.push(`<button class="cell ${barClass} ${beatClass} ${isOn ? "on" : ""}" data-pitch="${drum.pitch}" data-step="${step}" title="${drum.label} bar ${barIndex + 1} step ${(step % STEPS_PER_BAR) + 1}"></button>`);
    }
  });

  html.push(`</div>`);
  grid.innerHTML = html.join("");

  grid.querySelectorAll(".cell").forEach(cell => {
    cell.onclick = () => {
      toggleDrumNote(Number(cell.dataset.pitch), Number(cell.dataset.step));
      renderAll();
    };
  });
}

function syncInspector() {
  const track = currentTrack();
  document.getElementById("channelSelect").value = track.channel;
  document.getElementById("voiceSelect").value = track.voice;
}

function toggleDrumNote(pitch, step) {
  const track = currentTrack();
  const start = step / 4;
  const idx = track.notes.findIndex(n => n.pitch === pitch && Math.round(n.start * 4) === step);
  if (idx >= 0) {
    track.notes.splice(idx, 1);
  } else {
    track.notes.push({ pitch, start, duration: 0.25, velocity: 105 });
  }
}

function applyVoiceToTrack() {
  const track = currentTrack();
  track.channel = document.getElementById("channelSelect").value;
  track.voice = document.getElementById("voiceSelect").value;
  renderAll();
}

function clearSelectedTrack() {
  currentTrack().notes = [];
  renderAll();
}

function loadDemoBeat() {
  selectedTrackId = "rhythm1";
  const track = currentTrack();
  track.voice = "Standard Kit";
  track.notes = [];
  const add = (pitch, steps, velocity = 105) => {
    steps.forEach(step => track.notes.push({ pitch, start: step / 4, duration: 0.25, velocity }));
  };

  for (let bar = 0; bar < BARS; bar++) {
    const o = bar * STEPS_PER_BAR;
    add(36, [o + 0, o + 8]);
    add(38, [o + 4, o + 12]);
    add(42, [o + 0, o + 2, o + 4, o + 6, o + 8, o + 10, o + 12, o + 14], 72);
  }
  add(49, [0]);
  renderAll();
}

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playDrumSound(pitch, time) {
  ensureAudio();
  if (pitch === 36) return drumKick(time);
  if (pitch === 38 || pitch === 39 || pitch === 37) return drumSnare(time);
  if (pitch === 42 || pitch === 46 || pitch === 49) return drumHat(time, pitch === 46 || pitch === 49);
}

function drumKick(time) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(140, time);
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
  gain.gain.setValueAtTime(0.9, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(time);
  osc.stop(time + 0.17);
}

function drumSnare(time) {
  const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.16, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  noise.buffer = noiseBuffer;
  filter.type = "highpass";
  filter.frequency.value = 1200;
  gain.gain.setValueAtTime(0.45, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
  noise.connect(filter).connect(gain).connect(audioCtx.destination);
  noise.start(time);
}

function drumHat(time, open = false) {
  const length = open ? 0.28 : 0.06;
  const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * length, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  noise.buffer = noiseBuffer;
  filter.type = "highpass";
  filter.frequency.value = 6000;
  gain.gain.setValueAtTime(0.25, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + length);
  noise.connect(filter).connect(gain).connect(audioCtx.destination);
  noise.start(time);
}

function startPlayback() {
  stopPlayback();
  ensureAudio();
  playing = true;
  currentStep = 0;
  const stepMs = (60 / project.tempo / 4) * 1000;

  playTimer = setInterval(() => {
    playStep(currentStep);
    highlightStep(currentStep);
    currentStep = (currentStep + 1) % TOTAL_STEPS;
  }, stepMs);
}

function playStep(step) {
  const sec = project.sections[currentSection()];
  sec.tracks.forEach(track => {
    if (!track.id.startsWith("rhythm")) return;
    track.notes
      .filter(n => Math.round(n.start * 4) === step)
      .forEach(n => playDrumSound(n.pitch, audioCtx.currentTime));
  });
}

function highlightStep(step) {
  document.querySelectorAll(".cell").forEach(c => c.classList.remove("playing"));
  document.querySelectorAll(`.cell[data-step="${step}"]`).forEach(c => c.classList.add("playing"));
  const playingCell = document.querySelector(`.cell[data-step="${step}"]`);
  if (playingCell && step % 8 === 0) {
    playingCell.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }
}

function stopPlayback() {
  playing = false;
  if (playTimer) clearInterval(playTimer);
  playTimer = null;
  document.querySelectorAll(".cell").forEach(c => c.classList.remove("playing"));
}

function saveProjectJson() {
  project.name = document.getElementById("styleName").value || "Untitled Style";
  project.tempo = Number(document.getElementById("tempo").value) || 120;
  downloadBlob(JSON.stringify(project, null, 2), `${safeName(project.name)}.styleforge.json`, "application/json");
}

function loadProjectJson(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      project = JSON.parse(reader.result);
      selectedTrackId = "rhythm1";
      renderAll();
    } catch {
      alert("Could not load project JSON.");
    }
  };
  reader.readAsText(file);
}

function safeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "styleforge";
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportMidi() {
  project.name = document.getElementById("styleName").value || "Untitled Style";
  project.tempo = Number(document.getElementById("tempo").value) || 120;

  const ppq = 480;
  const events = [];
  const sec = project.sections[currentSection()];
  sec.tracks.forEach(track => {
    track.notes.forEach(n => {
      const tick = Math.round(n.start * ppq);
      const dur = Math.round(n.duration * ppq);
      const ch = track.midiChannel || 9;
      events.push({ tick, bytes: [0x90 + ch, n.pitch, n.velocity || 100] });
      events.push({ tick: tick + dur, bytes: [0x80 + ch, n.pitch, 0] });
    });
  });
  events.sort((a, b) => a.tick - b.tick);

  const endTick = ppq * 4 * BARS;
  const tempoTrack = makeTrack([
    { tick: 0, meta: [0xFF, 0x51, 0x03, ...tempoBytes(project.tempo)] },
    { tick: endTick, meta: [0xFF, 0x2F, 0x00] }
  ]);

  const patternEvents = [];
  let lastTick = 0;
  for (const ev of events) {
    patternEvents.push({ delta: ev.tick - lastTick, bytes: ev.bytes });
    lastTick = ev.tick;
  }
  patternEvents.push({ delta: Math.max(0, endTick - lastTick), bytes: [0xFF, 0x2F, 0x00] });
  const patternTrack = makeTrack(patternEvents, true);

  const header = [
    ...strBytes("MThd"),
    0x00,0x00,0x00,0x06,
    0x00,0x01,
    0x00,0x02,
    (ppq >> 8) & 255, ppq & 255
  ];

  const midi = new Uint8Array([...header, ...tempoTrack, ...patternTrack]);
  downloadBlob(midi, `${safeName(project.name)}-${currentSection()}.mid`, "audio/midi");
}

function tempoBytes(bpm) {
  const mpqn = Math.round(60000000 / bpm);
  return [(mpqn >> 16) & 255, (mpqn >> 8) & 255, mpqn & 255];
}

function makeTrack(events, alreadyDelta = false) {
  const data = [];
  let lastTick = 0;
  for (const ev of events) {
    const delta = alreadyDelta ? ev.delta : ev.tick - lastTick;
    data.push(...varLen(delta));
    data.push(...(ev.bytes || ev.meta));
    if (!alreadyDelta) lastTick = ev.tick;
  }
  return [...strBytes("MTrk"), ...u32(data.length), ...data];
}

function varLen(value) {
  let buffer = value & 0x7F;
  const bytes = [];
  while ((value >>= 7)) {
    buffer <<= 8;
    buffer |= ((value & 0x7F) | 0x80);
  }
  while (true) {
    bytes.push(buffer & 0xFF);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
  return bytes;
}

function strBytes(s) {
  return [...s].map(c => c.charCodeAt(0));
}

function u32(n) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
}

init();
