# Wildlog — Design Handoff Implementation

A full restructure of Wildlog to match the high-fidelity handoff: a 4-tab app (**Log · Life List · Map · Profile**), a species-grouped **Life List** collection with a **Species Detail** drill-down, a dedicated **multi-step Log flow**, plus the **badge + ghost-slot** gamification layer.

## Decisions locked in with you
- **Scope:** full restructure.
- **Life List:** species-grouped collection (one card per species) → drill into Species Detail.
- **Gamification:** badges (NEW / FIRST THIS SEASON / RARE NEARBY) **and** ghost slots ("spotted nearby") are IN.
- **Camera:** styled native capture (OS camera/file picker behind a viewfinder-styled screen — no flaky in-browser video stream).

### Deferred (not selected — left out of this pass)
- **"Log as Mystery" / identify-later** logging (the dark mystery card).
- **Multi-candidate AI picker** with several ranked species — we keep the current single best-match result, restyled.
- **Weather/conditions chips** persisted on a sighting.

I'll build the Log results screen around the single confident result; the mystery/multi-pick structure can be layered in later without rework.

## 1 · Design tokens & utilities (`src/styles.css`)
Add the handoff's primitives so every screen reuses them:
- Badge utilities: `.badge-moss` (NEW / FIRST THIS SEASON), `.badge-peach` (RARE NEARBY), `.badge-amber` (neutral) — exact fonts/padding/radius from the spec.
- Organic card-radius variants (4 patterns) so grid cards alternate, plus the smaller thumbnail variants.
- Ghost-slot utility: hatched `repeating-linear-gradient` background + dashed border.
- Keyframes: `float`, `pulse`, `scan-line`, `cursor-blink` (we already have `blob-rotate`).
- Confirm peach / moss / cream tokens already exist (they do) and add a `--color-tab-text` token to centralize the tab bar colors.

## 2 · Navigation restructure
- **Tabs:** Log (`/`, camera), Life List (`/life-list`, book), Map (`/map`, blob), Profile (`/profile`, person) — update `TabBar.tsx` labels/targets.
- Rename the browse screen to **Life List** at `/life-list`; keep a redirect from the old `/journal` and update the sitemap + internal links.
- Tab bar visuals already match the floating-pill spec; only the Life List label/target changes.

## 3 · Log flow (`/` index, styled native capture)
Replace the current "identify then auto-save" home with a staged flow (one route, internal phase state):
1. **Capture** — viewfinder-styled entry (3×3 grid lines, corner focus brackets, shutter blob, upload button, "no photo" skip). Buttons trigger the existing native file inputs (`capture="environment"` + gallery).
2. **Scanning** — full scanning state: sweep beam over the photo, pulsing "IDENTIFYING" badge, animated progress bar, spinning blob, "Checking the field guide…" copy.
3. **Result** — single best match, restyled: blob avatar, species name (Sniglet), latin name, confidence bar (high=moss / low=muted). **"Not an animal" → peach reassurance card** with two equal CTAs (retry / log anyway), never red.
4. **The Memory** — note form: confirmed-species chip, location + date rows (auto-filled, read-only for now), note textarea with blinking cursor, public/private toggle, **"Save to Life List"** CTA.

**Behavior change:** saving moves from automatic (current) to an explicit Save at step 4, so the note is captured before the row is written. `createSighting` is called on Save instead of right after identify.

## 4 · Life List (`/life-list`)
- **Header block:** big species count (Sniglet 66px), "Species" label, mono stats row (`N SIGHTINGS | R REGIONS | M THIS YEAR`).
- **Filter chips:** All + animal groups (reuse existing group logic).
- **Card grid (2-col):** one card **per unique species** (grouped from `listMySightings` by common name), each with newest photo, organic radius, species name, mono metadata (count + last seen), and **badges**:
  - NEW (moss) — species first logged recently.
  - FIRST THIS SEASON (moss) — first sighting this season.
  - RARE NEARBY (peach) — species uncommon among nearby public sightings.
- **Ghost slots:** dashed hatched cards for species logged publicly nearby that the user hasn't logged — interleaved into the grid, faded styling, "SPOTTED NEARBY?".
- **Empty state:** centred animated peach blob, "Your life list starts with one.", moss CTA → Log.
- Bottom gradient fade + floating "Log a Sighting" CTA above the tab bar.

## 5 · Species Detail (`/species/$species`)
New route, drilled from a Life List card:
- Hero (species-colour radial gradient + dark overlay), back/share buttons, species tags, name + latin name.
- Sheet card sliding over the hero with a stats bar (Sightings / Locations / First seen).
- Chronological **sighting rows**: blob avatar, name, mono date/time, italic note, privacy icon.
- Reuses `listMySightings` filtered to the species (client-side); share button uses the Web Share API.

## 6 · Backend (data layer)
- **No schema migration required** — existing `sightings` columns cover this (species name, group, coords, `approx_lat/approx_lng`, note, is_public, image, created_at).
- **New server fn `listNearbySpecies`** (public, anon publishable client): reads public + animal sightings within a bounding box around the user's approximate location, grouped by species, excluding species the user already has — powers ghost slots + the RARE NEARBY badge. Uses the existing anon SELECT policy on the approximate-coordinate columns (no exact coordinates exposed).
- Badge derivation (NEW / FIRST THIS SEASON) is computed client-side from the user's own sightings.

## 7 · Verification
- `tsgo --noEmit` for types.
- Drive the preview with Playwright (authenticated session): run the full Log flow end-to-end, confirm a sighting saves, Life List groups by species with badges, ghost slots render, and Species Detail opens. Screenshot each key screen against the handoff.

---

### Technical notes
- Life List + Species Detail group client-side over the existing `listMySightings` query (`queryKey: ["sightings"]`); no per-species fetch needed.
- Ghost slots/RARE NEARBY need the user's geolocation; if denied, those features degrade gracefully (grid still renders, gamification hidden).
- Species Detail param is the URL-encoded common name (`/species/$species`); no species table is introduced.
- The "Not an animal" and (future) mystery states share the result-card structure so adding mystery/multi-pick later is additive.
