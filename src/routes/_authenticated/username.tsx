import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";

import { Wordmark } from "@/components/Brand";
import { useMyProfile } from "@/hooks/use-profile";
import { checkUsername, claimUsername } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/username")({
  component: UsernamePicker,
});

type Availability = "idle" | "checking" | "available" | "taken" | "invalid";

function UsernamePicker() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useMyProfile();
  const check = useServerFn(checkUsername);
  const claim = useServerFn(claimUsername);

  const [value, setValue] = useState("");
  const [status, setStatus] = useState<Availability>("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Already has a username → straight to the app.
  useEffect(() => {
    if (!isLoading && profile?.username) {
      navigate({ to: "/", replace: true });
    }
  }, [isLoading, profile, navigate]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const v = value.trim().toLowerCase();
    if (!v) {
      setStatus("idle");
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(v)) {
      setStatus("invalid");
      return;
    }
    setStatus("checking");
    debounce.current = setTimeout(async () => {
      try {
        const res = await check({ data: { username: v } });
        setStatus(res.valid ? (res.available ? "available" : "taken") : "invalid");
      } catch {
        setStatus("idle");
      }
    }, 400);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [value, check]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "available") return;
    setSaving(true);
    setError(null);
    try {
      await claim({ data: { username: value.trim().toLowerCase() } });
      await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      navigate({ to: "/", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-background px-5">
      <header className="flex items-center justify-center pt-10">
        <Wordmark />
      </header>
      <section className="flex flex-1 flex-col justify-center pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto w-full max-w-sm"
        >
          <h1 className="font-display text-4xl text-foreground">
            Pick your name for the journal
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This is your public handle — lowercase letters, numbers and
            underscores.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-3">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-muted-foreground">
                @
              </span>
              <input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/\s/g, ""))}
                placeholder="yourname"
                maxLength={20}
                className="w-full rounded-2xl border border-input bg-card py-3.5 pl-9 pr-10 text-base outline-none ring-ring focus:border-ring focus:ring-2"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2">
                {status === "checking" && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {status === "available" && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </span>
            </div>

            <p className="min-h-5 text-sm">
              {status === "available" && (
                <span className="font-medium text-primary">Available</span>
              )}
              {status === "taken" && (
                <span className="text-muted-foreground">
                  Taken, try another.
                </span>
              )}
              {status === "invalid" && value && (
                <span className="text-muted-foreground">
                  Use 3–20 lowercase letters, numbers or underscores.
                </span>
              )}
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={status !== "available" || saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-[0_6px_18px_-8px_rgba(60,50,72,0.45)] hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Confirm"}
            </motion.button>
          </form>
        </motion.div>
      </section>
    </main>
  );
}
