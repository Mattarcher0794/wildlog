import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Calendar, Globe, Lock, MapPin } from "lucide-react";

import { listMySightings } from "@/lib/sightings.functions";
import { buildLifeList } from "@/lib/life-list";
import { BadgePill } from "@/routes/_authenticated/life-list";
import { speciesGradient } from "@/lib/species-color";

/**
 * iOS-style bottom sheet for a single species. Rendered as an overlay ON TOP of
 * whatever screen mounted it (e.g. the Life List), so the blurred backdrop has
 * real content behind it instead of the bare page background.
 */
export function SpeciesSheet({
  speciesKey,
  onClose,
}: {
  speciesKey: string;
  onClose: () => void;
}) {
  const sightingsQuery = useQuery({
    queryKey: ["sightings"],
    queryFn: () => listMySightings(),
  });

  const sightings = useMemo(
    () => (sightingsQuery.data ?? []).filter((s) => s.is_animal),
    [sightingsQuery.data],
  );

  const entry = useMemo(
    () => buildLifeList(sightings).find((e) => e.key === speciesKey),
    [sightings, speciesKey],
  );

  const timeline = useMemo(() => {
    if (!entry) return [];
    return sightings
      .filter((s) => s.common_name.trim().toLowerCase() === speciesKey)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [sightings, speciesKey, entry]);

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop — the Life List shows through, blurred */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 bg-plum/[0.08] backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: "0%" }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="absolute bottom-0 left-0 right-0 h-[85vh] max-h-[85dvh] rounded-t-[1.6rem] bg-card shadow-2xl"
      >
        {/* Fixed back button */}
        <button
          onClick={onClose}
          aria-label="Back to life list"
          className="absolute left-5 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-background/70 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>

        {sightingsQuery.isLoading ? (
          <div className="grid h-full place-items-center">
            <span className="blob-spin h-10 w-10 bg-primary" aria-hidden />
          </div>
        ) : !entry ? (
          <div className="grid h-full place-items-center px-5 text-center">
            <p className="text-sm text-muted-foreground">
              We couldn't find that species in your life list.
            </p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            {/* Hero */}
            <div className="relative h-52 w-full overflow-hidden rounded-t-[1.6rem]">
              {entry.latest.image_url ? (
                <img
                  src={entry.latest.image_url}
                  alt={`Photo of ${entry.commonName}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{ background: speciesGradient(entry.group, entry.commonName) }}
                />
              )}
              <span className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-card to-transparent" />
            </div>

            <section className="mx-auto max-w-md px-5 pb-[calc(2rem+env(safe-area-inset-bottom))]">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative z-10 -mt-8"
              >
                {entry.badge && <BadgePill badge={entry.badge} />}
                <h1 className="mt-2 font-display text-3xl leading-tight">{entry.commonName}</h1>
                {entry.scientificName && (
                  <p className="text-sm italic text-muted-foreground">{entry.scientificName}</p>
                )}

                {/* Stats */}
                <div className="mt-4 grid grid-cols-3 gap-2.5">
                  <Stat value={entry.count} label={entry.count === 1 ? "sighting" : "sightings"} />
                  <Stat value={entry.locations} label={entry.locations === 1 ? "place" : "places"} />
                  <Stat
                    value={new Date(entry.firstSeen).toLocaleDateString(undefined, {
                      month: "short",
                      year: "2-digit",
                    })}
                    label="first seen"
                  />
                </div>

                {entry.latest.description && (
                  <p className="mt-5 rounded-2xl bg-background p-4 text-sm leading-relaxed text-foreground/85">
                    {entry.latest.description}
                  </p>
                )}
              </motion.div>

              {/* Timeline */}
              <h2 className="mb-3 mt-8 font-display text-lg">Your sightings</h2>
              <ul className="space-y-3">
                {timeline.map((s, i) => (
                  <motion.li
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.3 }}
                    className="card-journal flex gap-3.5 bg-background p-3"
                  >
                    {s.image_url ? (
                      <img
                        src={s.image_url}
                        alt={`${entry.commonName} sighting`}
                        loading="lazy"
                        className={`${i % 2 === 0 ? "thumb-1" : "thumb-2"} h-20 w-20 flex-shrink-0 object-cover`}
                      />
                    ) : (
                      <span
                        className={`${i % 2 === 0 ? "thumb-1" : "thumb-2"} h-20 w-20 flex-shrink-0`}
                        style={{ background: speciesGradient(entry.group, entry.commonName) }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(s.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <span
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                            s.is_public
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          {s.is_public ? <Globe className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                          {s.is_public ? "Public" : "Private"}
                        </span>
                      </div>
                      {s.note ? (
                        <p className="mt-1.5 text-sm italic text-foreground/85">"{s.note}"</p>
                      ) : (
                        <p className="mt-1.5 text-sm text-muted-foreground/70">No note added.</p>
                      )}
                      {s.lat != null && s.lng != null && (
                        <p className="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5" />
                          {s.lat.toFixed(3)}, {s.lng.toFixed(3)}
                        </p>
                      )}
                    </div>
                  </motion.li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl bg-background px-2 py-3 text-center">
      <p className="font-display text-xl leading-none">{value}</p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
