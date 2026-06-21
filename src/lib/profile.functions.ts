import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Profile = {
  id: string;
  username: string | null;
  created_at: string;
};

export type PublicSighting = {
  id: string;
  image_url: string | null;
  common_name: string;
  scientific_name: string | null;
  animal_group: string | null;
  description: string | null;
  created_at: string;
  lat: number | null;
  lng: number | null;
};

export type PublicProfile = {
  username: string;
  joinedAt: string;
  sightingCount: number;
  speciesCount: number;
  sightings: PublicSighting[];
};

const usernameRule = z
  .string()
  .trim()
  .transform((s) => s.toLowerCase())
  .pipe(z.string().regex(/^[a-z0-9_]{3,20}$/));

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Profile | null> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, username, created_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const checkUsername = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ username: z.string() }).parse(d))
  .handler(async ({ data }): Promise<{ valid: boolean; available: boolean }> => {
    const parsed = usernameRule.safeParse(data.username);
    if (!parsed.success) return { valid: false, available: false };
    const sb = publicClient();
    const { data: row } = await sb
      .from("profiles")
      .select("id")
      .eq("username", parsed.data)
      .maybeSingle();
    return { valid: true, available: !row };
  });

export const claimUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ username: z.string() }).parse(d))
  .handler(async ({ data, context }): Promise<Profile> => {
    const parsed = usernameRule.safeParse(data.username);
    if (!parsed.success) {
      throw new Error(
        "Usernames are 3–20 characters: lowercase letters, numbers and underscores.",
      );
    }
    const { data: taken } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("username", parsed.data)
      .maybeSingle();
    if (taken && taken.id !== context.userId) {
      throw new Error("That name's taken — try another.");
    }
    const { data: saved, error } = await context.supabase
      .from("profiles")
      .upsert({ id: context.userId, username: parsed.data }, { onConflict: "id" })
      .select("id, username, created_at")
      .single();
    if (error) throw new Error(error.message);
    return saved;
  });

export const getPublicProfile = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ username: z.string() }).parse(d))
  .handler(async ({ data }): Promise<PublicProfile | null> => {
    const username = data.username.toLowerCase().replace(/^@/, "");
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return null;
    const sb = publicClient();
    const { data: profile } = await sb
      .from("profiles")
      .select("id, username, created_at")
      .eq("username", username)
      .maybeSingle();
    if (!profile || !profile.username) return null;
    const { data: rows } = await sb
      .from("sightings")
      .select(
        "id, image_url, common_name, scientific_name, animal_group, description, created_at, lat, lng",
      )
      .eq("user_id", profile.id)
      .eq("is_public", true)
      .eq("is_animal", true)
      .order("created_at", { ascending: false });
    const sightings = (rows ?? []) as PublicSighting[];
    const speciesCount = new Set(
      sightings.map((s) => s.common_name.toLowerCase()),
    ).size;
    return {
      username: profile.username,
      joinedAt: profile.created_at,
      sightingCount: sightings.length,
      speciesCount,
      sightings,
    };
  });
