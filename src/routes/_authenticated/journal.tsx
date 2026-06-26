import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search, Lock, Globe } from "lucide-react";

import { useRequireUsername } from "@/hooks/use-profile";
import { ANIMAL_GROUPS, type AnimalGroup } from "@/lib/identify.functions";
import { listMySightings, type DbSighting } from "@/lib/sightings.functions";

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({
    meta: [
      { title: "Field Journal — Wildlog" },
      {
        name: "description",
        content:
          "Browse your Wildlog field journal: every wildlife sighting you've logged, grouped by animal type with species names and habitat notes.",
      },
      { property: "og:title", content: "Field Journal — Wildlog" },
      {
        property: "og:description",
        content:
          "Browse your Wildlog field journal: every wildlife sighting you've logged, grouped by animal type.",
      },
      { property: "og:url", content: "https://wildlog.life/journal" },
    ],
    links: [{ rel: "canonical", href: "https://wildlog.life/journal" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Field Journal",
          description:
            "A personal collection of identified wildlife sightings logged with Wildlog.",
          url: "https://wildlog.life/journal",
          isPartOf: {
            "@type": "WebSite",
            name: "Wildlog",
            url: "https://wildlog.life/",
          },
        }),
      },
    ],
  }),
  component: JournalPage,
});

function groupOf(s: DbSighting): AnimalGroup {
  const g = s.animal_group;
  if (g && (ANIMAL_GROUPS as readonly string[]).includes(g)) return g as AnimalGroup;
  return "Other";
}

function JournalPage() {
  useRequireUsername();
  const sightingsQuery = useQuery({
    queryKey: ["sightings"],
    queryFn: () => listMySightings(),
  });
  const sightings = useMemo(
    () => (sightingsQuery.data ?? []).filter((s) => s.is_animal),
    [sightingsQuery.data],
  );

  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<AnimalGroup | "All">("All");

  const groupCounts = useMemo(() => {
    const counts = new Map<AnimalGroup, number>();
    for (const s of sightings) {
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
        s.common_name.toLowerCase().includes(q) ||
        (s.scientific_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [sightings, query, activeGroup]);

  const sections = useMemo(() => {
    const map = new Map<AnimalGroup, DbSighting[]>();
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
    () => new Set(sightings.map((s) => s.common_name.toLowerCase())).size,
    [sightings],
  );

  return (
    <main className="min-h-screen pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
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
                  count={sightings.length}
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
                    <h2 className="mb-3 flex items-center gap-2 font-display text-lg">
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
                          {s.image_url && (
                            <motion.img
                              whileHover={{ scale: 1.06 }}
                              transition={{ type: "spring", stiffness: 260, damping: 20 }}
                              src={s.image_url}
                              alt={s.common_name}
                              loading="lazy"
                              className={`${i % 2 === 0 ? "blob" : "blob-alt"} h-24 w-24 flex-shrink-0 object-cover`}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-lg font-bold leading-tight text-foreground">
                                {s.common_name}
                              </h3>
                              <span
                                className={`flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                  s.is_public
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-secondary-foreground"
                                }`}
                              >
                                {s.is_public ? (
                                  <Globe className="h-3 w-3" />
                                ) : (
                                  <Lock className="h-3 w-3" />
                                )}
                                {s.is_public ? "Public" : "Private"}
                              </span>
                            </div>
                            {s.scientific_name && (
                              <p className="text-xs italic text-muted-foreground">
                                {s.scientific_name}
                              </p>
                            )}
                            {s.description && (
                              <p className="mt-1 line-clamp-3 text-sm text-foreground/85">
                                {s.description}
                              </p>
                            )}
                            <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                              {new Date(s.created_at).toLocaleString()}
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
