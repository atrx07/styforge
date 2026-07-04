let STYLE_TEMPLATE_BYTES = null;
let LAST_EXPORT_DEBUG = "";

const OFFICIAL_YAMAHA_TEMPLATE_B64 = "TVRoZAAAAAYAAAABAeBNVHJrAAAA+QD/BgRTRkYxAP8DCFRlbXBsYXRlAP9YBAQCGAgA/1EDB6EgAP8GBFNJbnQA8AV+fwkB948A/wYGTWFpbiBBngD/BgpGaWxsIEluIEFBjwD/BgdJbnRybyBBngD/BghFbmRpbmcgQZ4A/wYGTWFpbiBCngD/BgpGaWxsIEluIEJBjwD/BgpGaWxsIEluIEJCjwD/BgdJbnRybyBCngD/BghFbmRpbmcgQp4A/wYGTWFpbiBDngD/BgpGaWxsIEluIENDjwD/BgdJbnRybyBDngD/BghFbmRpbmcgQ54A/wYGTWFpbiBEngD/BgpGaWxsIEluIEREAP8vAA==";

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function getStyleExportMode() {
  const el = document.getElementById("styExportMode");
  return el ? el.value : "uploaded";
}

function styleSectionName(id) {
  return ({
    mainA: "Main A",
    mainB: "Main B",
    mainC: "Main C",
    mainD: "Main D",
    fillA: "Fill In AA",
    fillAB: "Fill In AB",
    fillB: "Fill In BB",
    fillBA: "Fill In BA",
    fillBB: "Fill In BB",
    fillC: "Fill In CC",
    fillD: "Fill In DD",
    introA: "Intro A",
    introB: "Intro B",
    introC: "Intro C",
    endingA: "Ending A",
    endingB: "Ending B",
    endingC: "Ending C"
  }[id] || id);
}

function bytesText(a) {
  let s = "";
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return s;
}

function readU32(a, i) {
  return ((a[i] << 24) >>> 0) + (a[i + 1] << 16) + (a[i + 2] << 8) + a[i + 3];
}

function readVar(a, i) {
  let v = 0, b = 0;
  do {
    b = a[i++];
    v = (v << 7) + (b & 127);
  } while ((b & 128) && i < a.length);
  return { v, i };
}

function putStatus(msg) {
  const el = document.getElementById("templateStatus");
  if (el) el.textContent = msg;
  else console.log(msg);
}

function chanDataLen(status) {
  const h = status & 240;
  return (h === 192 || h === 208) ? 1 : 2;
}

function findMTrk(a) {
  for (let i = 0; i < a.length - 4; i++) {
    if (a[i] === 77 && a[i + 1] === 84 && a[i + 2] === 114 && a[i + 3] === 107) return i;
  }
  return -1;
}

function parseTrack(a, start, end) {
  let i = start, tick = 0, run = 0;
  const out = [];
  while (i < end) {
    const r = readVar(a, i);
    tick += r.v;
    i = r.i;
    let status = a[i++];
    if (status < 128) {
      i--;
      status = run;
    } else if (status < 240) {
      run = status;
    }

    if (status === 255) {
      const type = a[i++];
      const l = readVar(a, i);
      i = l.i;
      const data = Array.from(a.slice(i, i + l.v));
      i += l.v;
      out.push({ tick, kind: "meta", type, data, bytes: [255, type, ...varLen(data.length), ...data] });
      if (type === 47) break;
    } else if (status === 240 || status === 247) {
      const l = readVar(a, i);
      i = l.i;
      const data = Array.from(a.slice(i, i + l.v));
      i += l.v;
      out.push({ tick, kind: "sys", bytes: [status, ...varLen(data.length), ...data] });
    } else if (status > 0) {
      const n = chanDataLen(status);
      const data = Array.from(a.slice(i, i + n));
      i += n;
      out.push({ tick, kind: "midi", status, bytes: [status, ...data] });
    } else {
      break;
    }
  }
  return out;
}

function findTemplateParts(bytes) {
  const a = Array.from(bytes);
  if (bytesText(a.slice(0, 4)) !== "MThd") throw new Error("Template is not MIDI/STY");
  const ppq = (a[12] << 8) + a[13];
  const m = findMTrk(a);
  if (m < 0) throw new Error("Template has no MTrk");
  const len = readU32(a, m + 4);
  const start = m + 8;
  const end = start + len;
  return { a, ppq, trackStart: start, tail: a.slice(end), events: parseTrack(a, start, end) };
}

