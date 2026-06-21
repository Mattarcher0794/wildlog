import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Mail, Phone, ArrowLeft } from "lucide-react";

import { Wordmark } from "@/components/Brand";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { verifyAuthEmailCode } from "@/lib/auth.functions";
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

type Method = "email" | "phone";
type Step = "contact" | "code";

function normalizePhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  // Keep a leading +, strip everything else that isn't a digit.
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

function isValidPhone(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(value);
}

function AuthPage() {
  const navigate = useNavigate();
  const verifyAuthCode = useServerFn(verifyAuthEmailCode);
  const [method, setMethod] = useState<Method>("email");
  const [step, setStep] = useState<Step>("contact");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const verifyingRef = useRef(false);

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

  function switchMethod(next: Method) {
    if (next === method) return;
    setMethod(next);
    setStep("contact");
    setError(null);
    setCode("");
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    if (method === "phone") {
      const normalized = normalizePhone(phone);
      if (!isValidPhone(normalized)) {
        setError("Enter your number with country code, e.g. +44 7700 900123.");
        return;
      }
      setPhone(normalized);
      setBusy(true);
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalized,
        options: { shouldCreateUser: true },
      });
      setBusy(false);
      if (error) {
        setError(error.message);
        return;
      }
      setStep("code");
      setCode("");
      setCooldown(60);
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
      },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep("code");
    setCode("");
    setCooldown(60);
  }

  async function verifyCode(token: string) {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setError(null);
    setBusy(true);
    try {
      if (method === "phone") {
        const { error } = await supabase.auth.verifyOtp({
          phone: normalizePhone(phone),
          token,
          type: "sms",
        });
        if (error) throw error;
        navigate({ to: "/", replace: true });
        return;
      }

      const session = await verifyAuthCode({
        data: { email: email.trim(), code: token },
      });
      const { error: sessionError } = await supabase.auth.setSession(session);
      if (sessionError) throw sessionError;
      navigate({ to: "/", replace: true });
    } catch {
      setError("That code's wrong or expired. Try again, or send a new one.");
      setCode("");
    } finally {
      setBusy(false);
      verifyingRef.current = false;
    }
  }

  function onCodeChange(value: string) {
    setCode(value);
    setError(null);
    if (value.length === 6) verifyCode(value);
  }

  const sentTo = method === "phone" ? normalizePhone(phone) : email;

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
          {step === "contact" ? (
            <>
              <h1 className="font-display text-4xl text-foreground">Sign in to start logging</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                We'll send you a 6-digit code — no password to remember.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
                <button
                  type="button"
                  onClick={() => switchMethod("email")}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    method === "email"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  <Mail className="h-4 w-4" /> Email
                </button>
                <button
                  type="button"
                  onClick={() => switchMethod("phone")}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    method === "phone"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  <Phone className="h-4 w-4" /> Phone
                </button>
              </div>

              <form onSubmit={sendCode} className="mt-6 space-y-3">
                {method === "email" ? (
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full rounded-2xl border border-input bg-card px-4 py-3.5 text-base outline-none ring-ring focus:border-ring focus:ring-2"
                  />
                ) : (
                  <input
                    type="tel"
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+44 7700 900123"
                    className="w-full rounded-2xl border border-input bg-card px-4 py-3.5 text-base outline-none ring-ring focus:border-ring focus:ring-2"
                  />
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={busy || (method === "email" ? !email.trim() : !phone.trim())}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-[0_6px_18px_-8px_rgba(60,50,72,0.45)] hover:bg-primary/90 disabled:opacity-60"
                >
                  {method === "email" ? <Mail className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                  {busy ? "Sending…" : "Send code"}
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
                {method === "phone" ? (
                  <Phone className="h-8 w-8 text-plum" />
                ) : (
                  <Mail className="h-8 w-8 text-plum" />
                )}
              </motion.div>
              <h1 className="mt-6 font-display text-3xl text-foreground">
                {method === "phone" ? "Check your messages" : "Check your email"}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Enter the 6-digit code we sent to{" "}
                <span className="font-semibold text-foreground">{sentTo}</span>.
              </p>

              <div className="mt-8 flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={onCodeChange}
                  disabled={busy}
                  autoFocus
                >
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="h-14 w-12 shrink-0 rounded-2xl !border-l border-input bg-card text-xl font-semibold first:rounded-l-2xl last:rounded-r-2xl"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
              {busy && <p className="mt-4 text-sm text-muted-foreground">Confirming…</p>}

              <button
                onClick={() => sendCode()}
                disabled={cooldown > 0 || busy}
                className="mt-6 text-sm font-semibold text-primary hover:underline disabled:opacity-50"
              >
                {cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send a new code"}
              </button>
              <div>
                <button
                  onClick={() => {
                    setStep("contact");
                    setError(null);
                    setCode("");
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />{" "}
                  {method === "phone" ? "Use a different number" : "Use a different email"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </section>
    </main>
  );
}
