# StyleForge Lite Architecture

## System Shape

StyleForge Lite is a client-only application. The browser loads static HTML,
CSS, JavaScript, and JSON assets. There is no server API, database, package
manager, bundler, or generated build output.

```text
index.html
  |
  +-- styles.css + bass-fix.css
  +-- app.js
  |     +-- project model
  |     +-- sequencer UI
  |     +-- WebAudio preview
  |     +-- JSON and MIDI I/O
  |     +-- data/*.json
  |
  +-- sty-export.js
        +-- built-in PSR-E base
        +-- MIDI/STY parser and rewriter
        +-- CASM generation and inspection
        +-- browser download
```

`sty-export.js` loads after `app.js` and intentionally uses shared runtime
state and helpers such as `project`, `BAR_COUNT`, `activeTracks`,
`tempoBytes`, `safeName`, and `downloadBlob`.

## File Responsibilities

| File | Responsibility |
| --- | --- |
| `index.html` | App shell, controls, script order, and cache-busting versions |
| `styles.css` | Main mobile-first layout and component styling |
| `bass-fix.css` | Focused editor layout corrections |
| `app.js` | Profiles, project state, rendering, editing, preview, JSON, and MIDI |
| `sty-export.js` | Experimental Yamaha SFF1/CASM export |
| `data/voices/psr-sx600.json` | Voice choices used by the inspector |
| `data/drum-maps/yamaha-xg.json` | Yamaha/XG drum note metadata |

## Project Model

The in-memory project is plain JSON-compatible data:

```text
project
  name
  tempo
  bars
  keyboard
  sections
    <section id>
      tracks[]
        id
        name
        midiChannel
        voice
        notes[]
          pitch
          start
          duration
          velocity
```

Note start and duration are expressed in quarter-note units. The editor uses 16
steps per four-beat bar. Projects include all known section IDs; the selected
keyboard profile controls which sections and tracks are visible.

`migrateProject()` fills missing sections and track properties when older JSON
projects are loaded. Schema changes must preserve this migration path.

## Runtime Flow

At startup, `init()` loads voice data, binds DOM events, migrates the default
project, and renders the active profile.

Editing follows a direct state-and-render model:

1. A grid or inspector action changes the in-memory `project`.
2. `renderAll()` refreshes selectors, track list, editor, and inspector.
3. Save and export actions read the current project directly.

WebAudio preview schedules notes ahead in short intervals. It approximates
instrument roles with browser oscillators and synthesized drum sounds; it does
not model Yamaha voices or arranger chord rules.

## Profiles And Channels

The PSR-E profile exposes six StyleForge tracks:

| Track | JavaScript channel | MIDI channel | Built-in CASM role |
| --- | ---: | ---: | --- |
| Drums | 9 | 10 | Rhythm |
| Bass | 10 | 11 | Bass |
| Chords 1 | 11 | 12 | Chord |
| Chords 2 | 12 | 13 | Chord |
| Pad | 13 | 14 | Chord/pad |
| Phrases | 14 | 15 | Phrase |

The generated base also defines JavaScript channel 8, MIDI channel 9, as an
additional rhythm part. Remember that source code channels are zero-based while
MIDI channel labels are one-based.

The broader SX/Generic profile exposes both rhythm and phrase tracks, but the
built-in exporter currently accepts only the PSR-E profile. SX/Generic STY
experiments use uploaded skeleton mode.

## Section Mapping

Project sections are injected into Yamaha marker slots:

| Project section | Yamaha marker slot |
| --- | --- |
| Main A | `Main A` |
| Main B | `Main B` |
| Fill A to B | `Fill In AA`, `Fill In AB` |
| Fill B to A | `Fill In BA`, `Fill In BB` |
| Intro A | `Intro A` |
| Ending A | `Ending A` |

The built-in base also carries Intro B and Ending B marker regions so its
structure stays close to the inspected PSR-E style layout.

## MIDI Export

Standard MIDI export is implemented in `app.js`. It converts project timing to
MIDI ticks, writes note events and track metadata, and downloads either the
current section or selected track. This path is independent of Yamaha CASM.

## STY Container Model

The current exporter treats a compatible style as:

```text
MThd (format 0, one track, PPQ)
MTrk (markers, setup, voices, notes, end-of-track)
CASM
  CSEG
    Sdec (section labels)
    Ctab (channel behavior)
```

The CASM tail is outside the MIDI `MTrk`. Chunk sizes and event delta times must
be rebuilt whenever note events change.

### Built-in Export Flow

1. `buildBuiltInPsrEBase()` creates a format-0, PPQ-192 base.
2. It adds SFF1/SInt markers, Yamaha/XG setup, section markers, `fn:` text,
   controller events, and program selections.
3. `buildPsrECasm()` creates main/fill and intro/ending CSEG groups with Ctabs.
4. The common parser locates marker time ranges and reads the CASM section map.
5. Existing notes are removed, project notes are injected, and the MTrk is
   rebuilt.
6. The generated CASM tail is appended to the rebuilt track.

### Uploaded Skeleton Flow

1. The browser reads the supplied file as bytes.
2. The parser locates `MThd`, `MTrk`, marker ranges, and the tail after MTrk.
3. CASM CSEG/Sdec/Ctab entries are read into a section-to-channel map.
4. Only Note On and Note Off events are filtered from the original MTrk.
5. All other MIDI, meta, SysEx, controller, voice, and setup events are kept.
6. Project tracks prefer their normal channels, then remap to valid section
   Ctabs when necessary.
7. The MTrk is rebuilt and the original tail is appended byte-for-byte.

The export status reports marker coverage, note counts, and channel remaps.

## Important Invariants

- `index.html` must load `app.js` before `sty-export.js`.
- Script cache-busting versions must match an intentional release version.
- Yamaha marker spelling and `fn:` labels are binary-format inputs.
- A note channel must be represented by the relevant CASM section.
- The uploaded skeleton tail must not be normalized or regenerated.
- Unknown setup and metadata should survive uploaded-skeleton export.
- End-of-track belongs inside `MTrk`; CASM begins after the MTrk bytes.
- Hardware compatibility claims require hardware results.

## Testing Boundaries

Syntax checks catch JavaScript parsing errors. Browser tests cover state, UI,
download, and WebAudio behavior. Binary fixture checks should cover MIDI event
parsing, chunk lengths, marker ranges, note-only stripping, and CASM
preservation. Only a Yamaha keyboard can verify arranger playback,
chord-following, and model compatibility.

The current lack of an automated binary test harness is tracked in `STATUS.md`.

