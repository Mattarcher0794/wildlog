## Overview

Two changes:
1. **Home (Log)** — turn the camera-first screen into the dashboard from your mock, and bring back the floating animal illustration (placed small, top-right).
2. **Life List** — switch species thumbnails from rounded-square (`organic-*`) back to the brand "misshapen circle" blob shapes.

The existing camera → scanning → result → saved flow is kept intact; it just sits behind the new **Log a sighting** button instead of being the first thing you see.

---

## 1. Home / Log dashboard — `src/routes/_authenticated/index.tsx`

Add a new initial phase `"dashboard"`. The screen opens on the dashboard; tapping **Log a sighting** switches to the existing `capture` viewfinder, and the rest of the flow (`scanning` → `result` → `saved`) is unchanged. After saving, returning home shows the refreshed dashboard.

**Dashboard layout (top → bottom):**

```text
THURSDAY · 14 JUN 2025                    ◜ small floating
WHAT DID YOU SPOT?                          animal blob ◞  (top-right)

[ ● 3 day streak ] [ 5 this week ] [ 47 total ]

[      +  Log a sighting      ]   ← solid moss-green pill

RECENT SIGHTINGS
 ◯ European Robin            NEW
   Hampstead Heath · 14 Jun · 07:23
 ◯ Red Fox
   Richmond Park · 09 Jun · 18:45
 ...
```

- **Date line**: derived from the current date (e.g. `THURSDAY · 26 JUN 2026`), mono uppercase muted.
- **Headline**: "What did you spot?" in the display font, left-aligned.
- **Floating animal hero**: `hero-animals.jpg` (already in `src/assets`) rendered small as a `blob` with the `animate-float` utility, positioned compact in the top-right beside the headline.
- **Stat pills** (real values computed from `listMySightings`):
  - **streak** — consecutive days (ending today or yesterday) that have at least one sighting.
  - **this week** — sightings in the last 7 days.
  - **total** — total sightings logged.
- **Log a sighting**: full-width moss-green pill with a `+` icon → sets phase to `capture`.
- **Recent sightings**: vertical rows (latest ~5), each with a blob avatar (photo if present, else `speciesGradient`), common name, location line, and `date · time`. A **NEW** badge shows only on the first-ever sighting of a species. No SEASON tags, no globe/lock emojis.

If there are no sightings yet, the recent section is replaced by a short prompt to log the first one.

## 2. Reverse-geocoded location names

Recent rows show place names (e.g. "Richmond Park"), but only GPS coordinates are stored today, so we add geocoding via the **Google Maps Platform** connector.

- **Connect** the Google Maps Platform connector (one-time link; no manual key entry).
- **Migration**: add a `place_name text` column to `public.sightings`.
- **On log**: `createSighting` (in `src/lib/sightings.functions.ts`) reverse-geocodes lat/lng through the Maps gateway and stores `place_name`.
- **Backfill for existing rows**: a server function resolves and persists `place_name` for recent sightings that don't have one yet, called by the recent list. Rows display `place_name` when available and fall back gracefully (date/time only) while it resolves.

## 3. Life List misshapen circles — `src/routes/_authenticated/life-list.tsx`

- Change the species card image container from the `organic-1..4` rounded-square radii to the brand blob shapes, alternating `blob` / `blob-alt` across the grid (the same misshapen circles used elsewhere in the app).
- Apply the same blob treatment to the "Seen nearby" ghost slots so the grid stays visually consistent.
- Nothing else on the Life List changes (badges, counts, search, layout all stay).

---

## Technical notes

- **Stats** are computed client-side from the already-loaded `["sightings"]` query — no new tables.
- **NEW badge** reuses the existing life-list badge logic (first occurrence of a species).
- **Geocoding** goes through the Lovable connector gateway (`createServerFn`, server-side); the browser key is not used for geocoding. Results are cached in `place_name` so each coordinate is looked up once.
- The capture/scanning/result/saved components and the save payload are unchanged apart from `place_name` being populated.
- **Files touched**: `src/routes/_authenticated/index.tsx`, `src/routes/_authenticated/life-list.tsx`, `src/lib/sightings.functions.ts`, one DB migration, plus the Google Maps connector link.
