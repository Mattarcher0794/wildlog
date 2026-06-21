import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "motion/react";

import { Wordmark } from "@/components/Brand";
import { TabBar } from "@/components/TabBar";
import { SightingDetailModal, type DetailSighting } from "@/components/SightingDetail";
import { useRequireUsername } from "@/hooks/use-profile";
import { listMySightings, type DbSighting } from "@/lib/sightings.functions";

export const Route = createFileRoute("/_authenticated/map")({
  component: MapPage,
});

type Placed = { sighting: DbSighting; x: number; y: number };

function MapPage() {
  useRequireUsername();
  const sightingsQuery = useQuery({
    queryKey: ["sightings"],
    queryFn: () => listMySightings(),
  });
  const [active, setActive] = useState<DbSighting | null>(null);

  const located = useMemo(
    () =>
      (sightingsQuery.data ?? []).filter(
        (s) => s.lat != null && s.lng != null && s.is_animal,
      ),
    [sightingsQuery.data],
  );

  const placed = useMemo<Placed[]>(() => {
    if (located.length === 0) return [];
    const lats = located.map((s) => s.lat as number);
    const lngs = located.map((s) => s.lng as number);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const spanLat = maxLat - minLat || 1;
    const spanLng = maxLng - minLng || 1;
    return located.map((s) => ({
      sighting: s,
      // pad to 10–90% so pins never hug the edges
      x: 10 + ((((s.lng as number) - minLng) / spanLng) * 80),
      y: 10 + ((1 - ((s.lat as number) - minLat) / spanLat) * 80),
    }));
  }, [located]);

  return (
    <main className="min-h-screen pb-28">
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-6"
      >
        <Wordmark />
      </motion.header>

      <section className="mx-auto max-w-3xl px-5 pt-8">
        <h1 className="font-display text-3xl">Sightings map</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {located.length === 0
            ? "Sightings with a location will appear here."
            : `${located.length} located sighting${located.length === 1 ? "" : "s"}.`}
        </p>

        {located.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto h-14 w-14 blob bg-primary/70"
            />
            <p className="mt-4 text-sm text-muted-foreground">
              No mapped sightings yet. Allow location when you log one and it'll
              land on the map.
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="relative mt-6 aspect-square w-full overflow-hidden rounded-3xl border border-border"
            style={{
              background:
                "radial-gradient(circle at 30% 20%, var(--moss-light) 0%, transparent 40%), radial-gradient(circle at 75% 70%, var(--sand) 0%, transparent 45%), var(--cream)",
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.15]"
              style={{
                backgroundImage:
                  "linear-gradient(var(--plum-mid) 1px, transparent 1px), linear-gradient(90deg, var(--plum-mid) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            {placed.map(({ sighting, x, y }, i) => (
              <motion.button
                key={sighting.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: Math.min(i, 12) * 0.05, type: "spring", stiffness: 320, damping: 18 }}
                whileHover={{ scale: 1.15 }}
                onClick={() => setActive(sighting)}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                aria-label={sighting.common_name}
              >
                <span className="block h-10 w-10 overflow-hidden blob border-2 border-paper shadow-md">
                  {sighting.image_url ? (
                    <img
                      src={sighting.image_url}
                      alt={sighting.common_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="block h-full w-full bg-primary" />
                  )}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </section>

      <SightingDetailModal
        sighting={active as DetailSighting | null}
        onClose={() => setActive(null)}
      />
      <TabBar />
    </main>
  );
}
