# StyleForge Lite

Mobile-first Yamaha-style pattern sketchpad and experimental `.sty` exporter.

Current app version: **v1.2.1 experimental**

StyleForge Lite started as a phone-friendly MIDI/style sequencer and is currently focused on Yamaha arranger-style experiments, especially PSR-E and PSR-SX style workflows.

## What works right now

- Mobile-friendly sequencer UI
- Drum grid editor
- Piano-roll style editor for melodic tracks
- 1, 2, or 4 bar project lengths
- Project save/load as JSON
- MIDI export
- Keyboard profiles:
  - PSR-E Series
  - PSR-SX600
  - Generic XG
- PSR-E Series track layout:
  - Drums
  - Bass
  - Chords 1
  - Chords 2
  - Pad
  - Phrases
- PSR-SX600 / Generic XG track layout:
  - Rhythm 1
  - Rhythm 2
  - Bass
  - Chord 1
  - Chord 2
  - Pad
  - Phrase 1
  - Phrase 2
- PSR-E section layout:
  - Main A
  - Main B
  - Fill A→B
  - Fill B→A
  - Intro A
  - Ending A
- PSR-SX / Generic section layout:
  - Main A, B, C, D
  - Fill A, B, C, D
  - Intro A, B, C
  - Ending A, B, C
- Built-in PSR-E export base
- Uploaded working `.sty` fallback mode
- Project tempo overwrite during STY export
- Export status/debug line showing note counts after STY export

## STY export modes

### 1. Built-in PSR-E Mapping

This is now the default mode.

It generates a PSR-E oriented SFF1 style base directly inside the browser with:

- PPQ 192
- SFF1 and SInt markers
- PSR-E A/B section map
- `fn:` section text events
- a generated CASM channel map
- Yamaha/XG setup events

StyleForge maps tracks like this:

- Drums → MIDI channel 10
- Bass → MIDI channel 11
- Chords 1 → MIDI channel 12
- Chords 2 → MIDI channel 13
- Pad → MIDI channel 14
- Phrases → MIDI channel 15

This avoids needing to import PIANOBAL or another working file every time.

This mode still needs real PSR-E hardware testing.

### 2. Uploaded STY Skeleton mode

This remains as fallback.

It uses a known-working Yamaha `.sty` file and swaps only note data while preserving setup events, section markers, and the original style tail.

Typical flow:

1. Open StyleForge Lite.
2. Choose **Uploaded STY Skeleton** mode.
3. Load a known-working `.sty` file as template.
4. Build patterns in StyleForge.
5. Export STY.
6. Test on keyboard.

## Important experimental notes

This project is still in active reverse-engineering / trial-and-error mode.

Known rough edges:

- Yamaha `.sty` internals are picky.
- Some templates may behave differently depending on their section markers.
- PSR-E and PSR-SX models may validate styles differently.
- iPhone WebAudio preview may be unreliable.
- Exported STY files should be tested on real hardware.
- Built-in mode may still need tuning if PSR-E rejects the generated CASM.
- Uploaded skeleton mode depends heavily on the loaded template's internal structure.

## Recent version notes

### v1.2.1

- Removed the failed official MIDI-template export path.
- Added a generated built-in PSR-E mapping export path.
- Added generated PSR-E SFF1 markers, `fn:` text events, setup events, and CASM channel mapping.
- Changed exporter to preserve non-note setup events and strip only old note events.
- Kept uploaded `.sty` mode as fallback.

### v1.2.0

- Added two STY export modes:
  - Official Yamaha Template
  - Uploaded STY Skeleton
- Embedded the Yamaha official `template.MID` as a built-in export base.
- Added SX/Generic A/B/C/D section editor support.
- Added SX/Generic Intro B/C and Ending B/C sections.

### v1.1.9

- Added robust PSR-E fill slot export.
- Fill A→B is injected into `Fill In AA` and `Fill In AB` when present.
- Fill B→A is injected into `Fill In BA` and `Fill In BB` when present.
- Added export debug counts in the template status area.

## Run locally

This is a static site. Any simple local web server works.

```bash
python -m http.server 8080
```

Then open:

```text
http://127.0.0.1:8080
```

## Deployment

The project is designed to work on static hosting such as Cloudflare Pages.

No backend is required for the current workflow.

## Project status

Experimental but promising.

The current direction is:

- Keep the UI mobile-first.
- Test built-in PSR-E mapping mode on real hardware.
- Keep uploaded skeleton mode as fallback for stricter keyboards.
- Gradually replace reverse-engineered assumptions with verified Yamaha behavior.
