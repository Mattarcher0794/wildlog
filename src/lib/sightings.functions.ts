import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DbSighting = {
  id: string;
  image_url: string | null;
  common_name: string;
  scientific_name: string | null;
  animal_group: string | null;
  confidence: string | null;
  description: string | null;
  note: string | null;
  is_animal: boolean;
  is_public: boolean;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

const SELECT =
  "id, image_url, common_name, scientific_name, animal_group, confidence, description, note, is_animal, is_public, lat, lng, created_at";

export const listMySightings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DbSighting[]> => {
    const { data, error } = await context.supabase
      .from("sightings")
      .select(SELECT)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as DbSighting[];
  });

const createSchema = z.object({
  image_url: z.string().nullable(),
  common_name: z.string().min(1),
  scientific_name: z.string().nullable(),
  animal_group: z.string().nullable(),
  confidence: z.string().nullable(),
  description: z.string().nullable(),
  note: z.string().nullable(),
  is_animal: z.boolean(),
  is_public: z.boolean(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});

export const createSighting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }): Promise<DbSighting> => {
    const { data: row, error } = await context.supabase
      .from("sightings")
      .insert({ ...data, user_id: context.userId })
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row as DbSighting;
  });

export const setSightingVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string(), is_public: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("sightings")
      .update({ is_public: data.is_public })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSighting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("sightings")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
