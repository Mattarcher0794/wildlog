# Plan: Widen Plumage into an all-animal identifier

We'll evolve the existing app from "birds only" to "any animal," keeping the same warm field-guide aesthetic, animations, and local-history approach. No backend/database is added — everything stays client-side with localStorage, same as today.

## 1. Pick a name (your decision)

Since you wanted names first, here are candidates. **Pick one (or give your own) and I'll rebrand around it.**

```text
Critterpedia  — playful, "encyclopedia of critters"
Fauna         — clean, elegant, instantly understood
Wildeye       — "wild" + the camera "eye", punchy
Beastie       — friendly, approachable, memorable
Snapto        — "snap" + identify, modern app feel
Menagerie     — characterful, vintage field-guide tone
```

My recommendation: **Fauna** (broad, premium, future-proof) or **Wildeye** (camera-forward and distinctive). Tell me your pick before I build.

## 2. Rebrand surfaces

- App name in the header, tab bar, page titles, and SEO/OG meta across `index.tsx`, `history.tsx`, and `__root.tsx`.
- Hero copy: "Who is that bird?" → broader line (e.g. "What animal is that?").
- Replace the songbird hero illustration with a new all-animal hero image generated to match the existing warm, vintage field-guide style.
- Swap the bird-specific `Feather` logo icon for a neutral animal/nature mark, and soften "Field guide" labeling (kept, since it still fits).

## 3. Broaden identification (the core change)

In `src/lib/identify.functions.ts`:
- Rewrite the system prompt from "expert ornithologist / identify the bird" to "expert naturalist / identify the animal" covering **all animals** (mammals, birds, reptiles, amphibians, fish, insects, arachnids, marine life, etc.).
- Update the result type and JSON shape:
  - `isBird` → `isAnimal` (true/false; false = "Not an animal" with an explanation of what's in the photo instead).
  - **Add `group`** — the animal category (e.g. Mammal, Bird, Reptile, Amphibian, Fish, Insect, Arachnid, Mollusk, Other). This is the new field per your choice.
  - Keep `commonName`, `scientificName`, `confidence`, `description`, optional `note`.
- Rename the exported server fn `identifyBird` → `identifyAnimal` and the type `BirdIdentification` → `AnimalIdentification`, updating all imports.

## 4. Result card

In `index.tsx` `ResultCard`:
- Show the new **group** as a small labeled badge/chip (e.g. "Mammal") alongside the confidence dot.
- Update the empty/negative state copy ("No animal found").

## 5. Journal grouped by type

In `src/routes/history.tsx`:
- Keep search + keep-all-history behavior.
- Add grouping: a filter row of animal-type chips (All, Mammals, Birds, Reptiles, …) that filters the list, with section headers per group. Counts shown per type.
- Stored sightings keep working — entries already saved (birds) carry over; older entries without a `group` fall back to an "Other"/"Unsorted" bucket.

## 6. Data/storage notes

- `sightings.ts`: update the imported type name; storage key can stay (`plumage.sightings.v1`) to preserve existing history, or bump to a new key if we want a clean slate after rebrand — I'll keep the old key so your saved sightings survive unless you'd rather start fresh.

## Technical details

- Files touched: `src/lib/identify.functions.ts`, `src/lib/sightings.ts`, `src/routes/index.tsx`, `src/routes/history.tsx`, `src/routes/__root.tsx`, `src/components/TabBar.tsx`, plus a new generated hero asset in `src/assets/`.
- AI: same Lovable AI Gateway call, same `google/gemini-3-flash-preview` vision model, same JSON-object response format — only the prompt and schema change.
- No new dependencies; Motion animations and the design system stay as-is.

## Assumptions to confirm

1. **Name** — which of the candidates above (or your own)?
2. **Scope** — "all animals" includes insects, fish, and marine life (not plants/fungi). Correct?
3. **History** — keep your existing saved bird sightings (they'll appear under their groups), rather than wiping on rebrand. OK?

Confirm the name + the two assumptions and I'll build it.