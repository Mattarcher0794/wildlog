# Wildlog brand refinement

The palette, fonts (Sniglet / Inter / JetBrains Mono), and base tokens already match the brand book. This pass tightens how consistently the book's *signatures* show up. No functionality changes — only presentation.

## 1. Blob signature everywhere (`src/styles.css`, `index.tsx`, `history.tsx`)
The book names the asymmetric blob as the one recognisable shape across pins, loading states, empty states, and avatar frames.
- Add a `blob-spin` utility: a blob-shaped element with a slow rotation so the loading state reads as a Wildlog blob, not a generic spinner.
- Replace the `Loader2` spinner on the capture/loading card with a moss blob spinner.
- Recent-strip thumbnails (home) become blob-framed avatars instead of rounded squares.
- Keep the existing blob thumbnails in history; align the empty-state blob with the same shape.
- Add a second blob radius variant so not every blob is identical (subtle hand-built variation).

## 2. Moss "just logged" state (`index.tsx`, `history.tsx`)
The book reserves moss for "just logged / live" states. Purely visual highlight of the newest entry — no data/logic changes.
- Show a small moss pill ("Just logged") on the most recent sighting in the recent strip and at the top of the journal list.
- Derived from the already-sorted sightings array (the first item) — no new state or storage.

## 3. Soft irregular corners (`src/styles.css`)
The book calls for "soft, slightly irregular roundedness" over uniform radius.
- Add a `card-journal` utility combining the existing soft border/shadow with a gentle asymmetric border-radius (e.g. slightly different radii per corner).
- Apply it to sighting cards in the recent strip and journal list, replacing the uniform `rounded-2xl` on those cards.

## 4. Voice + small polish
- Rename the bottom-tab label "Identify" → "Log" to match the book's field-journal voice ("Log a sighting"). Route and behaviour unchanged.
- Confirm the moss action colour, peach identity badge, and mono timestamps stay exactly per the book (already correct).

## Technical notes
- Fonts are already loaded via `<link>` in `src/routes/__root.tsx`; no font install needed.
- All new shapes/corners are CSS `@utility` additions in `src/styles.css` (Tailwind v4), referenced via class names — no hardcoded colors in components.
- Changes are confined to `src/styles.css`, `src/routes/index.tsx`, `src/routes/history.tsx`, and `src/components/TabBar.tsx`. No server functions, storage, or identification logic touched.