function markerInfo(events) {
  const markers = [];
  for (const e of events) {
    if (e.kind === "meta" && e.type === 6) {
      markers.push({ label: bytesText(e.data), tick: e.tick });
    }
  }
  markers.sort((a, b) => a.tick - b.tick);
  const last = events.reduce((m, e) => Math.max(m, e.tick), 0);
  const map = {};
  for (let i = 0; i < markers.length; i++) {
    const next = i < markers.length - 1 ? markers[i + 1].tick : last;
    if (!map[markers[i].label]) {
      map[markers[i].label] = {
        start: markers[i].tick,
        end: next,
        span: Math.max(1, next - markers[i].tick)
      };
    }
  }
  return map;
}

function fallbackSlotInfo(label, ppq) {
  return { start: 0, end: ppq * 4, span: ppq * 4, missing: true, label };
}

function infoForSlot(info, label, ppq) {
  return info[label] || null;
}

function tempoMeta() {
  return [255, 81, 3, ...tempoBytes(Number(project.tempo) || 120)];
}

function normalizedKeepEvent(e) {
  if (e.kind === "meta" && e.type === 81) return { tick: e.tick, bytes: tempoMeta() };
  return { tick: e.tick, bytes: e.bytes };
}

function exportPlan() {
  if (project.keyboard === "PSR-E Series") {
    return [
      { src: "introA", slots: ["Intro A"] },
      { src: "mainA", slots: ["Main A"] },
      { src: "mainB", slots: ["Main B"] },
      { src: "fillA", slots: ["Fill In AA", "Fill In AB"] },
      { src: "fillBA", slots: ["Fill In BA", "Fill In BB"] },
      { src: "endingA", slots: ["Ending A"] }
    ];
  }

  return [
    { src: "introA", slots: ["Intro A"] },
    { src: "introB", slots: ["Intro B"] },
    { src: "introC", slots: ["Intro C"] },
    { src: "mainA", slots: ["Main A"] },
    { src: "mainB", slots: ["Main B"] },
    { src: "mainC", slots: ["Main C"] },
    { src: "mainD", slots: ["Main D"] },
    { src: "fillA", slots: ["Fill In AA", "Fill In AB"] },
    { src: "fillB", slots: ["Fill In BA", "Fill In BB"] },
    { src: "fillC", slots: ["Fill In CC"] },
    { src: "fillD", slots: ["Fill In DD"] },
    { src: "endingA", slots: ["Ending A"] },
    { src: "endingB", slots: ["Ending B"] },
    { src: "endingC", slots: ["Ending C"] }
  ];
}

function trackLabel(tr) {
  return ({
    rhythm1: "Drums",
    rhythm2: "Rhythm2",
    bass: "Bass",
    chord1: "Chords1",
    chord2: "Chords2",
    pad: "Pad",
    phrase1: "Phrases",
    phrase2: "Phrase2"
  }[tr.id] || tr.id);
}

function injectSectionNotes(ppq, slot, src, info, ev, debugLines) {
  const sec = project.sections[src];
  if (!sec) return;
  const si = infoForSlot(info, slot, ppq);
  if (!si) {
    debugLines.push(`${slot}←${src}:missing-marker`);
    return;
  }

  const projectSpan = Math.max(1, ppq * 4 * BAR_COUNT);
  const repeats = Math.max(1, Math.ceil(si.span / projectSpan));
  const tracks = (typeof activeTracks === "function") ? activeTracks(sec) : sec.tracks;
  const counts = {};

  for (let r = 0; r < repeats; r++) {
    const off = si.start + r * projectSpan;
    for (const tr of tracks) {
      counts[trackLabel(tr)] = (counts[trackLabel(tr)] || 0) + tr.notes.length;
      for (const n of tr.notes) {
        const local = Math.round(n.start * ppq);
        if (local >= projectSpan) continue;
        const ch = tr.midiChannel || 9;
        const t = off + local;
        let d = Math.round((n.duration || 0.25) * ppq);
        if (t >= si.end) continue;
        if (t + d > si.end) d = Math.max(1, si.end - t);
        ev.push({ tick: t, bytes: [192 + ch, 0] });
        ev.push({ tick: t, bytes: [144 + ch, n.pitch, n.velocity || 100] });
        ev.push({ tick: t + d, bytes: [128 + ch, n.pitch, 0] });
      }
    }
  }

  debugLines.push(`${slot}←${src} ` + Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(","));
}

