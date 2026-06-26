import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Camera,
  Clock,
  Globe,
  Lock,
  MapPin,
  Plus,
  RotateCcw,
  Upload,
} from "lucide-react";

import heroAnimals from "@/assets/hero-animals.jpg";
import { useRequireUsername } from "@/hooks/use-profile";
import { identifyAnimal, type AnimalIdentification } from "@/lib/identify.functions";
import { fileToDataUrl, getCurrentLocation, makeThumbnail } from "@/lib/sightings";
import {
  createSighting,
  listMySightings,
  resolvePlaceNames,
  type DbSighting,
} from "@/lib/sightings.functions";
import { speciesGradient } from "@/lib/species-color";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Log a Sighting — Wildlog" },
      {
        name: "description",
        content:
          "Snap or upload a photo and Wildlog identifies the species in seconds, then saves it to your life list.",
      },
      { property: "og:title", content: "Log a Sighting — Wildlog" },
      {
        property: "og:description",
        content:
          "Snap or upload a photo and Wildlog identifies the species in seconds, then saves it to your life list.",
      },
      { property: "og:url", content: "https://wildlog.life/" },
    ],
    links: [{ rel: "canonical", href: "https://wildlog.life/" }],
  }),
  component: LogFlow,
});

type Phase = "dashboard" | "scanning" | "result";
type Loc = { lat: number; lng: number } | null;

function LogFlow() {
  useRequireUsername();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const identify = useServerFn(identifyAnimal);
  const create = useServerFn(createSighting);

  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("dashboard");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [result, setResult] = useState<AnimalIdentification | null>(null);
  const [location, setLocation] = useState<Loc>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state for the single result page.
  const [speciesName, setSpeciesName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  const sightingsQuery = useQuery({
    queryKey: ["sightings"],
    queryFn: () => listMySightings(),
  });

  function clearTransient() {
    setImageUrl(null);
    setThumb(null);
    setResult(null);
    setError(null);
    setSpeciesName("");
    setIsPublic(false);
    if (cameraRef.current) cameraRef.current.value = "";
    if (uploadRef.current) uploadRef.current.value = "";
  }

  // Back to the home dashboard.
  function goHome() {
    clearTransient();
    setPhase("dashboard");
  }


  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageUrl(dataUrl);
      setPhase("scanning");
      const locationPromise = getCurrentLocation();
      const [out, t, loc] = await Promise.all([
        identify({ data: { imageDataUrl: dataUrl } }),
        makeThumbnail(dataUrl, 640).catch(() => null),
        locationPromise,
      ]);
      setThumb(t);
      setLocation(loc);
      setResult(out);
      setSpeciesName(out.isAnimal ? out.commonName : "");
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("result");
    }
  }

  async function save() {
    const name = speciesName.trim();
    if (!name) {
      setError("Give this sighting a name first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await create({
        data: {
          image_url: thumb,
          common_name: name,
          scientific_name: result?.scientificName || null,
          animal_group: result?.group || null,
          confidence: result?.confidence || null,
          description: result?.description || null,
          note: result?.note || null,
          is_animal: result ? result.isAnimal : true,
          is_public: isPublic,
          lat: location?.lat ?? null,
          lng: location?.lng ?? null,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["sightings"] });
      goHome();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <section className="mx-auto max-w-md px-5 pt-6">
        <h1 className="sr-only">Log a wildlife sighting</h1>

      <AnimatePresence mode="wait">
          {phase === "dashboard" && (
            <Dashboard
              key="dashboard"
              sightings={sightingsQuery.data ?? []}
              onCamera={() => cameraRef.current?.click()}
              onUpload={() => uploadRef.current?.click()}
            />
          )}

          {phase === "scanning" && (
            <ScanningStep key="scanning" imageUrl={imageUrl} group={result?.group} />
          )}

          {phase === "result" &&
            (error ? (
              <ErrorStep key="error" message={error} onRetry={goHome} />
            ) : result ? (
              <ResultStep
                key="result"
                result={result}
                imageUrl={imageUrl}
                speciesName={speciesName}
                onSpeciesName={setSpeciesName}
                isPublic={isPublic}
                onPublic={setIsPublic}
                location={location}
                saving={saving}
                error={error}
                onRetry={goHome}
                onSave={save}
              />
            ) : null)}
        </AnimatePresence>
      </section>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </main>
  );
}

