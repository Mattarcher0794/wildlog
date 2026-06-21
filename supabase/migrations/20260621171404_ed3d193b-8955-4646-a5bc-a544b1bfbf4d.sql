DROP FUNCTION IF EXISTS public.username_available(text);
DROP FUNCTION IF EXISTS public.get_public_profile(text);
DROP FUNCTION IF EXISTS public.get_public_sightings(text);

ALTER TABLE public.profiles DROP COLUMN email;

DROP POLICY "Own profile select" ON public.profiles;
CREATE POLICY "Profiles readable by all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Profiles readable by anon" ON public.profiles FOR SELECT TO anon USING (true);
GRANT SELECT ON public.profiles TO anon;

DROP POLICY "Own sightings select" ON public.sightings;
CREATE POLICY "Sightings readable" ON public.sightings FOR SELECT TO authenticated USING (auth.uid() = user_id OR (is_public AND is_animal));
CREATE POLICY "Public sightings readable by anon" ON public.sightings FOR SELECT TO anon USING (is_public AND is_animal);
GRANT SELECT ON public.sightings TO anon;