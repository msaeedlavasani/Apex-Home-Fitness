# AHF Adaptive Workout Canvas + Quiet Coach — Prototype V2

> **Exploratory UX prototype only.** V2 is an isolated static prototype. It does
> not replace `WorkoutPlayer`, modify Product routes, access the camera, invoke
> MoveNet, persist data, or change Production behavior.

## Run

From repository root:

```bash
python3 -m http.server 4177 --directory scripts/interactive-workout-prototype
```

Open `http://localhost:4177`, or use `http://<computer-LAN-IP>:4177` from a
phone on the same network. The prototype uses simulated pose, camera, workout,
and music data, so camera permission and HTTPS are not required.

## V2 redesign focus

V1 was technically functional but rejected because it looked like a technical
visualization harness and a dashboard containing a radial menu. V2 replaces the
core composition rather than layering more UI on top:

- the workout canvas uses an animated, rounded human Mentor representation and
  a spatially aligned Ghost movement with trails/glow, not primary stick figures;
- the movement relationship is the hero; explanatory labels are subordinate;
- Adaptive Compare reorganizes the canvas only after a meaningful correction
  moment, then auto-collapses;
- Rest is intentionally quiet with a designed ambient orbit and late preview;
- Music is a full spatial mode with artwork-led focus and a real drag/rotate
  rotary collection; it is not a two-column dashboard or a card grid;
- artwork focus changes position, scale, opacity, tilt, and depth as the dial
  rotates and settles;
- Playlist Detail, Now Playing, Workout Mix, and audio ducking are progressive
  disclosures rather than simultaneous utility cards;
- portrait is the primary workout composition; landscape is deliberate rather
  than a rotated portrait layout;
- user-facing debug/prototype labels were removed from the active experience.

## Main evaluation path

1. Start from Pre-workout.
2. Enter the immersive Workout canvas.
3. Observe automatic Prepare → Work → Rest → Transition progression.
4. Observe animated Mentor/Ghost relationship and transient coaching.
5. Observe Adaptive Compare appear and collapse.
6. Pause/Resume or open Music while the workout continues.
7. Drag the Music orbital collection; tap focused artwork.
8. Open Playlist Detail, Now Playing, or Create Mix.
9. Preview Quiet Coach audio ducking.
10. Return to the still-running workout.
11. Evaluate EN/LTR, FA/RTL, Light/Dark, portrait, and landscape.

## Validation

Local Playwright smoke validates portrait/landscape, EN/FA RTL, Light/Dark,
workout start, automatic phase flow, pause/resume, Music interruption and
return, orbital drag, Now Playing, and the corrected theme initialization.
A timed flow check validates Prepare → Work → Rest and Compare entry.

## Deliberate limitations

- no real camera or MoveNet;
- no external music authentication/API;
- no persistence/backend/database/retention/analytics;
- no final legal/product copy;
- no replacement of `WorkoutPlayer`;
- no claim that simulated pose, rep progression, or coaching represents
  field-validated device behavior.

V2 is ready for Owner UX evaluation only. It is not UX accepted and must not
be promoted into Product implementation without a separate Owner decision.