function projectMidiEvents(ppq, info) {
  const ev = [];
  const debugLines = [];
  for (const item of exportPlan()) {
    for (const slot of item.slots) injectSectionNotes(ppq, slot, item.src, info, ev, debugLines);
  }
  LAST_EXPORT_DEBUG = "Export: " + debugLines.join(" | ");
  return ev;
}

function rebuildTrack(events) {
  events.sort((a, b) => a.tick - b.tick);
  const bytes = [];
  let last = 0;
  for (const e of events) {
    bytes.push(...varLen(Math.max(0, e.tick - last)));
    for (const b of e.bytes) bytes.push(b);
    last = e.tick;
  }
  return bytes;
}

function u32bytes(n) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
}

function templateSummary(bytes, name) {
  try {
    const p = findTemplateParts(bytes);
    const info = markerInfo(p.events);
    const labels = Object.keys(info).filter(x => x !== "SFF1" && x !== "SInt");
    const bits = labels.map(label => {
      const bars = Math.max(1, Math.round(info[label].span / (p.ppq * 4)));
      return `${label}:${bars}`;
    });
    putStatus(`Template: ${name} • ${bits.join(" • ")}`);
  } catch (e) {
    putStatus("Template loaded, but summary failed: " + e.message);
  }
}

function selectedTemplateBytes() {
  const mode = getStyleExportMode();
  if (mode === "official") return b64ToBytes(OFFICIAL_YAMAHA_TEMPLATE_B64);
  if (!STYLE_TEMPLATE_BYTES) throw new Error("Load a working STY skeleton first, or switch STY mode to Official Yamaha Template.");
  return STYLE_TEMPLATE_BYTES;
}

function injectIntoTemplate() {
  project.name = styleName.value || "Untitled Style";
  project.tempo = Number(tempo.value) || 120;

  const bytes = selectedTemplateBytes();
  const p = findTemplateParts(bytes);
  const info = markerInfo(p.events);
  const keep = p.events
    .filter(e => e.kind !== "midi" && !(e.kind === "meta" && e.type === 47))
    .map(normalizedKeepEvent);

  const endTick = p.events.reduce((m, e) => Math.max(m, e.tick), 0);
  const all = keep.concat(projectMidiEvents(p.ppq, info)).concat([{ tick: endTick, bytes: [255, 47, 0] }]);
  const trk = rebuildTrack(all);
  return new Uint8Array(p.a.slice(0, p.trackStart - 4).concat(u32bytes(trk.length), trk, p.tail));
}

function buildExperimentalStyleBytes() {
  return injectIntoTemplate();
}

function exportExperimentalStyle() {
  try {
    const sty = buildExperimentalStyleBytes();
    const mode = getStyleExportMode() === "official" ? "official-template" : "uploaded-skeleton";
    downloadBlob(sty, `${safeName(project.name)}-${mode}.sty`, "application/octet-stream");
    putStatus(LAST_EXPORT_DEBUG);
  } catch (e) {
    alert("STY export failed: " + e.message);
    putStatus("STY export failed: " + e.message);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  putStatus("STY exporter ready. Choose official template or load a skeleton.");

  const btn = document.getElementById("exportStyleBtn");
  if (btn) btn.onclick = exportExperimentalStyle;

  const mode = document.getElementById("styExportMode");
  if (mode) {
    mode.onchange = () => {
      if (mode.value === "official") templateSummary(b64ToBytes(OFFICIAL_YAMAHA_TEMPLATE_B64), "Built-in Yamaha template.MID");
      else putStatus(STYLE_TEMPLATE_BYTES ? "Uploaded skeleton ready." : "Uploaded skeleton mode: load a working .sty template.");
    };
  }

  const input = document.getElementById("templateStyleInput");
  if (input) input.onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      STYLE_TEMPLATE_BYTES = new Uint8Array(r.result);
      templateSummary(STYLE_TEMPLATE_BYTES, f.name);
      alert("STY skeleton loaded: " + f.name);
    };
    r.onerror = () => putStatus("Template load failed");
    r.readAsArrayBuffer(f);
  };

  templateSummary(b64ToBytes(OFFICIAL_YAMAHA_TEMPLATE_B64), "Built-in Yamaha template.MID");
});
