const TIMELINE_TRACKS = [
  { id: "rhythm1", name: "Rhythm 1", midiChannel: 9 },
  { id: "rhythm2", name: "Rhythm 2", midiChannel: 8 },
  { id: "bass", name: "Bass", midiChannel: 10 },
  { id: "chord1", name: "Chord 1", midiChannel: 11 },
  { id: "chord2", name: "Chord 2", midiChannel: 12 },
  { id: "pad", name: "Pad", midiChannel: 13 },
  { id: "phrase1", name: "Phrase 1", midiChannel: 14 },
  { id: "phrase2", name: "Phrase 2", midiChannel: 15 }
];

const TIMELINE_PROFILES = {
  "PSR-E Series": {
    mode: "builtin-psre",
    tracks: [["rhythm1", "Drums"], ["bass", "Bass"], ["chord1", "Chords 1"], ["chord2", "Chords 2"], ["pad", "Pad"], ["phrase1", "Phrases"]],
    sections: [["mainA", "Main A", "Main A"], ["mainB", "Main B", "Main B"], ["fillA", "Fill A to B", "Fill In AA + AB"], ["fillBA", "Fill B to A", "Fill In BA + BB"], ["introA", "Intro A", "Intro A"], ["endingA", "Ending A", "Ending A"]]
  },
  "PSR-SX600": {
    mode: "builtin-sx",
    tracks: [["rhythm1", "Rhythm 1"], ["rhythm2", "Rhythm 2"], ["bass", "Bass"], ["chord1", "Chord 1"], ["chord2", "Chord 2"], ["pad", "Pad"], ["phrase1", "Phrase 1"], ["phrase2", "Phrase 2"]],
    sections: [["mainA", "Main A", "Main A"], ["mainB", "Main B", "Main B"], ["mainC", "Main C", "Main C"], ["mainD", "Main D", "Main D"], ["fillA", "Fill A", "Fill In AA"], ["fillB", "Fill B", "Fill In BB + BA"], ["fillC", "Fill C", "Fill In CC"], ["fillD", "Fill D", "Fill In DD"], ["introA", "Intro A", "Intro A"], ["introB", "Intro B", "Intro B"], ["introC", "Intro C", "Intro C"], ["endingA", "Ending A", "Ending A"], ["endingB", "Ending B", "Ending B"], ["endingC", "Ending C", "Ending C"]]
  }
};

const TIMELINE_SECTION_IDS = ["mainA", "mainB", "mainC", "mainD", "fillA", "fillB", "fillC", "fillD", "fillBA", "introA", "introB", "introC", "endingA", "endingB", "endingC"];
const DRUM_LABELS = { 35: "Kick 2", 36: "Kick", 37: "Side stick", 38: "Snare", 39: "Clap", 40: "Snare 2", 41: "Low tom", 42: "Closed hat", 43: "Low tom", 44: "Pedal hat", 45: "Mid tom", 46: "Open hat", 47: "Mid tom", 48: "High tom", 49: "Crash", 50: "High tom", 51: "Ride", 52: "China", 53: "Ride bell", 54: "Tambourine", 55: "Splash", 56: "Cowbell", 57: "Crash 2", 58: "Vibraslap", 59: "Ride 2" };
const MAX_HISTORY = 40;
const PIANO_ROW_HEIGHT = 22;
const VELOCITY_HEIGHT = 104;

let BAR_COUNT = 1;
let project = createTimelineProject();
let selectedNoteIds = new Set();
let editorTool = "select";
let dragState = null;
let velocityDrag = null;
let noteSerial = 0;
const undoStack = [];
const redoStack = [];

const styleName = document.getElementById("styleName");
const tempo = document.getElementById("tempo");
const keyboardSelect = document.getElementById("keyboardSelect");
const sectionSelect = document.getElementById("sectionSelect");
const barsSelect = document.getElementById("barsSelect");
const targetTrackSelect = document.getElementById("targetTrackSelect");
const sourceChannelSelect = document.getElementById("sourceChannelSelect");
const replaceTargetCheck = document.getElementById("replaceTargetCheck");
const midiImportInput = document.getElementById("midiImportInput");
const loadTimelineInput = document.getElementById("loadTimelineInput");
const importStatus = document.getElementById("importStatus");
const sectionMap = document.getElementById("sectionMap");
const timeline = document.getElementById("timeline");
const timelineTitle = document.getElementById("timelineTitle");
const timelineHelp = document.getElementById("timelineHelp");
const timelineSpan = document.getElementById("timelineSpan");
const styExportMode = document.getElementById("styExportMode");
const snapSelect = document.getElementById("snapSelect");
const editorStatus = document.getElementById("editorStatus");
const undoButton = document.getElementById("undoBtn");
const redoButton = document.getElementById("redoBtn");
const quantizeButton = document.getElementById("quantizeNotesBtn");
const shortenButton = document.getElementById("shortenNotesBtn");
const lengthenButton = document.getElementById("lengthenNotesBtn");
const deleteButton = document.getElementById("deleteNotesBtn");

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function roundToPrecision(value) { return Math.round(value * 96) / 96; }
function makeNoteId() { noteSerial += 1; return `note-${Date.now().toString(36)}-${noteSerial}`; }
function isSafeNoteId(value) { return typeof value === "string" && /^[a-z0-9-]+$/i.test(value); }
function sectionSpan() { return BAR_COUNT * 4; }
function defaultVoice(id) { if (id === "rhythm1" || id === "rhythm2") return "Standard Kit"; if (id === "bass") return "Finger Bass"; if (id === "pad") return "Warm Pad"; return "Grand Piano"; }

function makeTimelineSection() {
  return { bars: BAR_COUNT, stepsPerBar: 16, tracks: TIMELINE_TRACKS.map(track => ({ ...track, voice: defaultVoice(track.id), notes: [] })) };
}

function createTimelineProject() {
  const sections = {};
  TIMELINE_SECTION_IDS.forEach(id => { sections[id] = makeTimelineSection(); });
  return { app: "StyleForge MIDI Timeline", version: "1.5.2", name: "Timeline Style", tempo: 120, barCount: 1, timeSignature: "4/4", keyboard: "PSR-E Series", sections };
}

