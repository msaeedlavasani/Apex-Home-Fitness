# Test fixture: human.jpg

Real human photo used by `../smoke.mjs` scenario **D** (pose-bearing check):
the harness camera is replaced with a canvas stream painting this image, and
MoveNet must return poses with keypoints above the 0.5 gate. This validates
the full pixel path — camera stream → video element → mirrored capture canvas
→ `estimatePoses()` → pose telemetry → skeleton overlay — on **real image
content**, closing the gap that Chrome's synthetic test pattern (no human)
could not cover.

## Source + license

- **File:** Wikimedia Commons —
  [`File:US Navy 070504-N-0995C-072 ... (Kevin Sperling, body builder).jpg`](https://commons.wikimedia.org/wiki/File:US_Navy_070504-N-0995C-072_Chief_Mineman_Kevin_Sperling_appears_as_the_guest_body_builder_at_an_Armed_Forces_body_building_competition_held_at_Sharkey%27s_Theatre_at_Naval_Station_Pearl_Harbor.jpg)
- **Author:** U.S. Navy photo by Mass Communication Specialist Seaman Eric J. Cutright / Released (image ID `070504-N-0995C-072`).
- **License:** Public domain — work of a U.S. federal government employee
  (U.S. Navy), taken as part of official duties.
- **Local copy:** downscaled from the Commons 960 px thumbnail
  (`human.jpg`, in this folder).

This fixture is research/test data only — never shipped to users and never
rendered in the product.
