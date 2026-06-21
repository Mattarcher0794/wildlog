-- Privacy: anonymous (public) readers must not see exact GPS coordinates.
-- Expose only coordinates rounded to ~1.1km (2 decimal places) to anon, and
-- revoke column access to the precise lat/lng for the anon role. Owners
-- (authenticated, own rows) continue to see exact coordinates.

ALTER TABLE public.sightings
  ADD COLUMN IF NOT EXISTS approx_lat double precision
    GENERATED ALWAYS AS (round(lat::numeric, 2)::double precision) STORED,
  ADD COLUMN IF NOT EXISTS approx_lng double precision
    GENERATED ALWAYS AS (round(lng::numeric, 2)::double precision) STORED;

-- Authenticated users keep full column access (RLS still limits rows to own
-- rows or public+animal rows).
GRANT SELECT ON public.sightings TO authenticated;

-- Lock the anon role down to non-precise columns only. Anon can no longer
-- read the exact lat/lng columns at all, even via the Data API.
REVOKE SELECT ON public.sightings FROM anon;
GRANT SELECT (
  id,
  user_id,
  image_url,
  common_name,
  scientific_name,
  animal_group,
  confidence,
  description,
  note,
  is_animal,
  is_public,
  created_at,
  approx_lat,
  approx_lng
) ON public.sightings TO anon;
