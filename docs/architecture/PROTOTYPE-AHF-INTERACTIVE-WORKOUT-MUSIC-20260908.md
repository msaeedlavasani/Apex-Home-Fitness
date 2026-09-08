# AHF Interactive Workout + Music UX Prototype (2026-09-08)

> **Type:** exploratory Product/UX prototype
> **Status:** DELIVERED as an isolated static prototype
> **Scope:** no Product replacement, no Production deployment, no data/camera persistence
> **UI decision:** `REUSE` principles only; isolated prototype styling mirrors Apex semantic tokens and platform behavior without creating a production UI kit

## Location

`scripts/interactive-workout-prototype/index.html`

Run:

```bash
python3 -m http.server 4177 --directory scripts/interactive-workout-prototype
```

Open `http://localhost:4177` or `http://<LAN-IP>:4177` on a phone on the same
network.

## Interaction coverage

- immersive active workout mode separate from the normal App Shell;
- Prepare → Work → Rest → Transition → next exercise automatic flow;
- center-stage Mentor + simulated Ghost Skeleton;
- compact HUD timer rather than central timer hero;
- quiet transient coaching;
- automatic Adaptive Compare presentation and collapse;
- calm Rest interval with late next-movement preview;
- Pause/Resume, Skip, correction, End;
- Music during pre-workout and active workout;
- orbital/rotary-dial drag interaction, not a horizontal carousel;
- playlist detail, Now Playing, Create Workout Mix;
- simulated audio ducking preview;
- seamless return to active workout;
- portrait-first and deliberate landscape layouts;
- Light/Dark and English/Persian RTL switching.

## Isolation and boundaries

- no import from or replacement of `WorkoutPlayer`;
- no browser camera, MoveNet, CP-04 consent state, or CP-07 runtime call;
- pose/camera data is simulated only;
- no persistence/history/retention/database/network/credentials;
- no legal/Production decision;
- no Product route or app-shell modification.

## Validation

A local Playwright smoke check passed for:

- portrait and landscape viewport composition;
- EN/LTR and FA/RTL;
- Light/Dark;
- workout start and automatic Prepare → Work → Rest progression;
- pause/resume;
- Music open/return continuity;
- orbital drag path;
- mix save;
- ducking state.

The prototype is ready for Owner UX evaluation. This evidence does not validate
camera, MoveNet, rep accuracy, or Product runtime behavior.
