import { useEffect, useRef, useState } from "react";
import { Mail, Phone, Check, Plus } from "lucide-react";

import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";

function normalizePhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

function isValidPhone(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(value);
}

function friendlyAuthError(err: unknown, fallback: string): string {
  const raw =
    err && typeof err === "object" && "message" in err
      ? String((err as { message?: unknown }).message ?? "")
      : typeof err === "string"
        ? err
        : "";
  const msg = raw.trim();
  if (!msg || msg === "{}" || /SMS provider|phone provider|provider/i.test(msg)) {
    return fallback;
  }
  return msg;
}


export function AccountContact() {
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    const { data } = await supabase.auth.getUser();
    setEmail(data.user?.email ?? null);
    setPhone(data.user?.phone ? `+${data.user.phone.replace(/\D/g, "")}` : null);
    setLoaded(true);
  }

  useEffect(() => {
    refresh();
  }, []);

  if (!loaded) return null;

  return (
    <div className="card-journal bg-card p-5 text-left">
      <h2 className="font-display text-xl text-foreground">Contact details</h2>
      {!email && (
        <p className="mt-1 text-sm text-muted-foreground">
          Add an email so you never lose access to your account.
        </p>
      )}

      <div className="mt-4 space-y-3">
        <EmailRow email={email} onSaved={refresh} />
        <PhoneRow phone={phone} onSaved={refresh} />
      </div>
    </div>
  );
}

function EmailRow({ email, onSaved }: { email: string | null; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: value.trim() });
    setBusy(false);
    if (error) {
      setError(friendlyAuthError(error, "Couldn't save that email. Please try again."));
      return;
    }
    setSent(true);
    setEditing(false);
    onSaved();
  }

  if (email) {
    return (
      <Row icon={<Mail className="h-4 w-4" />} label="Email" value={email} verified />
    );
  }

  if (sent) {
    return (
      <Row
        icon={<Mail className="h-4 w-4" />}
        label="Email"
        value={`Confirmation sent to ${value.trim()}`}
      />
    );
  }

  if (!editing) {
    return (
      <AddRow
        icon={<Mail className="h-4 w-4" />}
        label="Add email"
        onClick={() => setEditing(true)}
      />
    );
  }

  return (
    <form onSubmit={save} className="space-y-2">
      <input
        type="email"
        required
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="you@email.com"
        className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none ring-ring focus:border-ring focus:ring-2"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="inline-flex flex-1 items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Send confirmation"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-full border border-border px-4 py-2.5 text-sm text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function PhoneRow({ phone, onSaved }: { phone: string | null; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [stage, setStage] = useState<"input" | "code">("input");
  const [value, setValue] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verifyingRef = useRef(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalized = normalizePhone(value);
    if (!isValidPhone(normalized)) {
      setError("Enter your number with country code, e.g. +44 7700 900123.");
      return;
    }
    setValue(normalized);
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ phone: normalized });
    setBusy(false);
    if (error) {
      setError(
        friendlyAuthError(error, "Text-message verification isn't available right now."),
      );
      return;
    }
    setStage("code");
    setCode("");
  }

  async function verify(token: string) {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: normalizePhone(value),
      token,
      type: "phone_change",
    });
    setBusy(false);
    verifyingRef.current = false;
    if (error) {
      setError("That code's wrong or expired. Try again.");
      setCode("");
      return;
    }
    setEditing(false);
    setStage("input");
    onSaved();
  }

  function onCodeChange(v: string) {
    setCode(v);
    setError(null);
    if (v.length === 6) verify(v);
  }

  if (phone) {
    return (
      <Row icon={<Phone className="h-4 w-4" />} label="Phone" value={phone} verified />
    );
  }

  if (!editing) {
    return (
      <AddRow
        icon={<Phone className="h-4 w-4" />}
        label="Add phone"
        onClick={() => setEditing(true)}
      />
    );
  }

  if (stage === "code") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code we texted to{" "}
          <span className="font-semibold text-foreground">{normalizePhone(value)}</span>.
        </p>
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={code} onChange={onCodeChange} disabled={busy} autoFocus>
            <InputOTPGroup className="gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className="h-12 w-10 shrink-0 rounded-2xl !border-l border-input bg-background text-lg font-semibold first:rounded-l-2xl last:rounded-r-2xl"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="button"
          onClick={() => {
            setStage("input");
            setError(null);
            setCode("");
          }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Use a different number
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={sendCode} className="space-y-2">
      <input
        type="tel"
        required
        autoFocus
        inputMode="tel"
        autoComplete="tel"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="+44 7700 900123"
        className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none ring-ring focus:border-ring focus:ring-2"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="inline-flex flex-1 items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send code"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-full border border-border px-4 py-2.5 text-sm text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Row({
  icon,
  label,
  value,
  verified,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  verified?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
      {verified && <Check className="h-4 w-4 shrink-0 text-primary" />}
    </div>
  );
}

function AddRow({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-background px-4 py-3 text-left hover:bg-secondary"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
