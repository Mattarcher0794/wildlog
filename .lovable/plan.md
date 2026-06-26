Fix the cut-off "g" in the TabBar active tab label.

**Problem:** The active tab label in `src/components/TabBar.tsx` uses `leading-none` (line-height: 1) with `overflow-hidden`, which clips the descender of the "g" in "Log".

**Fix:** Change `leading-none` to `leading-tight` (or add `pb-0.5`) on the active tab label span (line 80) so descenders render fully without being clipped by `overflow-hidden`.

No other files touched.