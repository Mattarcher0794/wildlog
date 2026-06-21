import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

export type DetailSighting = {
  image_url: string | null;
  common_name: string;
  scientific_name: string | null;
  animal_group: string | null;
  description: string | null;
  created_at: string;
};

export function SightingDetailModal({
  sighting,
  onClose,
}: {
  sighting: DetailSighting | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {sighting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end justify-center bg-plum-deep/40 p-4 backdrop-blur-sm sm:items-center"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="card-journal w-full max-w-sm bg-card p-4"
          >
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="rounded-full p-1 text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {sighting.image_url && (
              <img
                src={sighting.image_url}
                alt={sighting.common_name}
                className="blob mx-auto aspect-square w-44 object-cover"
              />
            )}
            <div className="mt-4">
              {sighting.animal_group && (
                <span className="inline-flex rounded-full border-2 border-border bg-accent px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground">
                  {sighting.animal_group}
                </span>
              )}
              <h3 className="mt-2 font-display text-2xl text-foreground">
                {sighting.common_name}
              </h3>
              {sighting.scientific_name && (
                <p className="text-sm italic text-muted-foreground">
                  {sighting.scientific_name}
                </p>
              )}
              {sighting.description && (
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                  {sighting.description}
                </p>
              )}
              <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                {new Date(sighting.created_at).toLocaleString()}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
