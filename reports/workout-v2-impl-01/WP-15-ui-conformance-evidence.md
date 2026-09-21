# WP-15 UI Conformance Evidence

Decision: `EXTEND` the existing Workout V2 platform surface.

- Reused the existing `ExperienceShell`, stage components, shell controls,
  theme provider, localized router, AppShell/PWA layout conventions, and
  semantic design tokens.
- Extended only the normal authenticated workout route adapter and the shell's
  existing result-effect seam; no competing UI kit, route-specific topology,
  or test-account presentation was introduced.
- Preserved EN/FA routing, RTL, dark/light controls, reduced motion, responsive
  geometry, and the existing degraded Mentor behavior for unsupported exercise
  identities.
- Browser evidence: normal `/en/workout` entry and the existing 26-test V2
  reliability suite passed with no application runtime errors.
