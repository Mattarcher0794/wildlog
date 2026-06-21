import { createFileRoute } from "@tanstack/react-router";
import { Camera, Upload } from "lucide-react";

import heroAnimals from "@/assets/hero-animals.jpg";
import { Wordmark } from "@/components/Brand";
import { TabBar } from "@/components/TabBar";

export const Route = createFileRoute("/tmp-hero-check")({
  ssr: false,
  component: () => (
    <main className="min-h-screen pb-28">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-6">
        <Wordmark />
        <span className="rounded-full border-[1.5px] border-border px-3 py-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Field journal
        </span>
      </header>
      <section className="mx-auto max-w-3xl px-5 pt-8">
        <div className="text-center">
          <div className="mx-auto mt-1 w-3/5 max-w-[260px]">
            <img src={heroAnimals} alt="hero" width={1024} height={1024} className="blob h-auto w-full" />
          </div>
          <h1 className="mt-3 font-display text-5xl leading-[1.05] text-foreground sm:text-6xl">
            What did you <span className="text-primary">spot?</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-balance font-medium text-muted-foreground">
            Snap a photo and Wildlog names the species, where it lives, and one thing worth knowing — then keeps it in your journal.
          </p>
          <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-10 mt-8 flex flex-col items-center gap-3">
            <button className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-[0_8px_24px_-6px_rgba(60,50,72,0.45)]">
              <Camera className="h-5 w-5" /> Log a sighting
            </button>
            <button className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Upload className="h-4 w-4" /> Upload a photo instead
            </button>
          </div>
          <div className="mt-14 h-[600px] rounded-xl bg-secondary/40" />
        </div>
      </section>
      <TabBar />
    </main>
  ),
});
