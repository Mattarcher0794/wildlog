import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight } from "lucide-react";

import heroAnimals from "@/assets/hero-animals.jpg";
import { Wordmark } from "@/components/Brand";
import { supabase } from "@/integrations/supabase/client";

export const ONBOARDED_KEY = "wildlog.onboarded.v1";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome to Wildlog" },
      {
        name: "description",
        content:
          "Snap an animal, get the species in seconds, and keep your own field journal. Here's how Wildlog works.",
      },
    ],
  }),
  component: Onboarding,
});

type Step = {
  headline: string;
  line: string;
  visual: "snap" | "identify" | "journal";
};

const steps: Step[] = [
  {
    headline: "Snap what you see",
    line: "Photo of any animal, anywhere — garden, hike, holiday.",
    visual: "snap",
  },
  {
    headline: "We'll tell you what it is",
    line: "Species, habitat, and one fact worth knowing — in seconds.",
    visual: "identify",
  },
  {
    headline: "Keep your own field journal",
    line: "Every sighting, mapped and saved, all in one place.",
    visual: "journal",
  },
];

function Onboarding() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    // Already signed in? Skip straight into the app.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  function finish() {
    try {
      localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      // ignore
    }
    navigate({ to: "/auth", replace: true });
  }

  function next() {
    if (index < steps.length - 1) setIndex((i) => i + 1);
    else finish();
  }

  const step = steps[index];

  return (
    <main className="flex min-h-screen flex-col bg-background px-5">
      <header className="flex items-center justify-between pt-6">
        <Wordmark />
        <button
          onClick={finish}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Skip
        </button>
      </header>

      <section
        className="flex flex-1 flex-col items-center justify-center text-center"
        onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (startX.current === null) return;
          const dx = e.changedTouches[0].clientX - startX.current;
          if (dx < -50 && index < steps.length - 1) setIndex((i) => i + 1);
          if (dx > 50 && index > 0) setIndex((i) => i - 1);
          startX.current = null;
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex w-full max-w-sm flex-col items-center"
          >
            <StepVisual visual={step.visual} />
            <h1 className="mt-10 font-display text-4xl text-foreground">
              {step.headline}
            </h1>
            <p className="mt-3 max-w-xs text-balance font-medium text-muted-foreground">
              {step.line}
            </p>
          </motion.div>
        </AnimatePresence>
      </section>

      <footer className="pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-6 flex justify-center gap-2">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-primary" : "w-2 bg-sand"
              }`}
            />
          ))}
        </div>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={next}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-[0_6px_18px_-8px_rgba(60,50,72,0.45)] hover:bg-primary/90"
        >
          {index === steps.length - 1 ? "Get started" : "Next"}
          <ArrowRight className="h-5 w-5" />
        </motion.button>
      </footer>
    </main>
  );
}

function StepVisual({ visual }: { visual: Step["visual"] }) {
  if (visual === "snap") {
    return (
      <motion.img
        initial={{ scale: 0.92 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        src={heroAnimals}
        alt="Hand-painted illustration of a fox, owl, deer and frog"
        className="blob h-56 w-56 object-cover"
      />
    );
  }
  if (visual === "identify") {
    return (
      <div className="blob flex h-56 w-56 flex-col items-center justify-center gap-2 bg-paper px-6 shadow-[0_8px_24px_-12px_rgba(60,50,72,0.3)]">
        <span className="rounded-full border-2 border-border bg-accent px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
          Amphibian
        </span>
        <span className="font-display text-2xl text-foreground">Smooth newt</span>
        <span className="text-sm italic text-muted-foreground">
          Lissotriton vulgaris
        </span>
      </div>
    );
  }
  return (
    <div className="blob flex h-56 w-56 items-center justify-center bg-sand/70">
      <div className="relative h-32 w-32">
        <span className="blob absolute left-2 top-4 h-6 w-6 bg-primary" />
        <span className="blob-alt absolute right-3 top-10 h-6 w-6 bg-primary" />
        <span className="blob absolute bottom-3 left-10 h-6 w-6 bg-primary" />
      </div>
    </div>
  );
}
