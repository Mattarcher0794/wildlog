import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { reverseGeocode } from "@/lib/geocode.server";

export type NearbySpeciesRow = {
  commonName: string;
  scientificName: string | null;
  group: string | null;
  count: number;
};

/**
 * Public read of wildlife logged nearby by anyone (ghost slots + RARE NEARBY
 * badge). Uses the anon publishable client so the `is_public AND is_animal`
 * policy applies — only approximate (~1km rounded) coordinates are exposed,
 * never exact ones.
 */
export const listNearbySpecies = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ lat: z.number(), lng: z.number() }).parse(d),
  )
  .handler(async ({ data }): Promise<NearbySpeciesRow[]> => {
    const supabasePublic = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    // ~0.5° box ≈ 55km of latitude; good enough for a "nearby" feel.
    const d = 0.5;
    const { data: rows, error } = await supabasePublic
      .from("sightings")
      .select("common_name, scientific_name, animal_group, approx_lat, approx_lng")
      .eq("is_public", true)
      .eq("is_animal", true)
      .gte("approx_lat", data.lat - d)
      .lte("approx_lat", data.lat + d)
      .gte("approx_lng", data.lng - d)
      .lte("approx_lng", data.lng + d)
      .limit(500);
    if (error) throw new Error(error.message);

    const counts = new Map<string, NearbySpeciesRow>();
    for (const r of rows ?? []) {
      const key = (r.common_name ?? "").trim().toLowerCase();
      if (!key) continue;
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else
        counts.set(key, {
          commonName: r.common_name,
          scientificName: r.scientific_name,
          group: r.animal_group,
          count: 1,
        });
    }
    return [...counts.values()].sort((a, b) => b.count - a.count);
  });


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
  place_name: string | null;
  created_at: string;
};

const SELECT =
  "id, image_url, common_name, scientific_name, animal_group, confidence, description, note, is_animal, is_public, lat, lng, place_name, created_at";

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
    // Resolve a readable place name when we have coordinates.
    let place_name: string | null = null;
    if (data.lat != null && data.lng != null) {
      place_name = await reverseGeocode(data.lat, data.lng);
    }
    const { data: row, error } = await context.supabase
      .from("sightings")
      .insert({ ...data, place_name, user_id: context.userId })
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row as DbSighting;
  });

/**
 * Backfill readable place names for the caller's recent sightings that have
 * coordinates but no `place_name` yet. Returns a map of id → place name for the
 * ones that were resolved, so the UI can update without a full refetch.
 */
export const resolvePlaceNames = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ ids: z.array(z.string()).max(20) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<Record<string, string>> => {
    if (data.ids.length === 0) return {};
    const { data: rows, error } = await context.supabase
      .from("sightings")
      .select("id, lat, lng, place_name")
      .eq("user_id", context.userId)
      .in("id", data.ids);
    if (error) throw new Error(error.message);

    const resolved: Record<string, string> = {};
    for (const r of rows ?? []) {
      if (r.place_name || r.lat == null || r.lng == null) continue;
      const name = await reverseGeocode(r.lat, r.lng);
      if (!name) continue;
      const { error: upErr } = await context.supabase
        .from("sightings")
        .update({ place_name: name })
        .eq("id", r.id)
        .eq("user_id", context.userId);
      if (!upErr) resolved[r.id] = name;
    }
    return resolved;
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
