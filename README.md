# StyleForge Lite

Mobile-first Yamaha-style pattern sketchpad and experimental `.sty` exporter.

Current app version: **v1.2.0 experimental**

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
- Template-based experimental STY export
- Built-in Yamaha official `template.MID` export mode
- Uploaded working `.sty` skeleton export mode
- Project tempo overwrite during STY export
- Export status/debug line showing note counts after STY export

## STY export modes

### 1. Official Yamaha Template mode

This mode uses the official Yamaha `template.MID` internally.

It does not require the user to upload a `.sty` skeleton.

This is cleaner and closer to Yamaha's documented old workflow: fill a template MIDI file, then export/rename it as a style.

This mode is still experimental and needs hardware testing.

### 2. Uploaded STY Skeleton mode

This mode uses a known-working Yamaha `.sty` file as a hard skeleton and swaps MIDI note data into that template.

This preserves the uploaded template's Yamaha-specific structure such as CASM/style metadata while replacing musical pattern data.

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
- Uploaded skeleton mode depends heavily on the loaded template's internal structure.
- Official template mode may need extra Yamaha style metadata for newer models.

## Recent version notes

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

### v1.1.x

- Added STY template loading.
- Added hard skeleton export mode.
- Added project tempo overwrite.
- Added visible template filename/status.
- Added separate PSR-E Fill B→A editor.

### v1.0.x

- Added PSR-E Series keyboard profile.
- Added experimental STY export attempts.
- Added full-project export fixes.

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
- Test official Yamaha template mode on real hardware.
- Keep uploaded skeleton mode as fallback for stricter keyboards.
- Gradually replace template dependency with cleaner generated style chunks later.
