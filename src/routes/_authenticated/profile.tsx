import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Share2, LogOut, Check } from "lucide-react";

import { AccountContact } from "@/components/AccountContact";
import { BlobAvatar } from "@/components/Brand";
import { useMyProfile, useRequireUsername } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { listMySightings } from "@/lib/sightings.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Wildlog" },
      {
        name: "description",
        content:
          "Manage your Wildlog account, view your sighting stats, control contact details, and share your public field journal.",
      },
      { property: "og:title", content: "My Profile — Wildlog" },
      {
        property: "og:description",
        content:
          "Manage your Wildlog account, view your sighting stats, and share your public field journal.",
      },
      { property: "og:url", content: "https://wildlog.life/profile" },
    ],
    links: [{ rel: "canonical", href: "https://wildlog.life/profile" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  useRequireUsername();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useMyProfile();
  const sightingsQuery = useQuery({
    queryKey: ["sightings"],
    queryFn: () => listMySightings(),
  });
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    const animals = (sightingsQuery.data ?? []).filter((s) => s.is_animal);
    const species = new Set(animals.map((s) => s.common_name.toLowerCase())).size;
    const publicCount = animals.filter((s) => s.is_public).length;
    return { total: animals.length, species, publicCount };
  }, [sightingsQuery.data]);

  async function share() {
    if (!profile?.username) return;
    const url = `${window.location.origin}/@${profile.username}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My Wildlog journal", url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // user cancelled share
    }
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="min-h-screen pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <section className="mx-auto max-w-3xl px-5 pt-10">

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center text-center"
        >
          <BlobAvatar name={profile?.username} className="h-24 w-24 text-4xl" />
          <h1 className="mt-4 font-display text-3xl text-foreground">
            @{profile?.username ?? "…"}
          </h1>
          {profile?.created_at && (
            <p className="mt-1 text-sm text-muted-foreground">
              Logging since{" "}
              {new Date(profile.created_at).toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mt-8 grid grid-cols-3 gap-3"
        >
          <Stat label="Sightings" value={stats.total} />
          <Stat label="Species" value={stats.species} />
          <Stat label="Public" value={stats.publicCount} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mt-8"
        >
          <AccountContact />
        </motion.div>


        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mt-8 space-y-3"
        >
          <button
            onClick={share}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {copied ? (
              <>
                <Check className="h-5 w-5" /> Link copied
              </>
            ) : (
              <>
                <Share2 className="h-5 w-5" /> Share my journal
              </>
            )}
          </button>
          <button
            onClick={signOut}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-base font-medium text-foreground hover:bg-secondary"
          >
            <LogOut className="h-5 w-5" /> Sign out
          </button>
        </motion.div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-journal bg-card px-3 py-4 text-center">
      <p className="font-display text-3xl text-foreground">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
