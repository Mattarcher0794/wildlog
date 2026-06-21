import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, RotateCcw, Upload, X, Lock, Globe } from "lucide-react";

import { Wordmark } from "@/components/Brand";
import { TabBar } from "@/components/TabBar";
import { useRequireUsername } from "@/hooks/use-profile";
import { identifyAnimal, type AnimalIdentification } from "@/lib/identify.functions";
import { fileToDataUrl, getCurrentLocation, makeThumbnail } from "@/lib/sightings";
import {
  createSighting,
  listMySightings,
  setSightingVisibility,
  type DbSighting,
} from "@/lib/sightings.functions";

export const Route = createFileRoute("/_authenticated/")({
  component: Home,
});

type Phase = "idle" | "loading" | "result" | "error";

function Home() {
  useRequireUsername();
  const queryClient = useQueryClient();
  const identify = useServerFn(identifyAnimal);
  const create = useServerFn(createSighting);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnimalIdentification | null>(null);
  const [saved, setSaved] = useState<DbSighting | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sightingsQuery = useQuery({
    queryKey: ["sightings"],
    queryFn: () => listMySightings(),
  });
  const sightings = sightingsQuery.data ?? [];

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setSaved(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageUrl(dataUrl);
      setPhase("loading");
      const locationPromise = getCurrentLocation();
      const out = await identify({ data: { imageDataUrl: dataUrl } });
      setResult(out);
      setPhase("result");

      const [thumb, location] = await Promise.all([
        makeThumbnail(dataUrl, 480).catch(() => null),
        locationPromise,
      ]);
      const row = await create({
        data: {
          image_url: thumb,
          common_name: out.commonName,
          scientific_name: out.scientificName || null,
          animal_group: out.group || null,
          confidence: out.confidence || null,
          description: out.description || null,
          note: out.note || null,
          is_animal: out.isAnimal,
          is_public: false,
          lat: location?.lat ?? null,
          lng: location?.lng ?? null,
        },
      });
      setSaved(row);
      queryClient.invalidateQueries({ queryKey: ["sightings"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("error");
    }
  }

  function reset() {
    setPhase("idle");
    setImageUrl(null);
    setResult(null);
    setSaved(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
    if (uploadRef.current) uploadRef.current.value = "";
  }

  return (
    <main className="min-h-screen pb-28">
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-6"
      >
        <Wordmark />
        <span className="rounded-full border-[1.5px] border-border px-3 py-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Field journal
        </span>
      </motion.header>

      <section className="mx-auto max-w-3xl px-5 pt-8">
        <AnimatePresence mode="wait">
          {phase === "idle" ? (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
            >
              <Hero
                onCamera={() => fileRef.current?.click()}
                onUpload={() => uploadRef.current?.click()}
              />
              {sightings.length > 0 && (
                <RecentStrip sightings={sightings.slice(0, 6)} />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="capture"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="mx-auto max-w-md"
            >
              <motion.div
                layout
                className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
              >
                {imageUrl && (
                  <div className="relative">
                    <img
                      src={imageUrl}
                      alt="Animal to identify"
                      className="aspect-square w-full object-cover"
                    />
                    {phase === "loading" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 flex items-end bg-gradient-to-t from-black/40 to-transparent p-4"
                      >
                        <ScanLine />
                      </motion.div>
                    )}
                  </div>
                )}
                <div className="p-5">
                  <AnimatePresence mode="wait">
                    {phase === "loading" && (
                      <motion.div
                        key="load"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3 text-muted-foreground"
                      >
                        <span className="blob-spin h-5 w-5 bg-primary" aria-hidden />
                        <span className="text-sm">Checking the field guide…</span>
                      </motion.div>
                    )}
                    {phase === "result" && result && (
                      <ResultCard
                        key="res"
                        result={result}
                        saved={saved}
                        onVisibilityChange={(s) => setSaved(s)}
                      />
                    )}
                    {phase === "error" && (
                      <motion.div
                        key="err"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-3"
                      >
                        <p className="text-sm text-destructive">{error}</p>
                        <button
                          onClick={reset}
                          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                          <RotateCcw className="h-4 w-4" /> Try again
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {(phase === "result" || phase === "error") && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 flex justify-center"
                >
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={reset}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    <Camera className="h-4 w-4" /> Log another
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <input
        ref={fileRef}
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

      <TabBar />
    </main>
  );
}

function Hero({ onCamera, onUpload }: { onCamera: () => void; onUpload: () => void }) {
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
        className="mx-auto mt-2 max-w-sm"
      >
        <img
          src="/src/assets/hero-animals.jpg"
          alt=""
          aria-hidden
          width={1024}
          height={1024}
          className="blob hidden"
        />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.45 }}
        className="mt-4 font-display text-5xl leading-[1.05] text-foreground sm:text-6xl"
      >
        What did you <span className="text-primary">spot?</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.45 }}
        className="mx-auto mt-3 max-w-md text-balance font-medium text-muted-foreground"
      >
        Snap a photo and Wildlog names the species, where it lives, and one thing
        worth knowing — then keeps it in your journal.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.45 }}
        className="mt-8 flex flex-col items-center gap-3"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onCamera}
          className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-[0_6px_18px_-8px_rgba(60,50,72,0.45)] hover:bg-primary/90"
        >
          <Camera className="h-5 w-5" /> Log a sighting
        </motion.button>
        <button
          onClick={onUpload}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <Upload className="h-4 w-4" /> Upload a photo instead
        </button>
      </motion.div>
    </div>
  );
}

function RecentStrip({ sightings }: { sightings: DbSighting[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.45 }}
      className="mt-14"
    >
      <div className="mb-4 flex items-end justify-between">
        <h2 className="font-display text-2xl">Recent sightings</h2>
        <Link to="/journal" className="text-sm font-semibold text-primary hover:underline">
          View all →
        </Link>
      </div>
      <motion.ul
        className="grid grid-cols-2 gap-4 sm:grid-cols-3"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      >
        {sightings.map((s, i) => (
          <motion.li
            key={s.id}
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            whileHover={{ y: -3 }}
            className="card-journal bg-card p-3"
          >
            <div className="relative mx-auto w-fit">
              {s.image_url && (
                <img
                  src={s.image_url}
                  alt={s.common_name}
                  loading="lazy"
                  className={`${i % 2 === 0 ? "blob" : "blob-alt"} aspect-square w-full object-cover`}
                />
              )}
              {i === 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm">
                  Just logged
                </span>
              )}
            </div>
            <div className="px-1 py-2">
              <p className="truncate text-sm font-semibold text-foreground">
                {s.common_name}
              </p>
              <p className="truncate text-xs italic text-muted-foreground">
                {s.scientific_name || "—"}
              </p>
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </motion.div>
  );
}

function ScanLine() {
  return (
    <div className="w-full overflow-hidden rounded-full bg-white/20 backdrop-blur">
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        className="h-1 w-1/3 bg-primary-foreground/90"
      />
    </div>
  );
}

function ResultCard({
  result,
  saved,
  onVisibilityChange,
}: {
  result: AnimalIdentification;
  saved: DbSighting | null;
  onVisibilityChange: (s: DbSighting) => void;
}) {
  const setVisibility = useServerFn(setSightingVisibility);
  const queryClient = useQueryClient();
  const visibilityMutation = useMutation({
    mutationFn: (isPublic: boolean) =>
      setVisibility({ data: { id: saved!.id, is_public: isPublic } }),
    onSuccess: (_d, isPublic) => {
      if (saved) onVisibilityChange({ ...saved, is_public: isPublic });
      queryClient.invalidateQueries({ queryKey: ["sightings"] });
    },
  });

  if (!result.isAnimal) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          <X className="h-3 w-3" /> No animal found
        </div>
        <p className="text-sm text-muted-foreground">{result.description}</p>
      </motion.div>
    );
  }

  const dot =
    result.confidence === "high"
      ? "bg-primary"
      : result.confidence === "medium"
        ? "bg-accent"
        : "bg-muted-foreground/50";

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      className="space-y-3"
    >
      <motion.div
        variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
        className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"
      >
        {result.group && (
          <span className="inline-flex items-center rounded-full border-2 border-border bg-accent px-2.5 py-1 font-bold text-accent-foreground">
            {result.group}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 360, damping: 18, delay: 0.2 }}
            className={`inline-block h-2 w-2 rounded-full ${dot}`}
          />
          {result.confidence} confidence
        </span>
      </motion.div>
      <motion.div variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}>
        <h3 className="font-display text-3xl leading-tight text-foreground">
          {result.commonName}
        </h3>
        {result.scientificName && (
          <p className="text-sm italic text-muted-foreground">
            {result.scientificName}
          </p>
        )}
      </motion.div>
      <motion.p
        variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
        className="text-sm leading-relaxed text-foreground/90"
      >
        {result.description}
      </motion.p>
      {result.note && (
        <motion.p
          variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
          className="rounded-lg bg-secondary px-3 py-2 text-xs text-secondary-foreground"
        >
          {result.note}
        </motion.p>
      )}

      {saved && (
        <motion.div variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}>
          <VisibilityToggle
            isPublic={saved.is_public}
            busy={visibilityMutation.isPending}
            onChange={(v) => visibilityMutation.mutate(v)}
          />
        </motion.div>
      )}
    </motion.div>
  );
}

function VisibilityToggle({
  isPublic,
  busy,
  onChange,
}: {
  isPublic: boolean;
  busy: boolean;
  onChange: (isPublic: boolean) => void;
}) {
  return (
    <div className="mt-1 rounded-2xl border border-border bg-background/60 p-3">
      <div className="flex rounded-full bg-muted p-1">
        <button
          disabled={busy}
          onClick={() => onChange(false)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
            !isPublic
              ? "bg-plum text-paper"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Lock className="h-3.5 w-3.5" /> Private
        </button>
        <button
          disabled={busy}
          onClick={() => onChange(true)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
            isPublic
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Globe className="h-3.5 w-3.5" /> Public
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {isPublic
          ? "Showing on your public journal."
          : "Keeping this one private."}
      </p>
    </div>
  );
}