/* ─────────────────────────── Dashboard (home) ─────────────────────────── */

type Stats = { streak: number; thisWeek: number; total: number };

function computeStats(sightings: DbSighting[]): Stats {
  const total = sightings.length;
  const now = Date.now();
  const WEEK = 7 * 86_400_000;
  const thisWeek = sightings.filter(
    (s) => now - +new Date(s.created_at) <= WEEK,
  ).length;

  // Streak: consecutive calendar days (ending today or yesterday) with a log.
  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const days = new Set(sightings.map((s) => dayKey(new Date(s.created_at))));
  let streak = 0;
  const cursor = new Date();
  // Allow the streak to start from today or yesterday.
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { streak, thisWeek, total };
}

function StatPill({
  value,
  label,
  dot = false,
}: {
  value: number;
  label: string;
  dot?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 card-soft">
      {dot && <span className="h-2 w-2 rounded-full bg-primary" />}
      <span className="font-display text-[13px] leading-none">{value}</span>
      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function Dashboard({
  sightings,
  onCamera,
  onUpload,
}: {
  sightings: DbSighting[];
  onCamera: () => void;
  onUpload: () => void;
}) {
  const resolve = useServerFn(resolvePlaceNames);
  const queryClient = useQueryClient();
  const stats = useMemo(() => computeStats(sightings), [sightings]);
  const recent = useMemo(() => sightings.slice(0, 5), [sightings]);

  // Species logged exactly once are "new" to the collection.
  const newKeys = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sightings) {
      const k = s.common_name.trim().toLowerCase();
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return new Set([...counts].filter(([, n]) => n === 1).map(([k]) => k));
  }, [sightings]);

  // Backfill readable place names for recent rows that don't have one yet.
  useEffect(() => {
    const missing = recent
      .filter((s) => !s.place_name && s.lat != null && s.lng != null)
      .map((s) => s.id);
    if (missing.length === 0) return;
    let cancelled = false;
    resolve({ data: { ids: missing } })
      .then((map) => {
        if (cancelled || !map || Object.keys(map).length === 0) return;
        queryClient.setQueryData<DbSighting[]>(["sightings"], (old) =>
          (old ?? []).map((s) =>
            map[s.id] ? { ...s, place_name: map[s.id] } : s,
          ),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [recent, resolve, queryClient]);

  const today = new Date();
  const dateLine = today
    .toLocaleDateString(undefined, {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase()
    .replace(/,/g, " ·");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      {/* Header row: title + small floating animal hero */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {dateLine}
          </p>
          <h2 className="mt-2 font-display text-[2.4rem] uppercase leading-[0.95]">
            What did you spot?
          </h2>
        </div>
        <motion.img
          src={heroAnimals}
          alt="Hand-painted illustration of a fox, owl, deer and frog"
          width={1024}
          height={1024}
          className="blob h-20 w-20 shrink-0 animate-float object-cover"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        />
      </div>

      {/* Stat pills */}
      <div className="mt-5 flex flex-wrap gap-2.5">
        <StatPill value={stats.streak} label="day streak" dot />
        <StatPill value={stats.thisWeek} label="this week" />
        <StatPill value={stats.total} label="total" />
      </div>

      {/* Primary CTA */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={onCamera}
        className="mt-6 flex h-[60px] w-full items-center justify-center gap-2.5 rounded-full bg-primary font-display text-base uppercase tracking-wide text-primary-foreground shadow-[0_8px_22px_-10px_rgba(60,50,72,0.5)]"
      >
        <Camera className="h-5 w-5" strokeWidth={2.4} /> Log a sighting
      </motion.button>

      {/* Secondary CTA */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={onUpload}
        className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-primary/40 bg-card font-display text-sm uppercase tracking-wide text-foreground shadow-[0_4px_14px_-8px_rgba(60,50,72,0.3)]"
      >
        <Upload className="h-4 w-4" strokeWidth={2.4} /> Upload a previous photo
      </motion.button>

      {/* Recent sightings */}
      {recent.length > 0 ? (
        <div className="mt-9">
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Recent sightings
          </h3>
          <ul className="space-y-1">
            {recent.map((s, i) => (
              <RecentRow
                key={s.id}
                sighting={s}
                index={i}
                isNew={newKeys.has(s.common_name.trim().toLowerCase())}
              />
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-10 text-center text-sm italic text-foreground/40">
          No sightings yet — log your first one above.
        </p>
      )}
    </motion.div>
  );
}

function RecentRow({
  sighting,
  index,
  isNew,
}: {
  sighting: DbSighting;
  index: number;
  isNew: boolean;
}) {
  const d = new Date(sighting.created_at);
  const date = d
    .toLocaleDateString(undefined, { day: "2-digit", month: "short" })
    .toUpperCase();
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const blobClass = index % 2 === 0 ? "blob" : "blob-alt";

  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index, 6) * 0.05, duration: 0.3 }}
      className="flex items-center gap-3.5 border-b border-border/70 py-3 last:border-0"
    >
      <span
        className={`${blobClass} h-12 w-12 shrink-0 overflow-hidden`}
        style={{
          background: speciesGradient(sighting.animal_group, sighting.common_name),
        }}
      >
        {sighting.image_url && (
          <img
            src={sighting.image_url}
            alt={`Photo of ${sighting.common_name}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <h4 className="truncate font-display text-[15px] uppercase leading-tight">
          {sighting.common_name}
        </h4>
        {sighting.place_name && (
          <p className="truncate text-[13px] text-foreground/70">
            {sighting.place_name}
          </p>
        )}
        <p className="mt-0.5 font-mono text-[10px] tracking-wide text-muted-foreground">
          {date} · {time}
        </p>
      </div>

      {isNew && <span className="badge badge-moss shrink-0">New</span>}
    </motion.li>
  );
}


/* ─────────────────────────── Step 2 · Scanning ────────────────────────── */

function ScanningStep({
  imageUrl,
  group,
}: {
  imageUrl: string | null;
  group?: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative overflow-hidden rounded-[26px]">
        <div
          className="aspect-[4/3] w-full"
          style={{ background: speciesGradient(group, "scan") }}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Photo being identified"
              className="h-full w-full object-cover"
            />
          )}
        </div>
        {/* Sweep beam */}
        <span className="pointer-events-none absolute inset-y-0 left-0 w-1/4 animate-scan bg-gradient-to-r from-transparent via-cream/30 to-transparent" />
        {/* Identifying badge */}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-plum-deep/80 px-2.5 py-1 backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-cream">
            Identifying
          </span>
        </span>
        {/* Progress bar */}
        <span className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-white/20">
          <span className="block h-full w-1/3 animate-scan bg-primary-foreground/90" />
        </span>
      </div>

      <div className="mt-8 flex flex-col items-center text-center">
        <span className="blob-spin h-12 w-12 bg-primary" aria-hidden />
        <h2 className="mt-5 font-display text-2xl">Checking the field guide…</h2>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Matching against millions of species records.
        </p>
        <div className="mt-4 flex gap-1.5">
          {[0, 0.22, 0.44].map((d) => (
            <motion.span
              key={d}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: d }}
              className="h-1.5 w-1.5 rounded-full bg-primary"
            />
          ))}
        </div>
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">
          Usually 2–3 seconds
        </p>
      </div>
    </motion.div>
  );
}

/* ───────────────────── Step 3 · Result (single page) ──────────────────── */

function ResultStep({
  result,
  imageUrl,
  speciesName,
  onSpeciesName,
  isPublic,
  onPublic,
  location,
  saving,
  error,
  onRetry,
  onSave,
}: {
  result: AnimalIdentification;
  imageUrl: string | null;
  speciesName: string;
  onSpeciesName: (v: string) => void;
  isPublic: boolean;
  onPublic: (v: boolean) => void;
  location: Loc;
  saving: boolean;
  error: string | null;
  onRetry: () => void;
  onSave: () => void;
}) {
  const isAnimal = result.isAnimal;
  const fill =
    result.confidence === "high" ? 88 : result.confidence === "medium" ? 60 : 28;
  const high = result.confidence === "high";
  const now = new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      {imageUrl && (
        <div className="relative -mx-5 -mt-6">
          <img
            src={imageUrl}
            alt={`Photo of ${result.commonName}`}
            className="h-64 w-full object-cover"
          />
          <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
        </div>
      )}

      {/* Species name */}
      {isAnimal ? (
        <div className="mt-4 flex items-center gap-3">
          <span
            className="blob h-12 w-12 shrink-0"
            style={{ background: speciesGradient(result.group, result.commonName) }}
            aria-hidden
          />
          <div className="min-w-0">
            <h2 className="font-display text-2xl leading-tight">{result.commonName}</h2>
            {result.scientificName && (
              <p className="truncate text-xs italic text-muted-foreground">
                {result.scientificName}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            No animal spotted — name it yourself
          </p>
          <input
            value={speciesName}
            onChange={(e) => onSpeciesName(e.target.value)}
            placeholder="What was it? (name it)"
            className="w-full rounded-2xl border-[1.5px] border-input bg-card px-3.5 py-3 text-sm outline-none focus:border-ring"
          />
        </div>
      )}

      {/* Confidence bar */}
      {isAnimal && (
        <div className="mt-4 flex items-center gap-2.5">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/[0.08]">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${fill}%`,
                background: high ? "var(--moss)" : "rgba(110,97,119,0.45)",
              }}
            />
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-wide"
            style={{ color: high ? "var(--moss)" : "var(--muted-foreground)" }}
          >
            {result.confidence} confidence
          </span>
        </div>
      )}

      {/* Large description */}
      {result.description && (
        <p className="mt-4 text-[15px] leading-relaxed text-foreground/80">
          {result.description}
        </p>
      )}

      {/* Photo-specific observation */}
      {result.note && (
        <p className="mt-4 rounded-[18px] bg-peach-light px-4 py-3 text-[13px] leading-relaxed text-plum">
          {result.note}
        </p>
      )}

      {/* Location + date */}
      <div className="mt-5 rounded-2xl bg-card">
        <div className="flex items-center gap-3 border-b border-border px-3.5 py-3">
          <MapPin className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground">
              {location ? "Current location" : "No location"}
            </p>
            <p className="font-mono text-[9.5px] text-muted-foreground">
              {location
                ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                : "Allow location to pin this sighting"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-3.5 py-3">
          <Clock className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground">
              {now.toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
            <p className="font-mono text-[9.5px] text-muted-foreground">
              {now.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Visibility */}
      <div className="mt-4 flex rounded-full bg-muted p-1">
        <button
          type="button"
          onClick={() => onPublic(false)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
            !isPublic ? "bg-plum text-paper" : "text-foreground/70"
          }`}
        >
          <Lock className="h-3.5 w-3.5" /> Private
        </button>
        <button
          type="button"
          onClick={() => onPublic(true)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
            isPublic ? "bg-plum text-paper" : "text-foreground/70"
          }`}
        >
          <Globe className="h-3.5 w-3.5" /> Public
        </button>
      </div>

      {error && <p className="mt-3 text-center text-sm text-destructive">{error}</p>}

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="mt-5 flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-primary font-display text-[15px] uppercase tracking-wide text-primary-foreground disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save to Life List ✦"}
      </button>

      <button
        type="button"
        onClick={onRetry}
        className="mx-auto mt-4 flex items-center gap-1.5 text-[12px] font-medium text-foreground/40 underline underline-offset-[3px]"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Not this? Try another photo
      </button>
    </motion.div>
  );
}

function ErrorStep({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="pt-10 text-center"
    >
      <p className="text-sm text-destructive">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        <RotateCcw className="h-4 w-4" /> Try again
      </button>
    </motion.div>
  );
}

