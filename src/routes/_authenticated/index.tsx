import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Clock,
  Globe,
  Lock,
  MapPin,
  RotateCcw,
  Upload,
  Zap,
} from "lucide-react";

import { useRequireUsername } from "@/hooks/use-profile";
import { identifyAnimal, type AnimalIdentification } from "@/lib/identify.functions";
import { fileToDataUrl, getCurrentLocation, makeThumbnail } from "@/lib/sightings";
import { createSighting } from "@/lib/sightings.functions";
import { speciesGradient } from "@/lib/species-color";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Log a Sighting — Wildlog" },
      {
        name: "description",
        content:
          "Snap or upload a photo and Wildlog identifies the species in seconds, then saves it to your life list with a note worth keeping.",
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

type Phase = "capture" | "scanning" | "result" | "memory" | "saved";
type Loc = { lat: number; lng: number } | null;

function LogFlow() {
  useRequireUsername();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const identify = useServerFn(identifyAnimal);
  const create = useServerFn(createSighting);

  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("capture");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [result, setResult] = useState<AnimalIdentification | null>(null);
  const [location, setLocation] = useState<Loc>(null);
  const [error, setError] = useState<string | null>(null);

  // Memory form state.
  const [speciesName, setSpeciesName] = useState("");
  const [note, setNote] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setPhase("capture");
    setImageUrl(null);
    setThumb(null);
    setResult(null);
    setError(null);
    setSpeciesName("");
    setNote("");
    setIsPublic(false);
    if (cameraRef.current) cameraRef.current.value = "";
    if (uploadRef.current) uploadRef.current.value = "";
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

  // "No photo" — skip straight to a manual memory entry.
  function skipPhoto() {
    setResult(null);
    setImageUrl(null);
    setThumb(null);
    setSpeciesName("");
    getCurrentLocation().then(setLocation);
    setPhase("memory");
  }

  function confirmMatch() {
    getCurrentLocation().then((l) => setLocation((p) => p ?? l));
    setPhase("memory");
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
          note: note.trim() || null,
          is_animal: result ? result.isAnimal : true,
          is_public: isPublic,
          lat: location?.lat ?? null,
          lng: location?.lng ?? null,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["sightings"] });
      setPhase("saved");
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
          {phase === "capture" && (
            <CaptureStep
              key="capture"
              onCamera={() => cameraRef.current?.click()}
              onUpload={() => uploadRef.current?.click()}
              onSkip={skipPhoto}
            />
          )}

          {phase === "scanning" && (
            <ScanningStep key="scanning" imageUrl={imageUrl} group={result?.group} />
          )}

          {phase === "result" &&
            (error ? (
              <ErrorStep key="error" message={error} onRetry={reset} />
            ) : result && !result.isAnimal ? (
              <NotAnimalStep
                key="not-animal"
                description={result.description}
                onRetry={reset}
                onLogAnyway={() => {
                  setSpeciesName("");
                  setPhase("memory");
                }}
              />
            ) : (
              result && (
                <ResultStep
                  key="result"
                  result={result}
                  imageUrl={imageUrl}
                  onConfirm={confirmMatch}
                  onRetry={reset}
                />
              )
            ))}

          {phase === "memory" && (
            <MemoryStep
              key="memory"
              result={result}
              imageUrl={imageUrl}
              speciesName={speciesName}
              onSpeciesName={setSpeciesName}
              note={note}
              onNote={setNote}
              isPublic={isPublic}
              onPublic={setIsPublic}
              location={location}
              saving={saving}
              error={error}
              onBack={() => setPhase(result ? "result" : "capture")}
              onSave={save}
            />
          )}

          {phase === "saved" && (
            <SavedStep
              key="saved"
              name={speciesName}
              group={result?.group}
              imageUrl={thumb}
              onAnother={reset}
              onView={() => navigate({ to: "/life-list" })}
            />
          )}
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

/* ─────────────────────────── Step 1 · Capture ─────────────────────────── */

function CaptureStep({
  onCamera,
  onUpload,
  onSkip,
}: {
  onCamera: () => void;
  onUpload: () => void;
  onSkip: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      {/* Viewfinder */}
      <button
        type="button"
        onClick={onCamera}
        aria-label="Open camera"
        className="relative block aspect-[4/5] w-full overflow-hidden rounded-[26px]"
        style={{ backgroundColor: "#110C1E" }}
      >
        {/* Grid lines */}
        <span className="pointer-events-none absolute inset-0" aria-hidden>
          <span className="absolute inset-y-0 left-1/3 w-px bg-white/[0.07]" />
          <span className="absolute inset-y-0 left-2/3 w-px bg-white/[0.07]" />
          <span className="absolute inset-x-0 top-1/3 h-px bg-white/[0.07]" />
          <span className="absolute inset-x-0 top-2/3 h-px bg-white/[0.07]" />
        </span>
        {/* Top controls */}
        <span className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-4">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 backdrop-blur">
            <ArrowLeft className="h-4 w-4 text-white/80" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/70">
            Capture the moment
          </span>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 backdrop-blur">
            <Zap className="h-4 w-4 text-white/80" />
          </span>
        </span>
        {/* Focus bracket */}
        <span className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2" aria-hidden>
          {(["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "left-0 bottom-0 border-l-2 border-b-2", "right-0 bottom-0 border-r-2 border-b-2"] as const).map(
            (pos) => (
              <span key={pos} className={`absolute h-5 w-5 border-white/60 ${pos}`} />
            ),
          )}
        </span>
        <span className="absolute inset-x-0 bottom-4 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-white/30">
          Tap to focus
        </span>
      </button>

      {/* Controls row */}
      <div className="mt-6 flex items-center justify-between px-2">
        <button
          type="button"
          onClick={onUpload}
          aria-label="Upload a photo"
          className="grid h-[52px] w-[52px] place-items-center rounded-full bg-card shadow-[0_4px_16px_-8px_rgba(60,50,72,0.3)]"
        >
          <Upload className="h-5 w-5 text-foreground" strokeWidth={2} />
        </button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={onCamera}
          aria-label="Take a photo"
          className="grid h-[76px] w-[76px] place-items-center bg-primary blob shadow-[0_6px_20px_-6px_rgba(60,50,72,0.4)]"
        >
          <span className="h-[60px] w-[60px] rounded-full border-[3px] border-primary-foreground" />
        </motion.button>

        <button
          type="button"
          onClick={onSkip}
          className="flex w-[52px] flex-col items-center text-center"
        >
          <span className="text-[13px] font-medium text-muted-foreground">Skip</span>
          <span className="text-[10px] text-muted-foreground/70">No photo</span>
        </button>
      </div>

      <p className="mt-6 text-center text-sm italic text-foreground/40">
        Log every sighting, no matter how wild.
      </p>
    </motion.div>
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

/* ─────────────────────────── Step 3 · Result ──────────────────────────── */

function ResultStep({
  result,
  imageUrl,
  onConfirm,
  onRetry,
}: {
  result: AnimalIdentification;
  imageUrl: string | null;
  onConfirm: () => void;
  onRetry: () => void;
}) {
  const fill =
    result.confidence === "high" ? 88 : result.confidence === "medium" ? 60 : 28;
  const high = result.confidence === "high";

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

      <h2 className="mt-4 font-display text-2xl">What did you see?</h2>

      <button
        type="button"
        onClick={onConfirm}
        className="card-journal organic-1 mt-4 flex w-full items-center gap-3.5 bg-card p-3.5 text-left"
      >
        <span
          className="blob h-[50px] w-[50px] shrink-0"
          style={{ background: speciesGradient(result.group, result.commonName) }}
        />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-sm">{result.commonName}</span>
          {result.scientificName && (
            <span className="block truncate text-[10px] italic text-muted-foreground">
              {result.scientificName}
            </span>
          )}
          <span className="mt-2 flex items-center gap-2">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/[0.08]">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${fill}%`,
                  background: high ? "var(--moss)" : "rgba(110,97,119,0.45)",
                }}
              />
            </span>
            <span
              className="text-[8px] font-bold uppercase tracking-wide"
              style={{ color: high ? "var(--moss)" : "var(--muted-foreground)" }}
            >
              {result.confidence}
            </span>
          </span>
        </span>
        <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-4 w-4" />
        </span>
      </button>

      {result.note && (
        <p className="mt-3 rounded-2xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">
          {result.note}
        </p>
      )}

      <button
        type="button"
        onClick={onRetry}
        className="mx-auto mt-5 block text-[11px] font-medium text-foreground/40 underline underline-offset-[3px]"
      >
        Not this? Try another photo
      </button>
    </motion.div>
  );
}

function NotAnimalStep({
  description,
  onRetry,
  onLogAnyway,
}: {
  description: string;
  onRetry: () => void;
  onLogAnyway: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      className="pt-6"
    >
      <div className="card-journal organic-2 bg-card px-5 py-7 text-center">
        <span
          className="mx-auto block h-[70px] w-[70px] blob"
          style={{
            background: "radial-gradient(ellipse at 42% 40%, #E8B898, #C88860)",
          }}
          aria-hidden
        />
        <h2 className="mt-5 font-display text-xl">No creature spotted</h2>
        <p className="mx-auto mt-2 max-w-[240px] text-[13px] leading-relaxed text-muted-foreground">
          {description ||
            "We couldn't find an animal here. Maybe it was a plant, a track, or just a feeling."}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <button
          type="button"
          onClick={onRetry}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-primary font-display text-sm uppercase tracking-wide text-primary-foreground"
        >
          <Camera className="h-4 w-4" /> Try another photo
        </button>
        <button
          type="button"
          onClick={onLogAnyway}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-input bg-card text-sm font-medium text-foreground"
        >
          Log the memory anyway <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-5 text-center text-sm italic text-foreground/40">
        Every moment in nature is worth keeping.
      </p>
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

/* ─────────────────────────── Step 4 · The Memory ──────────────────────── */

function MemoryStep({
  result,
  imageUrl,
  speciesName,
  onSpeciesName,
  note,
  onNote,
  isPublic,
  onPublic,
  location,
  saving,
  error,
  onBack,
  onSave,
}: {
  result: AnimalIdentification | null;
  imageUrl: string | null;
  speciesName: string;
  onSpeciesName: (v: string) => void;
  note: string;
  onNote: (v: string) => void;
  isPublic: boolean;
  onPublic: (v: boolean) => void;
  location: Loc;
  saving: boolean;
  error: string | null;
  onBack: () => void;
  onSave: () => void;
}) {
  const confirmed = !!result?.isAnimal;
  const now = new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center gap-3 pb-1">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card"
        >
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        <h2 className="font-display text-2xl">The memory</h2>
      </div>

      {imageUrl && (
        <img
          src={imageUrl}
          alt={speciesName || "Your sighting"}
          className="thumb-1 mt-3 h-40 w-full object-cover"
        />
      )}

      {/* Species */}
      <div className="mt-4">
        {confirmed ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-primary/20 bg-primary/10 py-1.5 pl-2 pr-3">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="font-display text-[11px]">{speciesName}</span>
            <Check className="h-3 w-3 text-primary" />
          </span>
        ) : (
          <input
            value={speciesName}
            onChange={(e) => onSpeciesName(e.target.value)}
            placeholder="What was it? (name it)"
            className="w-full rounded-2xl border-[1.5px] border-input bg-card px-3.5 py-3 text-sm outline-none focus:border-ring"
          />
        )}
      </div>

      {/* Location + date */}
      <div className="mt-4 rounded-2xl bg-card">
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

      {/* Note */}
      <div className="relative mt-4">
        <textarea
          value={note}
          onChange={(e) => onNote(e.target.value)}
          placeholder="What made this one memorable?"
          className="min-h-[88px] w-full resize-none rounded-2xl border-[1.5px] border-input bg-card px-3.5 py-3.5 text-sm italic text-foreground outline-none placeholder:text-foreground/30 focus:border-ring"
        />
        {note.length === 0 && (
          <span className="animate-cursor-blink pointer-events-none absolute left-[88px] top-[18px] h-[18px] w-0.5 bg-primary" />
        )}
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
    </motion.div>
  );
}

/* ─────────────────────────── Saved ────────────────────────────────────── */

function SavedStep({
  name,
  group,
  imageUrl,
  onAnother,
  onView,
}: {
  name: string;
  group?: string | null;
  imageUrl: string | null;
  onAnother: () => void;
  onView: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center pt-14 text-center"
    >
      <span
        className="grid h-24 w-24 place-items-center blob"
        style={{ background: speciesGradient(group, name) }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="h-full w-full blob object-cover" />
        ) : (
          <Check className="h-10 w-10 text-paper" />
        )}
      </span>
      <h2 className="mt-6 font-display text-2xl">Saved to your life list</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        {name ? `“${name}” is now part of your collection.` : "Your sighting is saved."}
      </p>
      <div className="mt-7 w-full max-w-xs space-y-3">
        <button
          type="button"
          onClick={onView}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground"
        >
          View life list
        </button>
        <button
          type="button"
          onClick={onAnother}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-medium text-foreground"
        >
          <Camera className="h-4 w-4" /> Log another
        </button>
      </div>
      <Link to="/life-list" className="sr-only">
        Go to life list
      </Link>
    </motion.div>
  );
}
