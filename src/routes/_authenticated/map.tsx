import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "motion/react";

import { SightingDetailModal, type DetailSighting } from "@/components/SightingDetail";
import { SightingsMap } from "@/components/SightingsMap";
import { useRequireUsername } from "@/hooks/use-profile";
import { listMySightings, type DbSighting } from "@/lib/sightings.functions";

export const Route = createFileRoute("/_authenticated/map")({
  component: MapPage,
});

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

  return (
    <main className="min-h-screen pb-28">
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
          >
            <SightingsMap sightings={located} onSelect={setActive} />
          </motion.div>
        )}
      </section>

      <SightingDetailModal
        sighting={active as DetailSighting | null}
        onClose={() => setActive(null)}
      />
    </main>
  );
}
