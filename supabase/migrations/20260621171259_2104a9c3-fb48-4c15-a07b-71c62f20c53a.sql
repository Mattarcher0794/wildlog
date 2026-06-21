CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  username text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.sightings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text,
  common_name text NOT NULL,
  scientific_name text,
  animal_group text,
  confidence text,
  description text,
  note text,
  is_animal boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT false,
  lat double precision,
  lng double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sightings TO authenticated;
GRANT ALL ON public.sightings TO service_role;
ALTER TABLE public.sightings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own sightings select" ON public.sightings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own sightings insert" ON public.sightings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own sightings update" ON public.sightings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own sightings delete" ON public.sightings FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX sightings_user_idx ON public.sightings(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.username_available(p_username text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = lower(p_username));
$$;
GRANT EXECUTE ON FUNCTION public.username_available(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_profile(p_username text)
RETURNS TABLE (username text, created_at timestamptz, sighting_count bigint, species_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.username, p.created_at,
    (SELECT count(*) FROM public.sightings s WHERE s.user_id = p.id AND s.is_public AND s.is_animal),
    (SELECT count(DISTINCT lower(s.common_name)) FROM public.sightings s WHERE s.user_id = p.id AND s.is_public AND s.is_animal)
  FROM public.profiles p
  WHERE p.username = lower(p_username);
$$;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_sightings(p_username text)
RETURNS TABLE (id uuid, image_url text, common_name text, scientific_name text, animal_group text, description text, created_at timestamptz, lat double precision, lng double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.image_url, s.common_name, s.scientific_name, s.animal_group, s.description, s.created_at, s.lat, s.lng
  FROM public.sightings s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE p.username = lower(p_username) AND s.is_public AND s.is_animal
  ORDER BY s.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_sightings(text) TO anon, authenticated;