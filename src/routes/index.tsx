import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Camera, Feather, Loader2, RotateCcw, Upload, X } from "lucide-react";

import heroBird from "@/assets/hero-bird.jpg";
import { identifyBird, type BirdIdentification } from "@/lib/identify.functions";
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
      { title: "Plumage — Snap a bird, learn its name" },
      {
        name: "description",
        content:
          "Plumage identifies any bird from a single photo. Snap or upload, and your pocket field guide names the species in seconds.",
      },
      { property: "og:title", content: "Plumage — Snap a bird, learn its name" },
      {
        property: "og:description",
        content: "AI-powered pocket field guide. Snap a bird, get the species.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type Phase = "idle" | "preview" | "loading" | "result" | "error";

function Home() {
  const identify = useServerFn(identifyBird);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<BirdIdentification | null>(null);
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
        const thumb = await makeThumbnail(dataUrl, 280);
        const s: Sighting = {
          id: crypto.randomUUID(),
          at: Date.now(),
          thumbnail: thumb,
          result: out,
        };
        saveSighting(s);
        setSightings(loadSightings());
      } catch {
        // ignore thumb errors
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
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-6">
        <Link to="/" className="flex items-center gap-2 text-primary">
          <Feather className="h-5 w-5" strokeWidth={2.2} />
          <span className="font-display text-xl font-semibold tracking-tight">Plumage</span>
        </Link>
        <Link
          to="/history"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Field journal
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-5 pb-24 pt-8">
        {phase === "idle" && (
          <Hero
            onCamera={() => fileRef.current?.click()}
            onUpload={() => uploadRef.current?.click()}
          />
        )}

        {phase !== "idle" && (
          <div className="mx-auto max-w-md">
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Bird to identify"
                  className="aspect-square w-full object-cover"
                />
              )}
              <div className="p-5">
                {phase === "loading" && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm">Consulting the field guide…</span>
                  </div>
                )}

                {phase === "result" && result && <ResultCard result={result} />}

                {phase === "error" && (
                  <div className="space-y-3">
                    <p className="text-sm text-destructive">{error}</p>
                    <button
                      onClick={reset}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <RotateCcw className="h-4 w-4" /> Try again
                    </button>
                  </div>
                )}
              </div>
            </div>

            {(phase === "result" || phase === "error") && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  <Camera className="h-4 w-4" /> Identify another
                </button>
              </div>
            )}
          </div>
        )}

        {sightings.length > 0 && phase === "idle" && (
          <div className="mt-16">
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-xl">Recent sightings</h2>
              <Link
                to="/history"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                View all →
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {sightings.slice(0, 6).map((s) => (
                <li
                  key={s.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <img
                    src={s.thumbnail}
                    alt={s.result.commonName}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                  <div className="px-3 py-2">
                    <p className="truncate font-display text-sm font-medium">
                      {s.result.commonName}
                    </p>
                    <p className="truncate text-xs italic text-muted-foreground">
                      {s.result.scientificName || "—"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Hidden inputs */}
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
    </main>
  );
}

function Hero({ onCamera, onUpload }: { onCamera: () => void; onUpload: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto mt-2 max-w-xs">
        <img
          src={heroBird}
          alt="Illustrated songbird perched on a leafy twig"
          width={1024}
          height={1024}
          className="h-auto w-full rounded-full"
        />
      </div>
      <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
        Who is that bird?
      </h1>
      <p className="mx-auto mt-3 max-w-md text-balance text-muted-foreground">
        Snap a photo and Plumage will name the species, where it lives, and one
        thing worth knowing about it.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3">
        <button
          onClick={onCamera}
          className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
        >
          <Camera className="h-5 w-5" /> Identify a bird
        </button>
        <button
          onClick={onUpload}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <Upload className="h-4 w-4" /> Upload a photo instead
        </button>
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: BirdIdentification }) {
  if (!result.isBird) {
    return (
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          <X className="h-3 w-3" /> No bird found
        </div>
        <p className="text-sm text-muted-foreground">{result.description}</p>
      </div>
    );
  }
  const dot =
    result.confidence === "high"
      ? "bg-primary"
      : result.confidence === "medium"
        ? "bg-accent"
        : "bg-muted-foreground/50";
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
        {result.confidence} confidence
      </div>
      <div>
        <h3 className="font-display text-2xl font-semibold leading-tight text-foreground">
          {result.commonName}
        </h3>
        {result.scientificName && (
          <p className="text-sm italic text-muted-foreground">{result.scientificName}</p>
        )}
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">{result.description}</p>
      {result.note && (
        <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-secondary-foreground">
          {result.note}
        </p>
      )}
    </div>
  );
}
