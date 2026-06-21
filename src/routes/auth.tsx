import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Mail, ArrowLeft } from "lucide-react";

import { Wordmark } from "@/components/Brand";
import { supabase } from "@/integrations/supabase/client";
import { ONBOARDED_KEY } from "./onboarding";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · Wildlog" },
      {
        name: "description",
        content: "Sign in to Wildlog to start logging your wildlife sightings.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: "/", replace: true });
        return;
      }
      let onboarded = false;
      try {
        onboarded = localStorage.getItem(ONBOARDED_KEY) === "1";
      } catch {
        onboarded = false;
      }
      if (!onboarded) navigate({ to: "/onboarding", replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendLink(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: true,
      },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
    setCooldown(60);
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
          {!sent ? (
            <>
              <h1 className="font-display text-4xl text-foreground">
                Sign in to start logging
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                We'll email you a magic link — no password to remember.
              </p>
              <form onSubmit={sendLink} className="mt-8 space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full rounded-2xl border border-input bg-card px-4 py-3.5 text-base outline-none ring-ring focus:border-ring focus:ring-2"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={busy || !email.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-[0_6px_18px_-8px_rgba(60,50,72,0.45)] hover:bg-primary/90 disabled:opacity-60"
                >
                  <Mail className="h-5 w-5" />
                  {busy ? "Sending…" : "Send magic link"}
                </motion.button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="mx-auto flex h-20 w-20 items-center justify-center blob bg-peach"
              >
                <Mail className="h-8 w-8 text-plum" />
              </motion.div>
              <h1 className="mt-6 font-display text-3xl text-foreground">
                Check your email
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Tap the link we sent to{" "}
                <span className="font-semibold text-foreground">{email}</span> to
                jump back in.
              </p>
              <button
                onClick={() => sendLink()}
                disabled={cooldown > 0 || busy}
                className="mt-6 text-sm font-semibold text-primary hover:underline disabled:opacity-50"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend link"}
              </button>
              <div>
                <button
                  onClick={() => {
                    setSent(false);
                    setError(null);
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" /> Use a different email
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </section>
    </main>
  );
}
