# AHF Adaptive Workout Canvas + Quiet Coach Prototype

> **Exploratory UX prototype only.** This directory is isolated from the Next.js
> Product implementation, current `WorkoutPlayer`, persistence, camera services,
> database, and Production routes. It is not a Product delivery.

## Run

From the repository root:

```bash
python3 -m http.server 4177 --directory scripts/interactive-workout-prototype
```

Open:

- Desktop: <http://localhost:4177>
- Same-network phone: `http://<your-computer-LAN-IP>:4177`

HTTPS is not required because this prototype uses simulated camera/pose data and
never requests camera permission. To expose it safely for a phone, use the
existing temporary HTTPS testing approach; do not deploy this directory to
Production.

## Implemented interaction path

1. Pre-workout → Start Workout
2. Automatic Prepare → Work → Rest → Transition → next exercise
3. Center-stage Mentor + simulated Ghost Skeleton
4. Quiet Coach transient feedback
5. Adaptive Compare auto-entry/collapse
6. Pause / Resume, Skip, rep correction, End Workout
7. Music Home with genuine drag/swipe rotary/orbital dial
8. Playlist detail and simulated track playback
9. Create Workout Mix and save it in prototype memory
10. Now Playing with simulated Waze-like audio ducking preview
11. Open Music during workout and return to the still-running session
12. English/LTR and Persian/RTL toggle
13. Light/Dark toggle
14. Portrait-first responsive composition plus deliberate landscape layout

## Validation

The local Playwright smoke path verifies:

- portrait and landscape viewports;
- English and Persian/RTL direction;
- Light/Dark theme switch;
- automatic workout screen transition;
- pause/resume;
- Music interruption and return-to-workout continuity;
- orbital interaction path;
- mix creation;
- audio-ducking visual state.

A timed flow check also verifies Prepare → Work → Rest and Adaptive Compare
entry. The data is simulated and intentionally ephemeral.

## Deliberate limitations

- No real camera or MoveNet integration.
- No external music authentication or APIs.
- No persistence, backend, database, retention, or analytics.
- No final legal/product copy.
- No replacement of `WorkoutPlayer`.
- No claim that the simulated Ghost Skeleton or automatic rep progression is
  field-validated device behavior.
