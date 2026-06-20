# Plumage 🪶 — Snap a bird, learn its name

A playful, nature-themed mobile-first web app. Point your camera (or upload a photo) at a bird, and AI identifies the species with a short field-guide style write-up.

## Name
**Plumage** — short, evocative, bird-specific. (Alternates if you'd prefer: *Perch*, *Birdsight*, *Featherly*, *Chirpwise*.)

## Core experience
1. Landing screen with app name, a hero bird illustration, and a big "Identify a bird" button.
2. Tapping it opens the device camera (mobile) or a file picker — user snaps or uploads a photo.
3. Photo preview + "Identify" button → sends the image to Lovable AI (Gemini vision model).
4. Result card shows:
   - Common name (large) + scientific name (italic)
   - Confidence indicator
   - 2–3 sentence description (habitat, distinctive markings, fun fact)
   - "Identify another" button
5. Below the result: a scrollable **Recent sightings** list (last 10) stored locally so users can flip back through past IDs.

## Design direction
- Warm, naturalist field-guide feel: cream background, deep forest green primary, muted terracotta accent, hand-drawn feel.
- Serif display font for bird names (Fraunces), clean sans (Inter) for body.
- Subtle feather/leaf SVG flourishes; rounded cards with soft shadows.
- Fully responsive, optimized for phone portrait first.

## Technical details
- **Stack:** existing TanStack Start + Tailwind.
- **AI:** Lovable AI Gateway, model `google/gemini-3-flash-preview` (multimodal — accepts images). Called via a `createServerFn` in `src/lib/identify.functions.ts`.
- Image sent as base64 data URL in the chat-completions `image_url` content block; response constrained with the `Output.object` schema `{ commonName, scientificName, confidence, description }`.
- **Camera/upload:** `<input type="file" accept="image/*" capture="environment">` — no native APIs, works on iOS/Android browsers.
- **Storage:** recent sightings kept in `localStorage` (no backend needed for v1). If you later want a synced history across devices, we can add Lovable Cloud auth + a `sightings` table.
- **Routes:**
  - `/` — landing + camera entry
  - `/result` — last identification (or inline on `/`; we'll keep it single-page for snappiness)
  - `/history` — past sightings
- SEO: each route gets its own title/description; OG image of the hero bird illustration.

## Out of scope for v1
- User accounts, cloud-synced history, social sharing, audio (bird-call) ID, location-based filtering. Easy to add later.

Confirm and I'll build it. Want me to swap the name, palette, or add cloud-synced history before I start?
