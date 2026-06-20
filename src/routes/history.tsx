import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Feather, Trash2 } from "lucide-react";

import { clearSightings, loadSightings, type Sighting } from "@/lib/sightings";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Field journal · Plumage" },
      {
        name: "description",
        content: "Your recent bird identifications, kept in your pocket field journal.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [sightings, setSightings] = useState<Sighting[]>([]);

  useEffect(() => {
    setSightings(loadSightings());
  }, []);

  function clearAll() {
    if (!confirm("Clear your entire field journal?")) return;
    clearSightings();
    setSightings([]);
  }

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-center gap-2 text-primary">
          <Feather className="h-5 w-5" strokeWidth={2.2} />
          <span className="font-display text-xl font-semibold">Plumage</span>
        </div>
        {sightings.length > 0 ? (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" /> Clear
          </button>
        ) : (
          <span className="w-12" />
        )}
      </header>

      <section className="mx-auto max-w-3xl px-5 pb-24 pt-8">
        <h1 className="font-display text-3xl font-semibold">Field journal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every bird you've identified, most recent first.
        </p>

        {sightings.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
            <Feather className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No sightings yet. Go snap your first bird.
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Start identifying
            </Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {sightings.map((s) => (
              <li
                key={s.id}
                className="flex items-start gap-4 overflow-hidden rounded-2xl border border-border bg-card p-3"
              >
                <img
                  src={s.thumbnail}
                  alt={s.result.commonName}
                  loading="lazy"
                  className="h-24 w-24 flex-shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-semibold leading-tight">
                    {s.result.commonName}
                  </h3>
                  {s.result.scientificName && (
                    <p className="text-xs italic text-muted-foreground">
                      {s.result.scientificName}
                    </p>
                  )}
                  <p className="mt-1 line-clamp-3 text-sm text-foreground/85">
                    {s.result.description}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {new Date(s.at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
