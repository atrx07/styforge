# StyleForge Lite Contributor Guide

This file defines the working rules for people and coding agents changing this
repository. It applies to the entire project.

## Mission

StyleForge Lite is a static, browser-based arranger style editor. Its primary
goal is to create Yamaha-compatible style files for PSR-E keyboards while
remaining useful as a lightweight pattern sketchpad.

Protect these project qualities:

- Mobile-first and usable in a normal browser.
- No backend, account, or required build step.
- Deployable as static files, including on Cloudflare Pages.
- Project data remains portable through JSON.
- Yamaha export behavior is based on inspected files and hardware evidence.

Prefer focused changes that fit the current plain HTML, CSS, and JavaScript
architecture. Do not rewrite the app or add a framework unless a requirement
cannot be met reasonably with the existing structure.

## Branch And Push Rules

All work must be performed directly on `main`.

Before editing:

1. Run `git branch --show-current`.
2. Run `git fetch origin`.
3. Switch to `main` if necessary.
4. Run `git pull --ff-only origin main`.
5. Confirm the worktree state with `git status --short --branch`.

Do not create or use another branch unless the user explicitly asks for one.
Commit verified changes directly to `main` and push only to `origin main`.

## Atomic Verified Successes

Treat each independently useful, verified result as one atomic change:

1. Make one logically focused change.
2. Run the checks appropriate to that change.
3. Review `git diff` and confirm no unrelated files are included.
4. Commit only that verified change with a specific message.
5. Include the corresponding `STATUS.md` update in the same commit.
6. Push the commit immediately to `origin main`.

Do not hold several unrelated successful changes for one large commit or push.
Do not commit a known failing state. If work is incomplete, keep it uncommitted
until it passes its relevant checks.

Documentation-only changes may be one atomic commit after link, spelling, and
accuracy checks. A code change and the documentation that describes that same
behavior may share one commit.

## Required Checks

There is currently no package manager, build pipeline, or formal test runner.
For every JavaScript change, run at minimum:

```powershell
node --check app.js
node --check sty-export.js
```

If `node` is not on `PATH`, use an available Node.js executable and record that
in the pull request.

Serve the app for browser checks:

```powershell
python -m http.server 8080
```

Then verify the changed workflow at `http://127.0.0.1:8080`. Check the browser
console for errors. UI changes must be inspected at mobile and desktop widths,
with special attention to overflow, touch targets, and editor usability.

Run the relevant manual checks for the affected area:

- Project model: save JSON, reload it, and compare settings, sections, tracks,
  and notes.
- Sequencer: add, remove, and edit notes across supported bar counts.
- Preview: start, stop, change sections, and confirm scheduled audio stops.
- MIDI: export both a whole section and a selected track, then inspect or load
  the files in a MIDI-aware tool.
- STY: perform the structural checks below and test on target hardware whenever
  compatibility behavior changed.

Record checks actually run. Never describe a check as passing when it was
skipped or could not be performed.

## Yamaha STY Validation

Yamaha compatibility is the highest-risk part of the project. Changes to
`sty-export.js` require deliberate binary validation.

For built-in PSR-E exports, verify:

- MIDI header is format 0 with one `MTrk` and PPQ 192.
- Track and chunk lengths match the emitted byte counts.
- `SFF1`, `SInt`, section markers, and matching `fn:` text events are present.
- Yamaha/XG setup, bank, program, and controller events remain present.
- The MIDI track ends correctly before the CASM data.
- The CASM chunk contains valid `CSEG`, `Sdec`, and `Ctab` structures.
- Every injected channel is described by the relevant section's CASM data.

For uploaded skeleton exports, also verify:

- Only Note On and Note Off channel events from the skeleton are removed.
- Program changes, bank select, control changes, SysEx, meta events, markers,
  and `fn:` events are preserved.
- The original tail, including CASM, is preserved byte-for-byte.
- Injected notes use channels available in the section's Ctab entries.
- Any fallback channel remap is reported in the export status.

Software inspection proves structure, not keyboard compatibility. Do not claim
that an export works on Yamaha hardware without recording a real hardware test,
keyboard model, export mode, and result.

Do not commit third-party or keyboard-derived `.STY` fixtures unless their
redistribution rights are clear. Prefer synthetic fixtures for automated tests.

## Implementation Conventions

- Keep runtime code compatible with direct browser loading.
- Use browser platform APIs before adding dependencies.
- Preserve the project schema or add migration logic for schema changes.
- Keep Yamaha channel numbers explicit: JavaScript channels are zero-based,
  while user-facing MIDI channels are one-based.
- Preserve unknown MIDI, SysEx, meta, and CASM bytes unless a change explicitly
  requires rewriting them.
- Keep section marker labels exact; Yamaha names are part of the file format.
- Avoid unrelated formatting or minification churn in focused changes.
- Add comments only where binary layout or timing logic is not self-evident.

## Version And Documentation Discipline

For every change:

- Update the visible version and cache-busting query strings together when a
  release version is intentionally advanced.
- Keep `README.md`, `PROJECT.md`, `ARCHITECTURE.md`, and `STATUS.md` consistent
  with the implementation.
- Update `STATUS.md` in the same atomic commit. Mark the affected checkpoint or
  add a dated change-log entry when no roadmap checkbox changes.
- Include hardware evidence in `STATUS.md` when applicable.
- Explain binary format assumptions and compatibility tradeoffs in the commit
  message or accompanying documentation.
