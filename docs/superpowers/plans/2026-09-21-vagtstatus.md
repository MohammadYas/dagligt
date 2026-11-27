# VagtStatus implementation plan

Goal: Deliver the approved responsive Apple Dark app with Vagter and Rute.
Architecture: Pure file codecs and a per-file draft session shared across navigation; existing Dropbox proxy; React Native Web controls with semantic dark tokens.
Spec: ../specs/2026-09-21-vagtstatus-apple-dark-redesign.md

## Constraints and corrections

- The wire protocol is `TØRN: ON/OFF`, never `TOERN`.
- Manual Gem/Annuller supersedes original autosave request.
- Keep existing user data and unrelated faktura-pilot.pdf untouched.
- Do not write test data to live Dropbox. Use isolated local fixtures for UI verification.
- Browser/PWA is the accepted target. No native SwiftUI rewrite.

## Tasks

- [x] SDK: Expo 57 versions installed; dependency check and TypeScript pass.
- [x] File formats: pure codecs and behavioral tests cover exact protocols and validation.
- [x] Draft session: retained edits, partial checkpoints, conflict preflight, late refresh protection and retry recovery tested.
- [x] Transport: control-file allowlist, read-only status protection and one 401 retry; isolated web transport.
- [x] UI foundation: two tabs, safe areas, semantic dark palette, large whole-row switches, focus and fixed save area. Existing type scale reused.
- [x] Vagter: status, wishes, priorities, pairs, notifications and sickness information integrated.
- [x] Rute: responsive layout, move controls, stale-result guard and preserved navigation state.
- [x] PWA: Danish title, black appearance, single zoomable viewport, responsive viewport height and safe areas.
- [x] Local verification: 21 automated tests, TypeScript, SDK check, web export, secret scan and browser workflows. Details in ../../../DESIGN.md.
- [ ] Device/release verification: physical iPhone, VoiceOver, large text/200% zoom, keyboard/home-indicator and live push. Not available in this environment. No deployment or signed IPA performed.

## Review checkpoints

Each data task has meaningful behavioral tests before integration. UI uses existing primitives and a single semantic palette. No live mutation is required for verification. Final review checks file paths, TØRN spelling, partial-save handling, browser back, all hidden old tabs and retained data.
