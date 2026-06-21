import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Loader2, RotateCcw, Upload, X } from "lucide-react";

import heroAnimals from "@/assets/hero-animals.jpg";
import logoBadge from "@/assets/logo-badge.png";
import { TabBar } from "@/components/TabBar";
import { identifyAnimal, type AnimalIdentification } from "@/lib/identify.functions";
import {
  fileToDataUrl,
  loadSightings,
  makeThumbnail,
  saveSighting,
  type Sighting,
} from "@/lib/sightings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wildeye — Snap any animal, learn its name" },
      {
        name: "description",
        content:
          "Wildeye identifies any animal from a single photo — mammals, birds, reptiles, insects and more. Snap or upload, and your pocket field guide names the species in seconds.",
      },
      { property: "og:title", content: "Wildeye — Snap any animal, learn its name" },
      {
        property: "og:description",
        content: "AI-powered pocket field guide for every animal. Snap a photo, get the species.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type Phase = "idle" | "loading" | "result" | "error";

function Home() {
  const identify = useServerFn(identifyAnimal);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnimalIdentification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sightings, setSightings] = useState<Sighting[]>([]);

  useEffect(() => {
    setSightings(loadSightings());
  }, []);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageUrl(dataUrl);
      setPhase("loading");
      const out = await identify({ data: { imageDataUrl: dataUrl } });
      setResult(out);
      setPhase("result");
      try {
        const thumb = await makeThumbnail(dataUrl, 320);
        const s: Sighting = {
          id: crypto.randomUUID(),
          at: Date.now(),
          thumbnail: thumb,
          result: out,
        };
        saveSighting(s);
        setSightings(loadSightings());
      } catch {
        // ignore
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("error");
    }
  }

  function reset() {
    setPhase("idle");
    setImageUrl(null);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
    if (uploadRef.current) uploadRef.current.value = "";
  }

  return (
    <main className="min-h-screen pb-32">
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-6"
      >
        <Link to="/" className="flex items-center gap-2.5 text-foreground">
          <img
            src={logoBadge}
            alt="Wildeye owl badge"
            width={512}
            height={512}
            className="h-9 w-9"
          />
          <span className="font-display text-2xl font-bold tracking-tight">Wildeye</span>
        </Link>
        <span className="rounded-full border-[1.5px] border-border px-3 py-1 text-xs font-bold uppercase tracking-wide text-foreground">
          Spot it · Name it
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
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm">Consulting the field guide…</span>
                      </motion.div>
                    )}
                    {phase === "result" && result && (
                      <ResultCard key="res" result={result} />
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
                    <Camera className="h-4 w-4" /> Identify another
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
        initial={{ scale: 0.85, opacity: 0, rotate: -4 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 18, delay: 0.05 }}
        className="mx-auto mt-2 max-w-sm"
      >
        <motion.img
          src={heroAnimals}
          alt="Bold flat illustration of animals — a fox, owl, frog, fish, turtle and butterfly"
          width={1024}
          height={1024}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          className="h-auto w-full rounded-[2rem] drop-shadow-[6px_8px_0_rgba(0,0,0,0.08)]"
        />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.45 }}
        className="mt-4 font-display text-5xl font-bold leading-[1.05] text-foreground sm:text-6xl"
      >
        What animal <span className="text-primary">is that?</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.45 }}
        className="mx-auto mt-3 max-w-md text-balance font-medium text-muted-foreground"
      >
        Snap a photo and Wildeye names the species, where it lives, and one cool
        thing worth knowing about it.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.45 }}
        className="mt-8 flex flex-col items-center gap-3"
      >
        <motion.button
          whileHover={{ scale: 1.03, rotate: -1 }}
          whileTap={{ scale: 0.96 }}
          onClick={onCamera}
          className="card-pop inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-bold text-primary-foreground hover:bg-primary/90"
        >
          <Camera className="h-5 w-5" /> Identify an animal
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

function RecentStrip({ sightings }: { sightings: Sighting[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.45 }}
      className="mt-14"
    >
      <div className="mb-4 flex items-end justify-between">
        <h2 className="font-display text-2xl font-bold">Recent sightings</h2>
        <Link to="/history" className="text-sm font-semibold text-primary hover:underline">
          View all →
        </Link>
      </div>
      <motion.ul
        className="grid grid-cols-2 gap-4 sm:grid-cols-3"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.06 } },
        }}
      >
        {sightings.map((s) => (
          <motion.li
            key={s.id}
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: { opacity: 1, y: 0 },
            }}
            whileHover={{ y: -4, rotate: -1 }}
            className="card-pop overflow-hidden rounded-2xl bg-card"
          >
            <img
              src={s.thumbnail}
              alt={s.result.commonName}
              loading="lazy"
              className="aspect-square w-full object-cover"
            />
            <div className="px-3 py-2">
              <p className="truncate font-display text-sm font-bold">
                {s.result.commonName}
              </p>
              <p className="truncate text-xs italic text-muted-foreground">
                {s.result.scientificName || "—"}
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

function ResultCard({ result }: { result: AnimalIdentification }) {
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
      <motion.div
        variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
      >
        <h3 className="font-display text-3xl font-bold leading-tight text-foreground">
          {result.commonName}
        </h3>
        {result.scientificName && (
          <p className="text-sm italic text-muted-foreground">{result.scientificName}</p>
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
    </motion.div>
  );
}
