import { useEffect, useState } from "react";
import { Mail, Phone, Check, Plus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

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
        <PhoneRow phone={phone} />
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

function PhoneRow({ phone }: { phone: string | null }) {
  const [showSoon, setShowSoon] = useState(false);

  if (phone) {
    return <Row icon={<Phone className="h-4 w-4" />} label="Phone" value={phone} verified />;
  }

  if (showSoon) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            <Phone className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Phone sign-in is coming soon</p>
            <p className="text-xs text-muted-foreground">
              You'll be able to add and verify a number here shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AddRow
      icon={<Phone className="h-4 w-4" />}
      label="Add phone"
      onClick={() => setShowSoon(true)}
    />
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
