# StyleForge Lite Status

Current checkpoint: **v1.5.3 experimental**

Last reviewed: **2026-07-29**

## Marking Guide

- `[x]` Complete and verified at the stated level.
- `[~]` Implemented or demonstrated, with more verification needed.
- `[ ]` Planned.
- `[!]` Blocked by a known dependency or missing evidence.

Hardware verification is marked separately from code completion. A structurally
valid file is not automatically a keyboard-compatible file.

## Maintenance Rule

Every repository change must update this file in the same atomic commit. Update
the affected checkpoint when its state changes; otherwise add a dated entry to
the change log below.

## Change Log

### 2026-07-29

- [x] Added MIDI sequencer section preview with all active channels, optional
  looping, WebAudio drum and melodic voices, transport status, and a
  synchronized piano-roll and velocity-lane playhead.
- [x] Browser-checked empty-section feedback, active loop playback, manual
  stop, single-pass completion, playback cancellation on section changes, a
  390 px mobile transport layout, desktop layout, and the browser console.
- [x] Replaced the MIDI sequence page's decorative multi-track note overview
  with one editable piano roll for the selected target channel.
- [x] Added note selection, drawing, movement, resizing, slicing, quantizing,
  length changes, deletion, velocity-lane editing, keyboard nudging, and
  bounded undo/redo history to timeline projects.
- [x] Kept PSR-E and PSR-SX600 section, channel, and export mappings separate;
  the piano-roll editor changes only project note data consumed by the existing
  exporter.
- [x] Browser-checked desktop authoring (draw, resize, move, slice, undo/redo,
  and velocity edits), the PSR-SX600 profile (14 sections and eight channels),
  and a 390 px mobile layout. The mobile grid, ruler, keys, and note geometry
  align without page-level horizontal overflow; no browser console errors were
  reported.

### 2026-07-28

- [x] Added a dedicated home page with clear routes to the prototype editor and
  MIDI sequence workspace; moved the original editor shell to `prototype.html`.
- [x] Rebuilt the shared desktop and mobile visual system for the home,
  prototype, and MIDI sequence pages without changing Yamaha export behavior.
- [x] Made the prototype track picker keyboard-accessible with semantic button
  controls while preserving its existing selection behavior.
- [x] Browser-smoke-tested the isolated local workspace at desktop and 390 px
  mobile widths: all three pages had no page-level horizontal overflow or
  console errors; home navigation, prototype demo loading, and PSR-SX600
  profile switching worked. SX correctly exposed 14 sections and eight tracks
  in both editing workflows.
- [x] Diagnosed the supplied `mainA.mid` as a valid format-1 container with
  timing and track-name metadata but no Note On/Off events; added explicit
  timeline import diagnostics for that case and other empty-import causes.
- [x] Parser-checked the captured `mainA.mid` structure (format 1, PPQ 96,
  three tracks, zero notes) and a synthetic format-0 drum Note On/Off pair.
- [x] Added a separate MIDI Timeline Import page; the original editor remains
  the prototype page.
- [x] Added channel-specific MIDI note import into the selected PSR-E or
  PSR-SX600 section and target track.
- [x] Connected timeline projects directly to the built-in PSR-E and PSR-SX600
  style exporters without a skeleton upload.
- [x] Browser smoke-tested a synthetic format-0, PPQ-480 MIDI import from
  source channel 3, then switched to the SX profile and generated a built-in
  SX export with no console errors at desktop and 375 px mobile widths.
- [x] Added a generated PSR-SX600 SFF2 export mode that requires no uploaded
  skeleton.
- [x] Generate a PPQ-1920 format-0 `MTrk`, SX section markers and matching
  `fn:` text, plus a three-`CSEG` CASM tail with 24 `Ctb2` channel tables.
- [~] Generated PSR-SX600 exports pass structural checks only. No SX keyboard
  hardware load or playback result has been recorded.

### 2026-07-27

- [x] Added contributor, product, architecture, and roadmap documentation.
- [x] Changed the repository workflow to verified commits and pushes directly
  on `main`.
