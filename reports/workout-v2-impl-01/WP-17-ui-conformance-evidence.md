# WP-17 UI conformance evidence

- Decision: `EXTEND` the existing platform Button, MentorStage, and shell view-model composition; no parallel visual kit was introduced.
- Composition: INTRO secondary controls and cue presentation are adapter-fed and remain outside orchestration ownership; result state suppresses active-session controls and implementation-facing outcome summary.
- Localization/theme/responsive: existing EN/FA message and token paths remain in use; targeted UI tests cover both locales and the protected composition structure.
- Validation: `node --import tsx --test --test-concurrency=1 tests/workout-v2-first-slice.test.tsx tests/workout-v2-run1-ui.test.tsx` PASS.
