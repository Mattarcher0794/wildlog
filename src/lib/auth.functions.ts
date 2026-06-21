import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

type VerifyResult = {
  access_token: string;
  refresh_token: string;
};

const verifyInput = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

// Fixed credentials for the password-based test bypass (skips the 6-digit code).
const TEST_EMAIL = "test123@wildlog.test";
const TEST_PASSWORD = "Test123!bypass";


function getStringField(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") return null;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" ? field : null;
}

export const verifyAuthEmailCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => verifyInput.parse(input))
  .handler(async ({ data }): Promise<VerifyResult> => {
    const email = data.email.trim().toLowerCase();
    const code = data.code.trim();
    const supabaseUrl = process.env.SUPABASE_URL;
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !publishableKey) {
      throw new Error("Email verification is not configured.");
    }

    let tokenToVerify = code;

    if (serviceRoleKey) {
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: rows } = await admin
        .from("email_send_log")
        .select("id, metadata, created_at")
        .ilike("recipient_email", email)
        .in("template_name", ["signup", "magiclink", "reauthentication"])
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(50);

      const match = rows?.find((row) => getStringField(row.metadata, "display_token") === code);
      const providerToken = getStringField(match?.metadata, "provider_token");
      if (providerToken) tokenToVerify = providerToken;
    }

    const authClient = createClient(supabaseUrl, publishableKey, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: verified, error } = await authClient.auth.verifyOtp({
      email,
      token: tokenToVerify,
      type: "email",
    });

    if (error || !verified.session?.access_token || !verified.session.refresh_token) {
      throw new Error("That code's wrong or expired. Try again, or send a new one.");
    }

    return {
      access_token: verified.session.access_token,
      refresh_token: verified.session.refresh_token,
    };
  });

/**
 * Test-only bypass: signs into a fixed throwaway account with a password so
 * QA can skip the 6-digit email code. Triggered by typing "Test123" as the
 * email on the sign-in screen.
 */
export const testSignIn = createServerFn({ method: "POST" }).handler(
  async (): Promise<VerifyResult> => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
      throw new Error("Test sign-in is not configured.");
    }

    const authClient = createClient(supabaseUrl, publishableKey, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    async function signIn() {
      return authClient.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
    }

    // Happy path: the test account already exists.
    let { data, error } = await signIn();

    if (error || !data.session) {
      // Provision (or repair) the test account, then retry.
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });

      const { error: createErr } = await admin.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
      });

      if (createErr) {
        // Already exists — find it and reset the password so we know it.
        const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
        const existing = list?.users.find(
          (u) => u.email?.toLowerCase() === TEST_EMAIL,
        );
        if (existing) {
          await admin.auth.admin.updateUserById(existing.id, {
            password: TEST_PASSWORD,
            email_confirm: true,
          });
        }
      }

      ({ data, error } = await signIn());
    }

    if (error || !data.session?.access_token || !data.session.refresh_token) {
      throw new Error("Couldn't start the test session. Please try again.");
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    };
  },
);
