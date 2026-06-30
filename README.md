# StyleForge Lite

Mobile-first Yamaha-style pattern sketchpad and experimental `.sty` exporter.

Current app version: **v1.1.9 experimental**

StyleForge Lite started as a phone-friendly MIDI/style sequencer and is currently focused on Yamaha arranger-style experiments, especially PSR-E style workflows.

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
- Template-based experimental STY export
- Project tempo overwrite during STY export
- Separate Fill A→B and Fill B→A editor sections
- Experimental PSR-E fill slot export:
  - Fill A→B exports to AA/AB slots
  - Fill B→A exports to BA/BB slots
- Export status/debug line showing note counts after STY export

## Hard skeleton STY mode

The current `.sty` exporter does **not** generate a Yamaha style fully from scratch.

Instead, it uses a known-working Yamaha `.sty` file as a hard skeleton and swaps MIDI note data into that template.

Typical flow:

1. Open StyleForge Lite.
2. Load a known-working `.sty` file as template.
3. Build patterns in StyleForge.
4. Export STY.
5. Test on keyboard.

This preserves the template's Yamaha-specific structure such as CASM/style metadata while replacing the musical pattern data.

## Important experimental notes

This project is still in active reverse-engineering / trial-and-error mode.

Known rough edges:

- Yamaha `.sty` internals are picky.
- Some templates may behave differently depending on their section markers.
- PSR-E and PSR-SX models may validate styles differently.
- iPhone WebAudio preview may be unreliable.
- Exported STY files should be tested on real hardware.
- The exporter currently depends heavily on the loaded template's internal structure.

## Recent version notes

### v1.1.9

- Added robust PSR-E fill slot export.
- Fill A→B is injected into `Fill In AA` and `Fill In AB`.
- Fill B→A is injected into `Fill In BA` and `Fill In BB`.
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

No backend is required for the current stripped-down workflow.

## Project status

Experimental but promising.

The current direction is:

- Keep the UI mobile-first.
- Use template-based STY generation until enough Yamaha internals are understood.
- Gradually replace template dependency with cleaner generated style chunks later.