- [x] Made a `STATUS.md` update mandatory for every repository change.
- [x] Inspected two user-provided PSR-SX SFF2 sources locally; both use PPQ
  1920, `Ctb2` CASM tables, four main/fill slots, and three intro/ending slots.
- [x] Added PSR-SX600 uploaded SFF2 `.sty`/`.prs` export support, including
  `Ctb2` channel mapping and SX marker validation.
- [~] PSR-SX600 export has structural reference-file validation only; hardware
  loading, transitions, and chord behaviour have not yet been tested.

## Product Checkpoints

### 1. Static App Foundation

- [x] Runs from a static file server with no build step.
- [x] Mobile-first application shell and controls.
- [x] PSR-E and SX/Generic profile selectors.
- [x] One, two, and four bar project lengths.
- [x] Cloudflare Pages-compatible project shape.

### 2. Pattern Editing

- [x] Drum-grid editing.
- [x] Piano-roll editing for melodic parts.
- [x] Section and track selection.
- [x] Pitch, start, duration, and velocity project data.
- [x] Basic voice selection.
- [~] Cross-browser and small-screen interaction matrix.
- [ ] Editing ergonomics pass for dense four-bar patterns.

### 3. Project And Preview

- [x] JSON project save.
- [x] JSON project load and migration of missing fields.
- [x] WebAudio drum and melodic preview.
- [x] Play and stop scheduling.
- [~] iPhone audio-start and sustained-session reliability.
- [ ] Automated JSON round-trip tests.

### 4. Standard MIDI Export

- [x] Whole-section MIDI export.
- [x] Selected-track MIDI export.
- [~] Repeatable parser-based validation of emitted files.
- [ ] Automated timing, channel, and end-of-track fixture tests.

### 5. MIDI Timeline Import

- [x] Separate static timeline page linked from the prototype editor.
- [x] Select PSR-E or PSR-SX600 profiles with their distinct tracks, MIDI
  channels, sections, and Yamaha marker mapping.
- [x] Import Note On/Off MIDI data from one selected source MIDI channel into
  the selected section and target track.
- [x] Preserve imported timing in quarter-note project units, clip it to the
  selected one-, two-, or four-bar section, and show it in a track timeline.
- [x] Save and reload timeline projects as JSON.
- [~] Validate imports against a wider collection of type-0 and type-1 MIDI
  files, especially overlapping same-pitch notes.

### 6. Uploaded Yamaha Skeleton Export

- [x] Load a working `.STY` or MIDI-style base in the browser.
- [x] Remove old Note On and Note Off events only.
- [x] Preserve setup, controller, program, SysEx, marker, and text events.
- [x] Preserve the original CASM tail byte-for-byte.
- [x] Read section Ctabs and remap injected tracks to available channels.
- [x] Report channel remaps in the export status.
- [x] Read SFF2 `Ctb2` channel tables from uploaded PSR-SX `.sty` and `.prs`
  bases.
- [x] Validate the PSR-SX600 SFF2 marker surface before export: Main A-D,
  Fill AA/BB/CC/DD, Intro A-C, and Ending A-C.
- [~] Verify behavior against a wider range of legally usable style samples.
- [~] Confirm all StyleForge parts across multiple PSR-E keyboard models.

Known result: a PIANOBAL-derived uploaded export loaded and played, but its
phrase availability depended on the skeleton's CASM channel coverage. The
CASM-aware remapping code addresses this class of mismatch; broader hardware
verification remains open.

### 7. PSR-SX600 SFF2 Export

- [x] PSR-SX600 editor profile exposes two rhythm, bass, two chord, pad, and
  two phrase tracks.
- [x] PSR-SX600 editor profile exposes Main A-D, Fill A-D, Intro A-C, and
  Ending A-C.
- [x] Uploaded SFF2 `.sty` and `.prs` bases preserve their non-MIDI tail,
  including `CASM`, `OTSc`, and later chunks byte-for-byte.
- [x] Generate a standalone SFF2 base with all eight SX StyleForge tracks on
  `Ctb2`-described channels.