function currentProfile() { return TIMELINE_PROFILES[project.keyboard] || TIMELINE_PROFILES["PSR-E Series"]; }
function activeTrackIds() { return currentProfile().tracks.map(item => item[0]); }
function currentSection() { return sectionSelect.value || currentProfile().sections[0][0]; }
function activeTracks(section) { return (section || project.sections[currentSection()]).tracks.filter(track => activeTrackIds().includes(track.id)); }
function trackDisplay(id) { const item = currentProfile().tracks.find(track => track[0] === id); return item ? item[1] : id; }
function sectionDetails(id = currentSection()) { return currentProfile().sections.find(section => section[0] === id) || currentProfile().sections[0]; }
function currentTrack() { return project.sections[currentSection()].tracks.find(track => track.id === targetTrackSelect.value) || activeTracks()[0]; }
function formatChannel(channel) { return `MIDI channel ${channel + 1}`; }

function noteLabel(pitch) {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return `${names[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
}

function isBlackKey(pitch) { return [1, 3, 6, 8, 10].includes(pitch % 12); }
function isDrumTrack(track = currentTrack()) { return track.id === "rhythm1" || track.id === "rhythm2"; }
function noteDisplayName(pitch, drums) { return drums && DRUM_LABELS[pitch] ? `${noteLabel(pitch)} ${DRUM_LABELS[pitch]}` : noteLabel(pitch); }
function tempoBytes(bpm) { const mpqn = Math.round(60000000 / bpm); return [(mpqn >> 16) & 255, (mpqn >> 8) & 255, mpqn & 255]; }
function safeName(name) { return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "styleforge"; }

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function normalizeNote(note) {
  const span = sectionSpan();
  const pitch = Number(note.pitch);
  const start = clamp(roundToPrecision(Number(note.start) || 0), 0, Math.max(0, span - 1 / 96));
  const duration = clamp(roundToPrecision(Number(note.duration) || 0.25), 1 / 96, Math.max(1 / 96, span - start));
  return {
    id: isSafeNoteId(note.id) ? note.id : makeNoteId(),
    pitch: clamp(Math.round(Number.isFinite(pitch) ? pitch : 60), 0, 127),
    start,
    duration,
    velocity: clamp(Math.round(Number(note.velocity) || 100), 1, 127)
  };
}

function sortNotes(track) { track.notes.sort((a, b) => a.start - b.start || a.pitch - b.pitch || a.id.localeCompare(b.id)); }

function migrateTimelineProject() {
  BAR_COUNT = Number(project.barCount || 1);
  if (![1, 2, 4].includes(BAR_COUNT)) BAR_COUNT = 1;
  project.barCount = BAR_COUNT;
  project.version = "1.5.2";
  project.keyboard = TIMELINE_PROFILES[project.keyboard] ? project.keyboard : "PSR-E Series";
  project.sections = project.sections || {};
  TIMELINE_SECTION_IDS.forEach(id => { if (!project.sections[id]) project.sections[id] = makeTimelineSection(); });
  Object.values(project.sections).forEach(section => {
    section.bars = BAR_COUNT;
    section.stepsPerBar = 16;
    section.tracks = section.tracks || [];
    TIMELINE_TRACKS.forEach(base => {
      if (!section.tracks.some(track => track.id === base.id)) section.tracks.push({ ...base, voice: defaultVoice(base.id), notes: [] });
    });
    section.tracks.forEach(track => {
      track.notes = (track.notes || []).map(normalizeNote).filter(note => note.start < sectionSpan());
      sortNotes(track);
    });
  });
}

function rememberEdit() {
  undoStack.push(JSON.stringify(project));
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack.length = 0;
  updateEditorControls();
}

function restoreHistory(source, destination) {
  if (!source.length) return;
  destination.push(JSON.stringify(project));
  project = JSON.parse(source.pop());
  selectedNoteIds = new Set();
  migrateTimelineProject();
  renderControls();
}

function undoEdit() { restoreHistory(undoStack, redoStack); }
function redoEdit() { restoreHistory(redoStack, undoStack); }

function selectedNotes() {
  const track = currentTrack();
  return track.notes.filter(note => selectedNoteIds.has(note.id));
}

function pruneSelection() {
  const available = new Set(currentTrack().notes.map(note => note.id));
  selectedNoteIds = new Set([...selectedNoteIds].filter(id => available.has(id)));
}

function setSelected(ids) {
  selectedNoteIds = new Set(ids);
  pruneSelection();
  syncSelectionDom();
}

function syncSelectionDom() {
  timeline.querySelectorAll(".piano-note, .velocity-bar").forEach(element => {
    element.classList.toggle("selected", selectedNoteIds.has(element.dataset.noteId));
  });
  updateEditorControls();
}

function gridUnit() { return Number(snapSelect.value) || 0.25; }
function snapTime(value, bypass = false) { return clamp(roundToPrecision(bypass ? value : Math.round(value / gridUnit()) * gridUnit()), 0, sectionSpan()); }

function editorRange(track = currentTrack()) {
  const drums = isDrumTrack(track);
  let min = drums ? 35 : 36;
  let max = drums ? 81 : 84;
  if (track.notes.length) {
    min = clamp(Math.min(min, ...track.notes.map(note => note.pitch - 2)), 0, 127);
    max = clamp(Math.max(max, ...track.notes.map(note => note.pitch + 2)), 0, 127);
  }
  return { min, max, rows: max - min + 1, drums };
}

function notePixelStyle(note, range) {
  const gridWidth = BAR_COUNT * 16 * pianoStepWidth();
  const left = clamp(note.start / sectionSpan() * gridWidth, 0, gridWidth);
  const width = Math.max(8, Math.min(gridWidth - left, note.duration / sectionSpan() * gridWidth - 2));
  const top = (range.max - note.pitch) * pianoRowHeight() + 2;
  return `left:${left}px;width:${width}px;top:${top}px;`;
}

function velocityPixelStyle(note) {
  const gridWidth = BAR_COUNT * 16 * pianoStepWidth();
  const left = clamp(note.start / sectionSpan() * gridWidth, 0, gridWidth);
  const width = Math.max(5, Math.min(gridWidth - left, note.duration / sectionSpan() * gridWidth - 3));
  const height = Math.max(6, note.velocity / 127 * VELOCITY_HEIGHT);
  return `left:${left}px;width:${width}px;height:${height}px;`;
}

function pianoKeys(range) {
  const keys = [];
  for (let pitch = range.max; pitch >= range.min; pitch -= 1) {
    const kind = range.drums ? " drum" : isBlackKey(pitch) ? " black" : "";
    const root = pitch % 12 === 0 ? " root" : "";
    keys.push(`<div class="piano-key${kind}${root}" aria-hidden="true">${noteDisplayName(pitch, range.drums)}</div>`);
  }
  return keys.join("");
}

function pianoRuler(steps) {
  return Array.from({ length: steps }, (_, index) => {
    const isBeat = index % 4 === 0;
    const bar = Math.floor(index / 16) + 1;
    const beat = Math.floor((index % 16) / 4) + 1;
    return `<div class="piano-ruler-step${isBeat ? " bar-start" : ""}">${isBeat ? `${bar}.${beat}` : ""}</div>`;
  }).join("");
}

function pianoStepWidth() {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--piano-step")) || 40;
}

function pianoRowHeight() {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--piano-row")) || PIANO_ROW_HEIGHT;
}

function channelButtons(tracks, track) {
  return tracks.map(item => {
    const active = item.id === track.id ? " active" : "";
    const count = item.notes.length;
    return `<button type="button" class="channel-button${active}" data-track="${item.id}" aria-pressed="${item.id === track.id}"><strong>${trackDisplay(item.id)}</strong><span>${formatChannel(item.midiChannel)}</span><span class="channel-note-count">${count} ${count === 1 ? "note" : "notes"}</span></button>`;
  }).join("");
}

function renderTimeline() {
  const previousScroll = timeline.querySelector(".piano-roll-scroll");
  const scrollLeft = previousScroll ? previousScroll.scrollLeft : 0;
  const scrollTop = previousScroll ? previousScroll.scrollTop : 0;
  const track = currentTrack();
  const tracks = activeTracks();
  const range = editorRange(track);
  const steps = BAR_COUNT * 16;
  const gridWidth = steps * pianoStepWidth();
  const gridHeight = range.rows * pianoRowHeight();
  const notes = track.notes.map(note => {
    const selected = selectedNoteIds.has(note.id) ? " selected" : "";
    const drum = range.drums ? " drum" : "";
    const label = noteLabel(note.pitch);
    return `<button type="button" class="piano-note${selected}${drum}" data-note-id="${note.id}" style="${notePixelStyle(note, range)}" aria-label="${label}, start ${note.start}, duration ${note.duration}, velocity ${note.velocity}" title="${label}, start ${note.start}, duration ${note.duration}, velocity ${note.velocity}"><span class="piano-note-label">${label}</span></button>`;
  }).join("");
  const velocities = track.notes.map(note => {
    const selected = selectedNoteIds.has(note.id) ? " selected" : "";
    const drum = range.drums ? " drum" : "";
    return `<button type="button" class="velocity-bar${selected}${drum}" data-note-id="${note.id}" style="${velocityPixelStyle(note)}" aria-label="Velocity ${note.velocity} for ${noteLabel(note.pitch)}" title="Velocity ${note.velocity}"></button>`;
  }).join("");
  const styles = `--roll-steps:${steps};--roll-grid-width:${gridWidth}px;--roll-grid-height:${gridHeight}px;`;

  timeline.innerHTML = `<div class="piano-roll-workspace" style="${styles}">
    <aside class="channel-strip" aria-label="Style channels">
      <div class="channel-strip-head"><strong>Channels</strong><span>Select one to open its piano roll</span></div>
      <div class="channel-list">${channelButtons(tracks, track)}</div>
    </aside>
    <section class="piano-roll-stage" aria-label="${trackDisplay(track.id)} piano roll">
      <div class="piano-roll-scroll" id="pianoRollScroll">
        <div class="piano-roll-canvas">
          <div class="piano-roll-ruler">${pianoRuler(steps)}</div>
          <div class="piano-roll-body">
            <div class="piano-keys">${pianoKeys(range)}</div>
            <div class="piano-grid is-${editorTool}" id="pianoGrid" data-min-pitch="${range.min}" data-max-pitch="${range.max}" role="application" aria-label="Editable ${trackDisplay(track.id)} piano roll">${notes}<div class="selection-box" id="selectionBox" hidden></div></div>
          </div>
        </div>
      </div>
      <section class="velocity-editor" aria-label="Velocity editor">
        <div class="velocity-editor-head"><strong>Velocity</strong><span>${selectedNoteIds.size ? `${selectedNoteIds.size} note${selectedNoteIds.size === 1 ? "" : "s"} selected` : "Drag a bar to change its velocity"}</span></div>
        <div class="velocity-scroll"><div class="velocity-canvas"><div class="velocity-label">127</div><div class="velocity-grid" id="velocityGrid">${velocities}</div></div></div>
      </section>
    </section>
  </div>`;

  const restoredScroll = timeline.querySelector(".piano-roll-scroll");
  restoredScroll.scrollLeft = scrollLeft;
  restoredScroll.scrollTop = scrollTop;
  bindTimelineEvents();
  updateEditorControls();
}

function renderControls() {
  migrateTimelineProject();
  const previousSection = sectionSelect.value;
  const previousTrack = targetTrackSelect.value;
  const previousSource = sourceChannelSelect.value;
  styleName.value = project.name;
  tempo.value = project.tempo;
  barsSelect.value = String(BAR_COUNT);
  keyboardSelect.value = project.keyboard;
  sectionSelect.innerHTML = currentProfile().sections.map(([id, label]) => `<option value="${id}">${label}</option>`).join("");
  sectionSelect.value = currentProfile().sections.some(section => section[0] === previousSection) ? previousSection : currentProfile().sections[0][0];
  const tracks = activeTracks();
  targetTrackSelect.innerHTML = tracks.map(track => `<option value="${track.id}">${trackDisplay(track.id)} (${formatChannel(track.midiChannel)})</option>`).join("");
  targetTrackSelect.value = tracks.some(track => track.id === previousTrack) ? previousTrack : tracks[0].id;
  sourceChannelSelect.innerHTML = Array.from({ length: 16 }, (_, index) => `<option value="${index}">MIDI channel ${index + 1}</option>`).join("");
  sourceChannelSelect.value = sourceChannelSelect.dataset.userSelected ? previousSource : String(currentTrack().midiChannel);
  const details = sectionDetails();
  sectionMap.textContent = `${details[1]} exports to Yamaha slot${details[2].includes(" + ") ? "s" : ""}: ${details[2]}.`;
  timelineTitle.textContent = `${details[1]} / ${trackDisplay(currentTrack().id)} piano roll`;
  timelineHelp.textContent = `Edit ${trackDisplay(currentTrack().id)} on ${formatChannel(currentTrack().midiChannel)}. Imported notes remain editable before style export.`;
  timelineSpan.textContent = `${BAR_COUNT} ${BAR_COUNT === 1 ? "bar" : "bars"} / ${BAR_COUNT * 16} steps`;
  styExportMode.value = currentProfile().mode;
  pruneSelection();
  if (typeof syncStyleExportProfile === "function") syncStyleExportProfile();
  renderTimeline();
}

function updateEditorControls() {
  const selected = selectedNotes();
  const hasSelection = selected.length > 0;
  undoButton.disabled = !undoStack.length;
  redoButton.disabled = !redoStack.length;
  deleteButton.disabled = !hasSelection;
  shortenButton.disabled = !hasSelection;
  lengthenButton.disabled = !hasSelection;
  document.querySelectorAll("[data-editor-tool]").forEach(button => {
    const active = button.dataset.editorTool === editorTool;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const grid = timeline.querySelector(".piano-grid");
  if (grid) {
    grid.classList.toggle("is-select", editorTool === "select");
    grid.classList.toggle("is-draw", editorTool === "draw");
    grid.classList.toggle("is-slice", editorTool === "slice");
  }
  if (hasSelection) {
    editorStatus.textContent = `${selected.length} ${selected.length === 1 ? "note" : "notes"} selected. Drag to move, drag the right edge to resize, or use the toolbar and arrow keys.`;
  } else if (editorTool === "draw") {
    editorStatus.textContent = "Draw mode: click the grid to add notes at the current snap length. Double click also draws a note.";
  } else if (editorTool === "slice") {
    editorStatus.textContent = "Slice mode: click a time position to split every note that crosses it.";
  } else {
    editorStatus.textContent = "Select mode: click notes to edit, Shift-click to select more, drag empty space to select, or double click to draw.";
  }
}

function setEditorTool(tool) {
  editorTool = tool;
  updateEditorControls();
}

function findNote(id) { return currentTrack().notes.find(note => note.id === id); }

function gridPoint(event, grid) {
  const rect = grid.getBoundingClientRect();
  const range = editorRange();
  const x = clamp(event.clientX - rect.left, 0, rect.width);
  const y = clamp(event.clientY - rect.top, 0, Math.max(0, rect.height - 1));
  const time = x / rect.width * sectionSpan();
  const row = clamp(Math.floor(y / pianoRowHeight()), 0, range.rows - 1);
  return { time, pitch: range.max - row, x, y, range };
}

function drawNote(point) {
  const track = currentTrack();
  const start = clamp(snapTime(point.time), 0, Math.max(0, sectionSpan() - gridUnit()));
  const duration = clamp(gridUnit(), 1 / 96, sectionSpan() - start);
  rememberEdit();
  const note = { id: makeNoteId(), pitch: point.pitch, start, duration, velocity: 100 };
  track.notes.push(note);
  sortNotes(track);
  selectedNoteIds = new Set([note.id]);
  renderTimeline();
}

function sliceNotes(time) {
  const cut = snapTime(time);
  const track = currentTrack();
  const split = track.notes.filter(note => note.start + note.duration > cut + 1 / 96 && note.start < cut - 1 / 96);
  if (!split.length) {
    editorStatus.textContent = "No note crosses this slice position.";
    return;
  }
  rememberEdit();
  const added = [];
  split.forEach(note => {
    const originalEnd = note.start + note.duration;
    note.duration = roundToPrecision(cut - note.start);
    const right = { ...note, id: makeNoteId(), start: cut, duration: roundToPrecision(originalEnd - cut) };
    track.notes.push(right);
    added.push(note.id, right.id);
  });
  sortNotes(track);
  selectedNoteIds = new Set(added);
  renderTimeline();
}

function startMarquee(event, point, grid) {
  const selectionBox = grid.querySelector("#selectionBox");
  dragState = { kind: "marquee", pointerId: event.pointerId, grid, selectionBox, startPoint: point, currentPoint: point };
  selectionBox.hidden = false;
  selectionBox.style.left = `${point.x}px`;
  selectionBox.style.top = `${point.y}px`;
  selectionBox.style.width = "0px";
  selectionBox.style.height = "0px";
  grid.setPointerCapture(event.pointerId);
}

function startNoteDrag(event, noteElement, note, grid) {
  const rect = noteElement.getBoundingClientRect();
  const selected = selectedNotes();
  const kind = event.clientX >= rect.right - 10 ? "resize" : "move";
  const entries = (kind === "move" ? selected : [note]).map(item => ({ id: item.id, start: item.start, duration: item.duration, pitch: item.pitch }));
  dragState = { kind, pointerId: event.pointerId, grid, noteElement, startX: event.clientX, startY: event.clientY, entries, anchorId: note.id, range: editorRange(), changed: false };
  noteElement.setPointerCapture(event.pointerId);
}

function updateMarqueeBox(state, point) {
  const left = Math.min(state.startPoint.x, point.x);
  const top = Math.min(state.startPoint.y, point.y);
  state.selectionBox.style.left = `${left}px`;
  state.selectionBox.style.top = `${top}px`;
  state.selectionBox.style.width = `${Math.abs(point.x - state.startPoint.x)}px`;
  state.selectionBox.style.height = `${Math.abs(point.y - state.startPoint.y)}px`;
}

function updateNoteElement(noteElement, note, range) {
  noteElement.style.cssText = notePixelStyle(note, range);
  noteElement.querySelector(".piano-note-label").textContent = noteLabel(note.pitch);
  noteElement.setAttribute("aria-label", `${noteLabel(note.pitch)}, start ${note.start}, duration ${note.duration}, velocity ${note.velocity}`);
  noteElement.title = `${noteLabel(note.pitch)}, start ${note.start}, duration ${note.duration}, velocity ${note.velocity}`;
}

function handleGridPointerDown(event) {
  if (event.button !== 0) return;
  const grid = event.currentTarget;
  const noteElement = event.target.closest(".piano-note");
  const point = gridPoint(event, grid);
  if (noteElement) {
    const note = findNote(noteElement.dataset.noteId);
    if (!note) return;
    if (editorTool === "slice") {
      sliceNotes(point.time);
      return;
    }
    if (event.shiftKey) {
      const next = new Set(selectedNoteIds);
      if (next.has(note.id)) next.delete(note.id); else next.add(note.id);
      setSelected(next);
      return;
    }
    if (!selectedNoteIds.has(note.id)) setSelected([note.id]);
    startNoteDrag(event, noteElement, note, grid);
    event.preventDefault();
    return;
  }
  if (editorTool === "draw") {
    drawNote(point);
    return;
  }
  if (editorTool === "slice") {
    sliceNotes(point.time);
    return;
  }
  setSelected([]);
  startMarquee(event, point, grid);
  event.preventDefault();
}

function handleGridPointerMove(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  const state = dragState;
  const point = gridPoint(event, state.grid);
  if (state.kind === "marquee") {
    state.currentPoint = point;
    updateMarqueeBox(state, point);
    return;
  }
  const deltaTimeRaw = (event.clientX - state.startX) / state.grid.getBoundingClientRect().width * sectionSpan();
  const deltaPitch = -Math.round((event.clientY - state.startY) / pianoRowHeight());
  const anchor = state.entries.find(entry => entry.id === state.anchorId);
  if (!anchor) return;
  if (state.kind === "move") {
    const snappedAnchorStart = snapTime(anchor.start + deltaTimeRaw, event.altKey);
    const deltaTime = snappedAnchorStart - anchor.start;
    const changed = state.entries.some(entry => {
      const note = findNote(entry.id);
      if (!note) return false;
      const nextStart = clamp(roundToPrecision(entry.start + deltaTime), 0, sectionSpan() - note.duration);
      const nextPitch = clamp(entry.pitch + deltaPitch, 0, 127);
      return note.start !== nextStart || note.pitch !== nextPitch;
    });
    if (!changed) return;
    if (!state.changed) { rememberEdit(); state.changed = true; }
    state.entries.forEach(entry => {
      const note = findNote(entry.id);
      if (!note) return;
      note.start = clamp(roundToPrecision(entry.start + deltaTime), 0, sectionSpan() - note.duration);
      note.pitch = clamp(entry.pitch + deltaPitch, 0, 127);
      const element = timeline.querySelector(`.piano-note[data-note-id="${note.id}"]`);
      if (element) updateNoteElement(element, note, state.range);
    });
  } else {
    const nextDuration = clamp(snapTime(anchor.duration + deltaTimeRaw, event.altKey), 1 / 96, sectionSpan() - anchor.start);
    const note = findNote(anchor.id);
    if (!note || note.duration === nextDuration) return;
    if (!state.changed) { rememberEdit(); state.changed = true; }
    note.duration = nextDuration;
    updateNoteElement(state.noteElement, note, state.range);
  }
}

function handleGridPointerUp(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  const state = dragState;
  dragState = null;
  if (state.kind === "marquee") {
    const minTime = Math.min(state.startPoint.time, state.currentPoint.time);
    const maxTime = Math.max(state.startPoint.time, state.currentPoint.time);
    const minPitch = Math.min(state.startPoint.pitch, state.currentPoint.pitch);
    const maxPitch = Math.max(state.startPoint.pitch, state.currentPoint.pitch);
    const ids = currentTrack().notes.filter(note => note.pitch >= minPitch && note.pitch <= maxPitch && note.start <= maxTime && note.start + note.duration >= minTime).map(note => note.id);
    state.selectionBox.hidden = true;
    setSelected(ids);
    return;
  }
  if (state.changed) {
    sortNotes(currentTrack());
    renderTimeline();
  }
}

function handleGridDoubleClick(event) {
  if (event.target.closest(".piano-note")) return;
  event.preventDefault();
  drawNote(gridPoint(event, event.currentTarget));
}

function handleGridContextMenu(event) {
  const noteElement = event.target.closest(".piano-note");
  if (!noteElement) return;
  event.preventDefault();
  const note = findNote(noteElement.dataset.noteId);
  if (!note) return;
  rememberEdit();
  currentTrack().notes = currentTrack().notes.filter(item => item.id !== note.id);
  selectedNoteIds.delete(note.id);
  renderTimeline();
}

function handleVelocityPointerDown(event) {
  if (event.button !== 0) return;
  const bar = event.target.closest(".velocity-bar");
  if (!bar) return;
  const note = findNote(bar.dataset.noteId);
  if (!note) return;
  if (!selectedNoteIds.has(note.id)) setSelected([note.id]);
  velocityDrag = { pointerId: event.pointerId, bar, noteId: note.id, changed: false };
  bar.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function handleVelocityPointerMove(event) {
  if (!velocityDrag || velocityDrag.pointerId !== event.pointerId) return;
  const grid = event.currentTarget;
  const rect = grid.getBoundingClientRect();
  const nextVelocity = clamp(Math.round((rect.bottom - event.clientY) / rect.height * 127), 1, 127);
  const note = findNote(velocityDrag.noteId);
  if (!note || note.velocity === nextVelocity) return;
  if (!velocityDrag.changed) { rememberEdit(); velocityDrag.changed = true; }
  note.velocity = nextVelocity;
  velocityDrag.bar.style.height = `${Math.max(6, note.velocity / 127 * VELOCITY_HEIGHT)}px`;
  velocityDrag.bar.setAttribute("aria-label", `Velocity ${note.velocity} for ${noteLabel(note.pitch)}`);
  velocityDrag.bar.title = `Velocity ${note.velocity}`;
}

function handleVelocityPointerUp(event) {
  if (!velocityDrag || velocityDrag.pointerId !== event.pointerId) return;
  const changed = velocityDrag.changed;
  velocityDrag = null;
  if (changed) renderTimeline();
}

function bindTimelineEvents() {
  timeline.querySelectorAll(".channel-button").forEach(button => {
    button.onclick = () => {
      targetTrackSelect.value = button.dataset.track;
      sourceChannelSelect.value = String(currentTrack().midiChannel);
      sourceChannelSelect.dataset.userSelected = "";
      selectedNoteIds = new Set();
      renderControls();
    };
  });
  const grid = timeline.querySelector("#pianoGrid");
  grid.addEventListener("pointerdown", handleGridPointerDown);
  grid.addEventListener("pointermove", handleGridPointerMove);
  grid.addEventListener("pointerup", handleGridPointerUp);
  grid.addEventListener("pointercancel", handleGridPointerUp);
  grid.addEventListener("dblclick", handleGridDoubleClick);
  grid.addEventListener("contextmenu", handleGridContextMenu);
  const velocityGrid = timeline.querySelector("#velocityGrid");
  velocityGrid.addEventListener("pointerdown", handleVelocityPointerDown);
  velocityGrid.addEventListener("pointermove", handleVelocityPointerMove);
  velocityGrid.addEventListener("pointerup", handleVelocityPointerUp);
  velocityGrid.addEventListener("pointercancel", handleVelocityPointerUp);
}

function quantizeNotes() {
  const track = currentTrack();
  const targets = selectedNotes().length ? selectedNotes() : track.notes;
  if (!targets.length) { editorStatus.textContent = "There are no notes to quantize on this channel."; return; }
  const unit = gridUnit();
  const changes = targets.some(note => {
    const start = clamp(Math.round(note.start / unit) * unit, 0, sectionSpan() - note.duration);
    const duration = clamp(Math.round(note.duration / unit) * unit, unit, sectionSpan() - start);
    return note.start !== start || note.duration !== duration;
  });
  if (!changes) { editorStatus.textContent = "These notes already align to the current snap grid."; return; }
  rememberEdit();
  targets.forEach(note => {
    note.start = clamp(roundToPrecision(Math.round(note.start / unit) * unit), 0, sectionSpan() - note.duration);
    note.duration = clamp(roundToPrecision(Math.round(note.duration / unit) * unit), unit, sectionSpan() - note.start);
  });
  sortNotes(track);
  renderTimeline();
}

function changeSelectedLength(direction) {
  const targets = selectedNotes();
  if (!targets.length) { editorStatus.textContent = "Select one or more notes before changing their length."; return; }
  const unit = gridUnit();
  const changes = targets.some(note => {
    const next = clamp(roundToPrecision(note.duration + direction * unit), unit, sectionSpan() - note.start);
    return next !== note.duration;
  });
  if (!changes) return;
  rememberEdit();
  targets.forEach(note => { note.duration = clamp(roundToPrecision(note.duration + direction * unit), unit, sectionSpan() - note.start); });
  renderTimeline();
}

function deleteSelectedNotes() {
  if (!selectedNoteIds.size) return;
  rememberEdit();
  currentTrack().notes = currentTrack().notes.filter(note => !selectedNoteIds.has(note.id));
  selectedNoteIds = new Set();
  renderTimeline();
}

function nudgeSelected(deltaTime, deltaPitch) {
  const targets = selectedNotes();
  if (!targets.length) return;
  const changes = targets.some(note => {
    const start = clamp(roundToPrecision(note.start + deltaTime), 0, sectionSpan() - note.duration);
    const pitch = clamp(note.pitch + deltaPitch, 0, 127);
    return note.start !== start || note.pitch !== pitch;
  });
  if (!changes) return;
  rememberEdit();
  targets.forEach(note => {
    note.start = clamp(roundToPrecision(note.start + deltaTime), 0, sectionSpan() - note.duration);
    note.pitch = clamp(note.pitch + deltaPitch, 0, 127);
  });
  sortNotes(currentTrack());
  renderTimeline();
}

function readU32(bytes, index) { return ((bytes[index] << 24) >>> 0) + (bytes[index + 1] << 16) + (bytes[index + 2] << 8) + bytes[index + 3]; }

function readVlq(bytes, index, limit = bytes.length) {
  let value = 0;
  let byte = 0;
  do {
    if (index >= limit) throw new Error("Unexpected end of MIDI data");
    byte = bytes[index++];
    value = (value << 7) | (byte & 127);
  } while (byte & 128);
  return { value, index };
}

function channelDataLength(status) { const type = status & 240; return type === 192 || type === 208 ? 1 : 2; }

function setImportFeedback(state, message) {
  importStatus.dataset.state = state;
  importStatus.textContent = message;
}

function describeDetectedChannels(channelStats) {
  const detected = channelStats.filter(stat => stat.matched).map(stat => `MIDI channel ${stat.channel + 1} (${stat.matched} ${stat.matched === 1 ? "note" : "notes"})`);
  return detected.length ? detected.join(", ") : "none";
}

function parseMidi(bytes) {
  if (bytes.length < 14 || String.fromCharCode(...bytes.slice(0, 4)) !== "MThd") throw new Error("This is not a Standard MIDI file (MThd header is missing).");
  const headerLength = readU32(bytes, 4);
  const format = (bytes[8] << 8) | bytes[9];
  const trackCount = (bytes[10] << 8) | bytes[11];
  const ppq = (bytes[12] << 8) | bytes[13];
  if (headerLength < 6 || 8 + headerLength > bytes.length) throw new Error("The MIDI header is incomplete.");
  if (format !== 0 && format !== 1) throw new Error(`MIDI format ${format} is not supported; use format 0 or 1.`);
  if (!ppq || ppq & 0x8000) throw new Error("SMPTE-timed MIDI files are not supported.");
  let position = 8 + headerLength;
  const events = [];
  let order = 0;
  let tempoValue = null;
  let noteOnEvents = 0;
  let noteOffEvents = 0;
  const channelStats = Array.from({ length: 16 }, (_, channel) => ({ channel, noteOn: 0, noteOff: 0, matched: 0 }));

  for (let track = 0; track < trackCount; track += 1) {
    if (position + 8 > bytes.length || String.fromCharCode(...bytes.slice(position, position + 4)) !== "MTrk") throw new Error(`MIDI track ${track + 1} is missing or corrupt.`);
    const end = position + 8 + readU32(bytes, position + 4);
    let cursor = position + 8;
    let tick = 0;
    let running = 0;
    if (end > bytes.length) throw new Error(`MIDI track ${track + 1} is truncated.`);
    while (cursor < end) {
      const delta = readVlq(bytes, cursor, end);
      tick += delta.value;
      cursor = delta.index;
      if (cursor >= end) throw new Error(`MIDI track ${track + 1} ends before an event status.`);
      let status = bytes[cursor++];
      if (status < 128) {
        if (!running) throw new Error("Invalid running status in MIDI data.");
        cursor -= 1;
        status = running;
      } else if (status < 240) {
        running = status;
      }
      if (status === 255) {
        if (cursor >= end) throw new Error(`MIDI track ${track + 1} has a truncated meta event.`);
        const type = bytes[cursor++];
        const length = readVlq(bytes, cursor, end);
        cursor = length.index;
        if (cursor + length.value > end) throw new Error(`MIDI track ${track + 1} has a truncated meta event.`);
        if (type === 81 && length.value === 3 && tempoValue === null) tempoValue = (bytes[cursor] << 16) | (bytes[cursor + 1] << 8) | bytes[cursor + 2];
        cursor += length.value;
        continue;
      }
      if (status === 240 || status === 247) {
        const length = readVlq(bytes, cursor, end);
        cursor = length.index;
        if (cursor + length.value > end) throw new Error(`MIDI track ${track + 1} has truncated SysEx data.`);
        cursor += length.value;
        continue;
      }
      if (status < 128 || status > 239) throw new Error("Unsupported MIDI event in source file.");
      const dataLength = channelDataLength(status);
      if (cursor + dataLength > end) throw new Error(`MIDI track ${track + 1} has a truncated channel event.`);
      const data1 = bytes[cursor++];
      const data2 = dataLength === 2 ? bytes[cursor++] : 0;
      const type = status & 240;
      const channel = status & 15;
      if (type === 144 && data2 > 0) {
        noteOnEvents += 1;
        channelStats[channel].noteOn += 1;
        events.push({ tick, channel, pitch: data1, velocity: data2, on: true, order: order++ });
      } else if (type === 128 || (type === 144 && data2 === 0)) {
        noteOffEvents += 1;
        channelStats[channel].noteOff += 1;
        events.push({ tick, channel, pitch: data1, velocity: 0, on: false, order: order++ });
      }
    }
    position = end;
  }

  events.sort((a, b) => a.tick - b.tick || (a.on === b.on ? a.order - b.order : a.on ? 1 : -1));
  const open = new Map();
  const notes = [];
  events.forEach(event => {
    const key = `${event.channel}:${event.pitch}`;
    const stack = open.get(key) || [];
    if (event.on) {
      stack.push(event);
      open.set(key, stack);
    } else if (stack.length) {
      const start = stack.shift();
      if (!stack.length) open.delete(key);
      if (event.tick > start.tick) {
        channelStats[event.channel].matched += 1;
        notes.push({ channel: event.channel, pitch: event.pitch, velocity: start.velocity, start: start.tick / ppq, duration: (event.tick - start.tick) / ppq });
      }
    }
  });
  let unmatchedNoteOnEvents = 0;
  open.forEach(stack => { unmatchedNoteOnEvents += stack.length; });
  return { format, ppq, trackCount, tempo: tempoValue ? Math.round(60000000 / tempoValue) : null, notes, noteOnEvents, noteOffEvents, unmatchedNoteOnEvents, channelStats };
}

function importMidi(file) {
  setImportFeedback("pending", `Reading ${file.name}...`);
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = parseMidi(new Uint8Array(reader.result));
      const track = currentTrack();
      const sourceChannel = Number(sourceChannelSelect.value);
      const sourceNotes = parsed.notes.filter(note => note.channel === sourceChannel);
      const sourceLabel = `MIDI channel ${sourceChannel + 1}`;
      const details = `format ${parsed.format}, PPQ ${parsed.ppq}, ${parsed.trackCount} ${parsed.trackCount === 1 ? "track" : "tracks"}`;
      if (!parsed.noteOnEvents && !parsed.noteOffEvents) {
        setImportFeedback("warning", `No playable notes found in ${file.name}. It has ${parsed.trackCount} ${parsed.trackCount === 1 ? "track" : "tracks"}, but only metadata such as tempo, time signature, or track names. Export the actual piano roll or score MIDI, then import that file.`);
        return;
      }
      if (!parsed.notes.length) {
        setImportFeedback("warning", `No complete note pairs found in ${file.name} (${parsed.noteOnEvents} Note On, ${parsed.noteOffEvents} Note Off). Export the complete score MIDI with note lengths, then try again.`);
        return;
      }
      if (!sourceNotes.length) {
        setImportFeedback("warning", `No playable notes found on ${sourceLabel} in ${file.name}. Detected: ${describeDetectedChannels(parsed.channelStats)}. Select a detected source channel, then import again.`);
        return;
      }
      const incoming = sourceNotes.filter(note => note.start < sectionSpan()).map(note => normalizeNote({ ...note, id: makeNoteId(), start: roundToPrecision(note.start), duration: Math.max(1 / 96, roundToPrecision(note.duration)) }));
      if (!incoming.length) {
        setImportFeedback("warning", `${file.name} has ${sourceNotes.length} ${sourceNotes.length === 1 ? "note" : "notes"} on ${sourceLabel}, but none begin within the current ${BAR_COUNT}-bar section. Choose 2 or 4 bars, then import again.`);
        return;
      }
      rememberEdit();
      if (replaceTargetCheck.checked) track.notes = [];
      track.notes.push(...incoming);
      sortNotes(track);
      selectedNoteIds = new Set(incoming.map(note => note.id));
      if (parsed.tempo) {
        project.tempo = parsed.tempo;
        tempo.value = parsed.tempo;
      }
      setImportFeedback("success", `Imported ${incoming.length} ${incoming.length === 1 ? "note" : "notes"} from ${file.name}: ${sourceLabel} into ${trackDisplay(track.id)} in ${sectionDetails()[1]} (${details}).`);
      renderControls();
    } catch (error) {
      setImportFeedback("error", `Could not import ${file.name}: ${error.message}`);
    }
  };
  reader.onerror = () => setImportFeedback("error", `Could not read ${file.name}. Try exporting the MIDI file again.`);
  reader.readAsArrayBuffer(file);
}

function clearTargetTrack() {
  const track = currentTrack();
  if (!track.notes.length) { setImportFeedback("warning", `${trackDisplay(track.id)} is already empty.`); return; }
  rememberEdit();
  track.notes = [];
  selectedNoteIds = new Set();
  setImportFeedback("success", `Cleared ${trackDisplay(track.id)} in ${sectionDetails()[1]}.`);
  renderControls();
}

function clearCurrentSection() {
  const tracks = activeTracks();
  if (!tracks.some(track => track.notes.length)) { setImportFeedback("warning", `${sectionDetails()[1]} is already empty.`); return; }
  rememberEdit();
  tracks.forEach(track => { track.notes = []; });
  selectedNoteIds = new Set();
  setImportFeedback("success", `Cleared all ${tracks.length} active tracks in ${sectionDetails()[1]}.`);
  renderControls();
}

function saveTimeline() {
  project.name = styleName.value || "Timeline Style";
  project.tempo = Number(tempo.value) || 120;
  downloadBlob(JSON.stringify(project, null, 2), `${safeName(project.name)}.timeline.json`, "application/json");
}

function loadTimeline(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      project = JSON.parse(reader.result);
      selectedNoteIds = new Set();
      undoStack.length = 0;
      redoStack.length = 0;
      migrateTimelineProject();
      setImportFeedback("success", `Timeline project ${file.name} loaded.`);
      renderControls();
    } catch {
      setImportFeedback("error", `Could not load ${file.name} as a timeline JSON project.`);
    }
  };
  reader.onerror = () => setImportFeedback("error", `Could not read ${file.name}.`);
  reader.readAsText(file);
}

function setBars(value) {
  if (value === BAR_COUNT) return;
  rememberEdit();
  BAR_COUNT = value;
  project.barCount = value;
  Object.values(project.sections).forEach(section => {
    section.tracks.forEach(track => {
      track.notes = track.notes.map(note => normalizeNote(note)).filter(note => note.start < sectionSpan());
      sortNotes(track);
    });
  });
  selectedNoteIds = new Set();
  renderControls();
}

function bindStaticControls() {
  document.querySelectorAll("[data-editor-tool]").forEach(button => { button.onclick = () => setEditorTool(button.dataset.editorTool); });
  quantizeButton.onclick = quantizeNotes;
  shortenButton.onclick = () => changeSelectedLength(-1);
  lengthenButton.onclick = () => changeSelectedLength(1);
  deleteButton.onclick = deleteSelectedNotes;
  undoButton.onclick = undoEdit;
  redoButton.onclick = redoEdit;
  snapSelect.onchange = updateEditorControls;
  keyboardSelect.onchange = () => {
    project.keyboard = keyboardSelect.value;
    sourceChannelSelect.dataset.userSelected = "";
    selectedNoteIds = new Set();
    renderControls();
  };
  sectionSelect.onchange = () => { selectedNoteIds = new Set(); renderControls(); };
  barsSelect.onchange = () => setBars(Number(barsSelect.value));
  targetTrackSelect.onchange = () => {
    sourceChannelSelect.value = String(currentTrack().midiChannel);
    sourceChannelSelect.dataset.userSelected = "";
    selectedNoteIds = new Set();
    renderControls();
  };
  sourceChannelSelect.onchange = () => { sourceChannelSelect.dataset.userSelected = "true"; };
  styleName.oninput = () => { project.name = styleName.value; };
  tempo.oninput = () => { project.tempo = Number(tempo.value) || 120; };
  midiImportInput.onchange = event => {
    const file = event.target.files[0];
    if (file) importMidi(file);
    event.target.value = "";
  };
  document.getElementById("clearTrackBtn").onclick = clearTargetTrack;
  document.getElementById("clearSectionBtn").onclick = clearCurrentSection;
  document.getElementById("saveTimelineBtn").onclick = saveTimeline;
  loadTimelineInput.onchange = event => {
    const file = event.target.files[0];
    if (file) loadTimeline(file);
    event.target.value = "";
  };
  document.addEventListener("keydown", event => {
    if (event.target.matches("input, select, textarea, button")) return;
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === "z") {
      event.preventDefault();
      if (event.shiftKey) redoEdit(); else undoEdit();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === "y") { event.preventDefault(); redoEdit(); return; }
    if ((event.ctrlKey || event.metaKey) && key === "a") { event.preventDefault(); setSelected(currentTrack().notes.map(note => note.id)); return; }
    if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); deleteSelectedNotes(); return; }
    if (event.key === "ArrowLeft") { event.preventDefault(); nudgeSelected(-gridUnit(), 0); return; }
    if (event.key === "ArrowRight") { event.preventDefault(); nudgeSelected(gridUnit(), 0); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); nudgeSelected(0, 1); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); nudgeSelected(0, -1); return; }
    if (key === "v") setEditorTool("select");
    if (key === "d") setEditorTool("draw");
    if (key === "s") setEditorTool("slice");
  });
}

bindStaticControls();
renderControls();
