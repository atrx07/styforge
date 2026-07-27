# StyleForge Lite

StyleForge Lite is a static, mobile-first Yamaha arranger style sketchpad. It lets you build simple drum and accompaniment patterns in the browser, preview them with WebAudio, save/load projects as JSON, export MIDI, and experiment with Yamaha `.STY` style export for PSR-E and related arranger keyboards.

Current app version: **v1.2.2 experimental**

## Quick Start

Run from the project folder with any static file server:

```bash
python -m http.server 8080
```

Open:

```text
http://127.0.0.1:8080
```

No backend, package install, or build step is required. The app is designed for static hosts such as Cloudflare Pages.

## Main Files

- `index.html` - app shell and controls
- `styles.css` - main mobile-first layout and visual styling
- `bass-fix.css` - targeted editor styling fixes
- `app.js` - project model, sequencer UI, preview audio, JSON, and MIDI export
- `sty-export.js` - experimental Yamaha `.STY` export logic
- `data/voices/psr-sx600.json` - voice list
- `data/drum-maps/yamaha-xg.json` - Yamaha/XG drum map data

## Project Documentation

- [`PROJECT.md`](PROJECT.md) - product vision, scope, and success criteria
- [`ARCHITECTURE.md`](ARCHITECTURE.md) - runtime, data model, and export design
- [`STATUS.md`](STATUS.md) - roadmap checkpoints and verification status
- [`AGENTS.md`](AGENTS.md) - contributor, testing, Git, and validation rules

## What Works

- Mobile-friendly sequencer UI
- Drum grid editor
- Piano-roll editor for bass, chords, pad, and phrase tracks
- 1, 2, or 4 bar pattern lengths
- Style name, tempo, keyboard profile, and section selection
- Project save/load as JSON
- In-browser WebAudio preview
- MIDI export for the whole section or selected track
- Experimental Yamaha `.STY` export

## Keyboard Profiles

### PSR-E Series

Primary target profile.

Tracks:

- Drums
- Bass
- Chords 1
- Chords 2
- Pad
- Phrases

Sections:

- Main A
- Main B
- Fill A to B
- Fill B to A
- Intro A
- Ending A

### PSR-SX600 / Generic XG

Broader arranger-style profile for testing.

Tracks:

- Rhythm 1
- Rhythm 2
- Bass
- Chord 1
- Chord 2
- Pad
- Phrase 1
- Phrase 2

Sections:

- Main A, B, C, D
- Fill A, B, C, D
- Intro A, B, C
- Ending A, B, C

## Export Modes

### MIDI Export

MIDI export is the simple and stable path. It writes either:

- the current section, or
- the selected track

This is useful for checking note data in a DAW or another MIDI utility.

### Built-in PSR-E Mapping

This is the default `.STY` export path.

The browser generates a PSR-E oriented SFF1 style base with:

- MIDI format 0
- PPQ 192
- SFF1 and SInt markers
- PSR-E A/B section markers
- `fn:` section text events
- Yamaha/XG setup events
- generated CASM data

StyleForge maps PSR-E tracks to MIDI channels like this:

- Drums -> MIDI channel 10
- Bass -> MIDI channel 11
- Chords 1 -> MIDI channel 12
- Chords 2 -> MIDI channel 13
- Pad -> MIDI channel 14
- Phrases -> MIDI channel 15

Recent hardware testing showed this built-in path can produce a smaller `.STY` file where all StyleForge channels play.

### Uploaded STY Skeleton

This fallback mode uses a known-working Yamaha `.STY` file as the style skeleton.

The exporter removes old note events and injects StyleForge notes while preserving:

- program changes
- bank select
- control changes
- SysEx/setup events
- markers
- `fn:` text events
- the original CASM tail

This mode is useful because it preserves a real Yamaha style structure. It also follows that skeleton's CASM channel rules. If the normal StyleForge channel is not exposed for a section, the exporter remaps the notes to a valid section Ctab and reports the remap in the export status line.

## Yamaha STY Notes

Yamaha `.STY` export is still experimental. The important discovery so far is that simple MIDI markers are not enough.

Working PSR-E style files usually contain:

- MIDI format 0
- PPQ 192
- Yamaha section markers
- `fn:` text events
- setup/controller/program events
- a CASM chunk after `MTrk`

CASM is the important "style brain." It describes which channels belong to which sections and how those channels respond to chord changes.

## Known Limitations

- Yamaha style validation is strict and model-dependent.
- Built-in CASM is reverse engineered and still needs more hardware testing.
- Uploaded skeleton exports depend on the skeleton's internal CASM mapping.
- Some skeletons may force remaps or shared section parts when they expose fewer usable Ctabs than StyleForge tracks.
- WebAudio preview is only a sketching aid and may behave differently across browsers, especially on iPhone.
- Exported `.STY` files should be tested on real hardware.

## Typical Workflow

1. Open StyleForge Lite.
2. Pick the PSR-E Series profile.
3. Choose a section such as Main A or Main B.
4. Add drum and accompaniment notes.
5. Preview in the browser.
6. Save the project as JSON when needed.
7. Export MIDI for inspection or `.STY` for keyboard testing.

For uploaded skeleton testing:

1. Choose **Uploaded STY Skeleton** mode.
2. Load a known-working `.STY` file such as a PSR-E style.
3. Export and test on hardware.
4. Check the export status line for CASM channel remaps before testing on hardware.

## Recent Version Notes

### v1.2.2

- Added CASM-aware channel injection for uploaded skeleton mode.
- Uploaded skeleton exports now prefer the normal StyleForge channel, then remap notes to a valid section Ctab when the skeleton does not expose that channel.
- Preserved the uploaded skeleton CASM tail byte-for-byte; only injected note channels are adjusted.
- Added export debug text for channel remaps such as `Phrases ch15->5`.

### v1.2.1

- Removed the failed official MIDI-template export path.
- Added a generated built-in PSR-E mapping export path.
- Added generated PSR-E SFF1 markers, `fn:` text events, setup events, and CASM channel mapping.
- Changed exporter to preserve non-note setup events and strip only old note events.
- Aligned the built-in PSR-E CASM with the lean two-CSEG structure seen in working PSR-E styles, including both Yamaha rhythm channels.
- Cleaned up the STY mode value so the UI uses `builtin-psre` directly; the old `official` value remains accepted as a compatibility alias.
- Kept uploaded `.STY` mode as fallback.

### v1.2.0

- Added two STY export modes:
  - Official Yamaha Template
  - Uploaded STY Skeleton
- Embedded the Yamaha official `template.MID` as a built-in export base.
- Added SX/Generic A/B/C/D section editor support.
- Added SX/Generic Intro B/C and Ending B/C sections.

### v1.1.9

- Added robust PSR-E fill slot export.
- Fill A to B is injected into `Fill In AA` and `Fill In AB` when present.
- Fill B to A is injected into `Fill In BA` and `Fill In BB` when present.
- Added export debug counts in the template status area.

## Project Direction

- Keep the app mobile-first and static-host friendly.
- Improve generated PSR-E `.STY` export until it no longer needs a user-supplied skeleton.
- Keep uploaded skeleton mode as a fallback for stricter keyboards.
- Replace reverse-engineered assumptions with verified behavior from working Yamaha style files and hardware tests.