- [x] Generate Main A-D, Fill AA/BB/CC/DD and BA, Intro A-C, and Ending A-C
  marker regions from the sequencer without an uploaded base.
- [~] Map authored SX tracks onto each section's available `Ctb2` channels and
  report any remap.
- [!] No PSR-SX hardware load, playback, transition, or chord-following result
  has been recorded yet.

### 8. Built-in PSR-E Export

- [x] Generate MIDI format 0 with PPQ 192.
- [x] Generate one MTrk with SFF1 and SInt markers.
- [x] Generate PSR-E section markers and matching `fn:` text.
- [x] Generate Yamaha/XG setup, controller, bank, and program events.
- [x] Generate CASM with CSEG, Sdec, and Ctab chunks.
- [x] Describe both Yamaha rhythm channels and StyleForge accompaniment parts.
- [x] Inject all six PSR-E StyleForge tracks on CASM-described channels.
- [x] Hardware proof: a built-in export loaded with all authored channels
  working in the reported PSR-E test.
- [~] Verify chord-following behavior across chord types and inversions.
- [~] Verify every main, fill, intro, and ending transition on hardware.
- [~] Repeat tests on multiple PSR-E models and firmware versions.
- [ ] Replace reverse-engineered Ctab assumptions with documented fixture tests.

### 9. Quality And Release Readiness

- [x] Contributor workflow and architecture documentation.
- [ ] Automated binary parser/export test harness.
- [ ] Synthetic, redistributable SFF1/CASM fixtures.
- [ ] Browser smoke-test checklist or automation.
- [ ] Hardware compatibility result template and test matrix.
- [ ] User-facing export diagnostics beyond the current status line.
- [ ] Versioned release checklist.

## Roadmap

### Milestone A: Reliable PSR-E Core

Status: `[~]`

Exit criteria:

- Built-in export works across the supported sections and six track roles.
- Bass, chord, pad, and phrase parts follow common chord types correctly.
- Binary structure has automated regression coverage.
- Results are recorded on more than one PSR-E model.

### Milestone B: Editing Confidence

Status: `[~]`

Exit criteria:

- JSON round trips and MIDI export have automated checks.
- Four-bar editing is practical on phone and desktop.
- Preview start/stop is reliable on current mobile browsers.
- Error states for loading and exporting are clear.

### Milestone C: Broader Yamaha Compatibility

Status: `[~]`

Exit criteria:

- PSR-SX600 SFF2 section and `Ctb2` channel behavior is specified from
  legally usable evidence and verified on hardware.
- SFF1/SFF2 scope is decided from inspected files and target hardware.
- Additional keyboard profiles have fixtures and hardware results.
- Model-specific behavior is represented explicitly rather than guessed.

### Milestone D: Stable Lite Release

Status: `[ ]`

Exit criteria:

- Primary PSR-E workflow has no known data-loss or silent-export failures.
- Compatibility claims match the recorded hardware matrix.
- Static deployment, documentation, and release checks are repeatable.
- Experimental labels are removed only for the verified support surface.

## Next Verified Successes

Keep these tasks atomic and update the markings after each verified result:

1. Add a small Node-compatible structural validator for exported MIDI/STY bytes.
2. Add synthetic fixtures for marker parsing, note-only removal, and CASM-tail
   preservation.
3. Record built-in export tests for Main A, Main B, both fills, Intro A, and
   Ending A on the current PSR-E test keyboard.
4. Test major, minor, seventh, and common inversion behavior for each melodic
   part.
5. Create a hardware matrix containing keyboard model, firmware when known,
   export mode, section, track, chord behavior, and result.
6. Load an SX project through each supplied SFF2 base and record the actual
   PSR-SX model, sections, channel remaps, playback, and chord result.

## Checkpoint Update Template

Use this block when recording a compatibility result:

```text
Date:
App commit/version:
Keyboard model:
Firmware:
Export mode:
Source project or synthetic fixture:
Sections tested:
Tracks tested:
Chord types tested:
Result:
Observed limitations:
```
