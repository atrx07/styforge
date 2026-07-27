# StyleForge Lite Project Brief

## Product Vision

StyleForge Lite is a mobile-first web app for creating accompaniment styles for
Yamaha arranger keyboards. A musician should be able to sketch drums, bass,
chords, pads, and phrases in a browser, hear the pattern, save the project, and
export a style file that can be loaded by a supported keyboard.

The long-term product promise is direct, dependable `.STY` creation without
requiring a working Yamaha style file as an imported skeleton.

## Primary Audience

- Yamaha PSR-E owners who want a simple style creator.
- Musicians working from phones, tablets, or low-power computers.
- Developers and testers investigating Yamaha SFF1 and CASM behavior.

The PSR-E Series profile is the primary compatibility target. PSR-SX600 and
Generic XG support are secondary and should not weaken PSR-E behavior.

## Product Principles

- Start in the editor, not on a marketing page.
- Make the common pattern-building workflow comfortable on a phone.
- Keep projects portable and understandable.
- Keep exports deterministic: the same project and mode should produce the same
  musical data.
- Preserve proven Yamaha structure whenever possible.
- Separate verified behavior from reverse-engineered assumptions.
- Add complexity only when it improves editing or keyboard compatibility.

## Core Capabilities

The app is expected to provide:

- Style settings: name, tempo, one, two, or four bars, keyboard profile, and
  section.
- Drum-grid editing for rhythm tracks.
- Piano-roll editing for bass, chord, pad, and phrase tracks.
- Note pitch, start, duration, and velocity data.
- In-browser WebAudio preview for sketching.
- JSON save and load.
- Standard MIDI export for a section or selected track.
- Yamaha `.STY` export through a built-in PSR-E mapping.
- Uploaded working `.STY` skeleton export as a compatibility fallback.

## Yamaha Export Strategy

StyleForge uses two complementary export paths.

### Built-in PSR-E Mapping

The app generates its own SFF1-oriented MIDI track and CASM data. This is the
main product direction because it removes the dependency on a user-supplied
style. The generated file uses MIDI format 0, PPQ 192, Yamaha markers and setup
events, section text events, and channel tables for the supported tracks.

### Uploaded STY Skeleton

The app accepts a working Yamaha style, removes its old note events, and injects
project notes while preserving setup events and its CASM tail. This mode is a
fallback and a research tool for keyboards or styles whose internal rules differ
from the built-in mapping.

## Scope Boundaries

StyleForge Lite is intentionally:

- A static frontend with no backend or account system.
- A pattern and style editor, not a full digital audio workstation.
- A simple WebAudio preview, not a Yamaha sound-engine emulator.
- Focused on SFF1 and current target keyboards before broader SFF2 support.

Out of scope for the current phase:

- Cloud project storage or collaboration.
- Sample recording or audio-file export.
- Exact reproduction of Yamaha voices in the browser.
- Guaranteed compatibility with every Yamaha arranger model.
- A framework migration or mandatory build toolchain.

## Success Criteria

The project reaches its primary goal when:

- A new user can create and recover a project without data loss.
- All supported PSR-E tracks and sections can be authored in the browser.
- Built-in export loads and plays the intended parts on the target PSR-E
  hardware without importing a skeleton.
- Chord-following behavior is correct for bass, chord, pad, and phrase parts.
- Fill, intro, main, and ending transitions trigger the intended section data.
- Export structure is covered by repeatable automated checks.
- Hardware results are recorded across a useful keyboard compatibility matrix.

## Delivery Constraints

- Plain HTML, CSS, and JavaScript.
- No required installation or compile step.
- Static-host compatible, including Cloudflare Pages.
- Local development through `python -m http.server 8080`.
- Client-side processing only; project and imported style data stay in the
  browser.

Roadmap progress and verification checkpoints are tracked in `STATUS.md`.
Implementation boundaries and data flow are documented in `ARCHITECTURE.md`.

