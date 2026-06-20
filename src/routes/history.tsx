import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Feather, Search, Trash2 } from "lucide-react";

import { TabBar } from "@/components/TabBar";
import { clearSightings, loadSightings, type Sighting } from "@/lib/sightings";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Field journal · Plumage" },
      {
        name: "description",
        content: "Your complete log of bird identifications, kept in your pocket field journal.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setSightings(loadSightings());
  }, []);

  function clearAll() {
    if (!confirm("Clear your entire field journal? This cannot be undone.")) return;
    clearSightings();
    setSightings([]);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sightings;
    return sightings.filter(
      (s) =>
        s.result.commonName.toLowerCase().includes(q) ||
        s.result.scientificName.toLowerCase().includes(q),
    );
  }, [sightings, query]);

  const uniqueSpecies = useMemo(
    () =>
      new Set(
        sightings.filter((s) => s.result.isBird).map((s) => s.result.commonName.toLowerCase()),
      ).size,
    [sightings],
  );

  return (
    <main className="min-h-screen pb-32">
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-6"
      >
        <Link to="/" className="flex items-center gap-2 text-primary">
          <Feather className="h-5 w-5" strokeWidth={2.2} />
          <span className="font-display text-xl font-semibold">Plumage</span>
        </Link>
        {sightings.length > 0 && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" /> Clear
          </button>
        )}
      </motion.header>

      <section className="mx-auto max-w-3xl px-5 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="font-display text-3xl font-semibold">Field journal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sightings.length === 0
              ? "Every bird you identify will land here."
              : `${sightings.length} sighting${sightings.length === 1 ? "" : "s"} · ${uniqueSpecies} species`}
          </p>
        </motion.div>

        {sightings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mt-12 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-12 text-center"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Feather className="mx-auto h-8 w-8 text-muted-foreground" />
            </motion.div>
            <p className="mt-3 text-sm text-muted-foreground">
              No sightings yet. Go snap your first bird.
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Start identifying
            </Link>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative mt-6"
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your sightings…"
                className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none ring-ring focus:border-ring focus:ring-2"
              />
            </motion.div>

            <motion.ul layout className="mt-6 space-y-3">
              <AnimatePresence initial={false}>
                {filtered.map((s, i) => (
                  <motion.li
                    key={s.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.3 }}
                    whileHover={{ scale: 1.01 }}
                    className="flex items-start gap-4 overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm"
                  >
                    <motion.img
                      whileHover={{ scale: 1.06 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
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
                  </motion.li>
                ))}
              </AnimatePresence>
              {filtered.length === 0 && (
                <motion.li
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No matches for “{query}”.
                </motion.li>
              )}
            </motion.ul>
          </>
        )}
      </section>

      <TabBar />
    </main>
  );
}
