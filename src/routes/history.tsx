import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search, Trash2 } from "lucide-react";

import { Wordmark } from "@/components/Brand";
import { TabBar } from "@/components/TabBar";
import { clearSightings, loadSightings, type Sighting } from "@/lib/sightings";
import { ANIMAL_GROUPS, type AnimalGroup } from "@/lib/identify.functions";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Field journal · Wildlog" },
      {
        name: "description",
        content: "Your complete Wildlog — every wildlife sighting you've identified, grouped and kept in your pocket field journal.",
      },
    ],
  }),
  component: HistoryPage,
});

function groupOf(s: Sighting): AnimalGroup {
  const g = s.result.group;
  if (g && (ANIMAL_GROUPS as readonly string[]).includes(g)) return g;
  return "Other";
}

function HistoryPage() {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<AnimalGroup | "All">("All");

  useEffect(() => {
    setSightings(loadSightings());
  }, []);

  function clearAll() {
    if (!confirm("Clear your entire field journal? This cannot be undone.")) return;
    clearSightings();
    setSightings([]);
  }

  // Only show group chips that actually have entries.
  const groupCounts = useMemo(() => {
    const counts = new Map<AnimalGroup, number>();
    for (const s of sightings) {
      if (!s.result.isAnimal) continue;
      const g = groupOf(s);
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return counts;
  }, [sightings]);

  const availableGroups = useMemo(
    () => ANIMAL_GROUPS.filter((g) => groupCounts.has(g)),
    [groupCounts],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sightings.filter((s) => {
      if (activeGroup !== "All" && groupOf(s) !== activeGroup) return false;
      if (!q) return true;
      return (
        s.result.commonName.toLowerCase().includes(q) ||
        s.result.scientificName.toLowerCase().includes(q)
      );
    });
  }, [sightings, query, activeGroup]);

  // Group the filtered list into sections by animal type.
  const sections = useMemo(() => {
    const map = new Map<AnimalGroup, Sighting[]>();
    for (const s of filtered) {
      const g = groupOf(s);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(s);
    }
    return ANIMAL_GROUPS.filter((g) => map.has(g)).map((g) => ({
      group: g,
      items: map.get(g)!,
    }));
  }, [filtered]);

  const uniqueSpecies = useMemo(
    () =>
      new Set(
        sightings.filter((s) => s.result.isAnimal).map((s) => s.result.commonName.toLowerCase()),
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
        <Wordmark />
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
          <h1 className="font-display text-3xl">Field journal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sightings.length === 0
              ? "Every animal you spot will land here."
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
              className="mx-auto h-14 w-14 blob bg-peach/60"
            />
            <p className="mt-4 text-sm text-muted-foreground">
              No sightings yet. Spot something? Log it here.
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Log a sighting
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

            {availableGroups.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-4 flex flex-wrap gap-2"
              >
                <GroupChip
                  label="All"
                  count={sightings.filter((s) => s.result.isAnimal).length}
                  active={activeGroup === "All"}
                  onClick={() => setActiveGroup("All")}
                />
                {availableGroups.map((g) => (
                  <GroupChip
                    key={g}
                    label={g}
                    count={groupCounts.get(g) ?? 0}
                    active={activeGroup === g}
                    onClick={() => setActiveGroup(g)}
                  />
                ))}
              </motion.div>
            )}

            <div className="mt-6 space-y-8">
              <AnimatePresence initial={false} mode="popLayout">
                {sections.map((section) => (
                  <motion.div
                    key={section.group}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
                      {section.group}
                      <span className="text-xs font-normal text-muted-foreground">
                        {section.items.length}
                      </span>
                    </h2>
                    <ul className="space-y-3">
                      {section.items.map((s, i) => (
                        <motion.li
                          key={s.id}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.3 }}
                          whileHover={{ scale: 1.01, rotate: -0.4 }}
                          className="card-journal flex items-start gap-4 bg-card p-3"
                        >
                          <motion.img
                            whileHover={{ scale: 1.06 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            src={s.thumbnail}
                            alt={s.result.commonName}
                            loading="lazy"
                            className={`${i % 2 === 0 ? "blob" : "blob-alt"} h-24 w-24 flex-shrink-0 object-cover`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-lg font-bold leading-tight text-foreground">
                                {s.result.commonName}
                              </h3>
                              {s.id === sightings[0]?.id && (
                                <span className="flex-shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                                  Just logged
                                </span>
                              )}
                            </div>
                            {s.result.scientificName && (
                              <p className="text-xs italic text-muted-foreground">
                                {s.result.scientificName}
                              </p>
                            )}
                            <p className="mt-1 line-clamp-3 text-sm text-foreground/85">
                              {s.result.description}
                            </p>
                            <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                              {new Date(s.at).toLocaleString()}
                            </p>
                          </div>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </AnimatePresence>
              {filtered.length === 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No matches{query ? ` for “${query}”` : ""}.
                </motion.p>
              )}
            </div>
          </>
        )}
      </section>

      <TabBar />
    </main>
  );
}

function GroupChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      <span className={active ? "text-primary-foreground/80" : "text-muted-foreground/70"}>
        {count}
      </span>
    </motion.button>
  );
}
