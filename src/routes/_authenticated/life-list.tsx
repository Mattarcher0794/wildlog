import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MapPin, Search, Sparkles } from "lucide-react";

import { SpeciesSheet } from "@/components/SpeciesSheet";
import { useRequireUsername } from "@/hooks/use-profile";
import { listMySightings } from "@/lib/sightings.functions";
import { listNearbySpecies } from "@/lib/sightings.functions";
import { getCurrentLocation } from "@/lib/sightings";
import {
  badgeLabel,
  buildLifeList,
  ghostSpecies,
  type SpeciesBadge,
  type SpeciesEntry,
} from "@/lib/life-list";
import { speciesGradient } from "@/lib/species-color";

export const Route = createFileRoute("/_authenticated/life-list")({
  head: () => ({
    meta: [
      { title: "Life List — Wildlog" },
      {
        name: "description",
        content:
          "Your Wildlog life list: every species you've identified, grouped and badged, with ghost slots for wildlife spotted nearby that you haven't logged yet.",
      },
      { property: "og:title", content: "Life List — Wildlog" },
      {
        property: "og:description",
        content:
          "Every species you've identified, badged and collected — plus wildlife spotted nearby waiting to be logged.",
      },
      { property: "og:url", content: "https://wildlog.life/life-list" },
    ],
    links: [{ rel: "canonical", href: "https://wildlog.life/life-list" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Life List",
          description:
            "A personal life list of identified wildlife species collected with Wildlog.",
          url: "https://wildlog.life/life-list",
          isPartOf: {
            "@type": "WebSite",
            name: "Wildlog",
            url: "https://wildlog.life/",
          },
        }),
      },
    ],
  }),
  component: LifeListPage,
});

const ORGANIC = ["blob", "blob-alt"] as const;

function LifeListPage() {
  useRequireUsername();

  const sightingsQuery = useQuery({
    queryKey: ["sightings"],
    queryFn: () => listMySightings(),
  });

  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    getCurrentLocation().then(setLoc);
  }, []);

  const nearbyQuery = useQuery({
    queryKey: [
      "nearby-species",
      loc ? loc.lat.toFixed(1) : null,
      loc ? loc.lng.toFixed(1) : null,
    ],
    queryFn: () => listNearbySpecies({ data: loc! }),
    enabled: !!loc,
  });

  const sightings = useMemo(
    () => (sightingsQuery.data ?? []).filter((s) => s.is_animal),
    [sightingsQuery.data],
  );

  const nearby = nearbyQuery.data ?? [];
  const species = useMemo(
    () => buildLifeList(sightings, nearby),
    [sightings, nearby],
  );
  const ghosts = useMemo(() => ghostSpecies(nearby, species), [nearby, species]);

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return species;
    return species.filter(
      (s) =>
        s.commonName.toLowerCase().includes(q) ||
        (s.scientificName ?? "").toLowerCase().includes(q),
    );
  }, [species, query]);

  const totalSightings = sightings.length;

  return (
    <main className="min-h-screen pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <section className="mx-auto max-w-3xl px-5 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="font-display text-3xl">Life list</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {species.length === 0
              ? "Every species you spot will be collected here."
              : `${species.length} species · ${totalSightings} sighting${
                  totalSightings === 1 ? "" : "s"
                }`}
          </p>
        </motion.div>

        {species.length === 0 ? (
          <EmptyState />
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
                placeholder="Search your species…"
                className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none ring-ring focus:border-ring focus:ring-2"
              />
            </motion.div>

            <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              <AnimatePresence initial={false} mode="popLayout">
                {filtered.map((s, i) => (
                  <SpeciesCard key={s.key} entry={s} index={i} />
                ))}
              </AnimatePresence>
            </div>

            {filtered.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No species match{query ? ` “${query}”` : ""}.
              </p>
            )}

            {ghosts.length > 0 && (
              <div className="mt-10">
                <h2 className="flex items-center gap-2 font-display text-lg">
                  <Sparkles className="h-4 w-4 text-primary" /> Seen nearby
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Logged by others around you — not yet on your list.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                  {ghosts.map((g, i) => (
                    <GhostCard
                      key={g.commonName}
                      name={g.commonName}
                      group={g.group}
                      index={i}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function SpeciesCard({ entry, index }: { entry: SpeciesEntry; index: number }) {
  const radius = ORGANIC[index % ORGANIC.length];
  const label = badgeLabel(entry.badge);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.3 }}
    >
      <Link
        to="/species/$species"
        params={{ species: entry.key }}
        className="card-journal relative block bg-card p-2.5"
      >
        <div className={`relative ${radius} aspect-square w-full overflow-hidden`}>
          {entry.latest.image_url ? (
            <img
              src={entry.latest.image_url}
              alt={`Photo of ${entry.commonName}`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="h-full w-full"
              style={{ background: speciesGradient(entry.group, entry.commonName) }}
            />
          )}
          {entry.count > 1 && (
            <span className="absolute bottom-2 right-2 rounded-full bg-plum/85 px-2 py-0.5 font-mono text-[9px] font-bold text-paper backdrop-blur">
              ×{entry.count}
            </span>
          )}
        </div>
        {/* Badge sits on the card (outside the clipped blob) so it never gets cut off */}
        {label && (
          <BadgePill badge={entry.badge} className="absolute left-4 top-4 z-10" />
        )}
        <h3 className="mt-2.5 truncate font-display text-[13px] leading-tight">
          {entry.commonName}
        </h3>
        {entry.scientificName && (
          <p className="truncate text-[10px] italic text-muted-foreground">
            {entry.scientificName}
          </p>
        )}
        {entry.locations > 0 && (
          <p className="mt-1 flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
            <MapPin className="h-2.5 w-2.5" />
            {entry.locations} spot{entry.locations === 1 ? "" : "s"}
          </p>
        )}
      </Link>
    </motion.div>
  );
}

function GhostCard({
  name,
  group,
  index,
}: {
  name: string;
  group: string | null;
  index: number;
}) {
  const radius = ORGANIC[index % ORGANIC.length];
  return (
    <Link
      to="/"
      className="ghost-slot block rounded-[20px] p-2.5 text-left"
      aria-label={`${name} seen nearby — log one`}
    >
      <div className={`relative ${radius} aspect-square w-full overflow-hidden`}>
        <div
          className="h-full w-full opacity-30 grayscale"
          style={{ background: speciesGradient(group, name) }}
        />
        <span className="absolute inset-0 grid place-items-center">
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-foreground/45">
            Not logged
          </span>
        </span>
      </div>
      <h3 className="mt-2.5 truncate font-display text-[13px] leading-tight text-foreground/55">
        {name}
      </h3>
      <p className="text-[10px] text-muted-foreground">Tap to log →</p>
    </Link>
  );
}

export function BadgePill({
  badge,
  className = "",
}: {
  badge: SpeciesBadge;
  className?: string;
}) {
  const label = badgeLabel(badge);
  if (!label) return null;
  const variant = "badge-moss";
  return <span className={`badge ${variant} ${className}`}>{label}</span>;
}

function EmptyState() {
  return (
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
        No species yet. Spot something? Log it to start your life list.
      </p>
      <Link
        to="/"
        className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Log a sighting
      </Link>
    </motion.div>
  );
}
