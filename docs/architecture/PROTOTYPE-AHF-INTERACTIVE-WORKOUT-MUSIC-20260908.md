# AHF Interactive Workout + Music UX Prototype V2 (2026-09-08)

> **Status:** DELIVERED FOR OWNER UX EVALUATION — not UX accepted
> **Prototype PR:** V2 replacement of the rejected V1 prototype
> **Scope:** isolated exploratory static prototype; no Product replacement or Production change
> **UI decision:** `REUSE` Apex semantic tokens, theme/RTL/accessibility principles, and platform interaction guidance; no production UI kit or app route was modified

## Location and run command

`scripts/interactive-workout-prototype/index.html`

```bash
python3 -m http.server 4177 --directory scripts/interactive-workout-prototype
```

Open `http://localhost:4177`, or `http://<LAN-IP>:4177` on a phone on the same
network.

## Why V2 is a redesign, not a polish pass

V1 was rejected because it looked like a technical visualization harness and a
dashboard containing a radial menu. V2 replaces the central visual and
interaction models:

- rounded animated human Mentor + aligned Ghost movement instead of primary
  crude stick figures;
- movement relationship as the visual hero;
- purposeful Compare state for repeated correction, with auto-collapse;
- intentional ambient Rest state;
- artwork-led Music mode with a collection-wide rotary/orbital interaction;
- progressive disclosure for playlist detail, Now Playing, and mix creation;
- portrait-first workout and Music compositions;
- no prominent debug/demo labels in the user-facing flow.

## Implemented experience

- automatic Prepare → Work → Rest → Transition workout flow;
- pause/resume and restrained secondary controls;
- animated reference and tracked movement representations;
- transient coaching and adaptive comparison;
- orbital drag, depth/scale/opacity/tilt settling, and focused artwork;
- Playlist Detail, Now Playing, Create Mix, and audio ducking preview;
- workout/music continuity;
- EN/LTR and FA/RTL;
- Light/Dark;
- portrait and landscape.

## Isolation

No camera, MoveNet, persistence, backend, database, real music APIs,
authentication, legal policy, or Production implementation is included. All
pose, timing, audio, and music data is simulated.

## Validation evidence

Local browser smoke passed after fixing a real V2 initialization defect caught
by the smoke test (theme state/function name collision). It validates:

- portrait and landscape;
- workout start and automatic progression;
- pause/resume;
- Music interruption and return;
- orbital interaction and Now Playing;
- EN/FA RTL;
- Light/Dark;
- timed Prepare → Work → Rest and Compare behavior.

V2 is ready for Owner UX evaluation. It is explicitly **not** declared UX
accepted. Product implementation remains blocked pending Owner evaluation.
