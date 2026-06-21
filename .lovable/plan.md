## Goal

On the home screen, the hero illustration is too tall and pushes the headline, subcopy, and the primary "Log a sighting" button below the fold. Shrink the illustration and make the CTA stick above the bottom tab bar so the core action is always reachable.

All changes are scoped to the idle-state `Hero` component in `src/routes/_authenticated/index.tsx`. No backend, data, or copy changes.

## Changes

### 1. Shrink the hero illustration
In the `Hero` component, the illustration container currently uses `mx-auto mt-2 max-w-sm` (≈384px) with a full-width `<img>`.

- Reduce the container to roughly 60% width with a smaller cap: `mx-auto mt-1 w-3/5 max-w-[260px]`.
- Tighten the surrounding vertical spacing proportionally (smaller top margin; reduce the headline's `mt-4` slightly) so headline + subcopy fit above the fold on a standard phone (~844–852px logical).
- Keep the artwork centered and uncropped (only the container resizes; the `<img>` stays `w-full h-auto`).

### 2. Make the "Log a sighting" CTA sticky
The CTA block (primary button + "Upload a photo instead" link) currently sits in normal flow after the subcopy.

- Wrap the primary "Log a sighting" button area in a sticky container pinned just above the tab bar:
  - `position: sticky` with `bottom` ≈ `calc(64px + env(safe-area-inset-bottom, 0px))` to clear the actual tab bar height (the tab bar is ~56–64px tall, not 72px).
  - Add `z-10` and a soft drop shadow so it separates from content scrolling underneath.
- Keep the "Upload a photo instead" link directly with/under the button as today.
- This only applies to the idle hero; the capture/result phase is untouched.

### 3. Verify
- Drive the live preview with Playwright at a ~390×844 mobile viewport, screenshot the home screen, and confirm: logo bar → shrunk illustration → headline → subcopy → CTA are all visible without scrolling, the CTA stays pinned above the tab bar when scrolling (with the recent-sightings strip present), and the illustration isn't cropped.

## Technical notes
- File: `src/routes/_authenticated/index.tsx` (`Hero` function, lines ~250–308).
- Use Tailwind utility classes consistent with the existing code (e.g. `sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-10`) rather than introducing the doc's raw CSS class names — the codebase uses Tailwind, not custom CSS classes.
- The bottom tab bar (`TabBar.tsx`) is `position: fixed`; no change needed there. The `main` already has `pb-28` bottom padding which keeps content clear of the bar.
