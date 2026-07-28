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
  |
  +-- timeline.html
        +-- timeline.js
        |     +-- standalone timeline project model
        |     +-- Standard MIDI parser and channel importer
        |     +-- PSR-E / PSR-SX600 routing UI
        +-- sty-export.js (shared built-in STY exporter)
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
| `timeline.html` | Separate MIDI Timeline Import workflow |
| `timeline.js` | Timeline state, MIDI parsing, channel import, and rendering |
| `timeline.css` | Responsive timeline layout |
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

The broader SX/Generic profile exposes both rhythm and phrase tracks. The
built-in exporter supports PSR-E and experimental PSR-SX600 generation.
PSR-SX600 can also use an uploaded SFF2 Yamaha `.sty` or `.prs` base, whose
section-specific `Ctb2` entries determine the channels available for injection.

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

For PSR-SX600 uploaded SFF2 bases, the export plan uses these marker slots:

| Project section | Yamaha marker slot |
| --- | --- |
| Main A-D | `Main A` through `Main D` |
| Fill A-D | `Fill In AA`, `Fill In BB`, `Fill In CC`, `Fill In DD` |
| Fill B compatibility slot | `Fill In BA` when present |
| Intro A-C | `Intro A` through `Intro C` |
| Ending A-C | `Ending A` through `Ending C` |

## MIDI Export

Standard MIDI export is implemented in `app.js`. It converts project timing to
MIDI ticks, writes note events and track metadata, and downloads either the
current section or selected track. This path is independent of Yamaha CASM.

## MIDI Timeline Import

`timeline.html` intentionally does not load `app.js`; it owns a compatible
project object so the original prototype can remain stable. It defines the
shared exporter globals required by `sty-export.js`: `project`, `BAR_COUNT`,
`activeTracks()`, `tempoBytes()`, `safeName()`, and `downloadBlob()`.

The MIDI parser supports standard PPQ-timed format-0 and format-1 files. It
merges Note On/Off events across source tracks, pairs notes by MIDI channel and
pitch, and imports one user-selected source channel into the selected project
section and target track. The target profile supplies the fixed output channel
and section-to-marker mapping; the source channel is never assumed to be the
same as the Yamaha output channel.

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

### Built-in PSR-SX600 Export Flow

1. `buildBuiltInSxBase()` creates a format-0 SFF2 base at PPQ 1920.
2. It adds Main A-D, Fill AA/BB/CC/DD and BA, Intro A-C, Ending A-C, and
   matching `fn:` marker text.
3. `buildSxCasm()` generates three `CSEG` groups with eight 47-byte `Ctb2`
   records each: two rhythm, bass, two chord, pad, and two phrase channels.
4. The common parser removes the empty base's old notes, injects the project
   notes, rebuilds `MTrk`, and appends the generated CASM tail.

This flow is based on inspected SX structure, not SX hardware proof.

### Uploaded Skeleton Flow

1. The browser reads the supplied file as bytes.
2. The parser locates `MThd`, `MTrk`, marker ranges, and the tail after MTrk.
3. CASM `CSEG`/`Sdec`/`Ctab` or SFF2 `Ctb2` entries are read into a
   section-to-channel map.
4. Only Note On and Note Off events are filtered from the original MTrk.
5. All other MIDI, meta, SysEx, controller, voice, and setup events are kept.
6. Project tracks prefer their normal channels, then remap to valid section
   Ctabs when necessary.
7. The MTrk is rebuilt and the original tail is appended byte-for-byte.

The export status reports marker coverage, note counts, and channel remaps.
For PSR-SX600, the base must be SFF2, have `Ctb2` tables, and include the full
Main A-D, Fill AA/BB/CC/DD, Intro A-C, and Ending A-C marker surface.

## Important Invariants

- `index.html` must load `app.js` before `sty-export.js`.
- Script cache-busting versions must match an intentional release version.
- Yamaha marker spelling and `fn:` labels are binary-format inputs.
- A note channel must be represented by the relevant CASM section.
- PSR-SX600 channel decisions come from `Ctb2`, not assumed channel numbers.
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

