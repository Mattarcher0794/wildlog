import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "motion/react";

import { BlobAvatar, Wordmark } from "@/components/Brand";
import {
  SightingDetailModal,
  type DetailSighting,
} from "@/components/SightingDetail";
import { getPublicProfile, type PublicProfile } from "@/lib/profile.functions";
import { useState } from "react";

export const Route = createFileRoute("/$username")({
  loader: async ({ params }) => {
    const profile = await getPublicProfile({ data: { username: params.username } });
    if (!profile) throw notFound();
    return profile;
  },
  head: ({ loaderData, params }) => {
    const name = loaderData ? `@${loaderData.username}` : "Wildlog";
    const desc = loaderData
      ? `${loaderData.username}'s Wildlog field journal — ${loaderData.sightingCount} sightings across ${loaderData.speciesCount} species.`
      : "A Wildlog field journal.";
    const url = `https://wildlog.life/${params.username}`;
    return {
      meta: [
        { title: `${name} · Wildlog` },
        { name: "description", content: desc },
        { property: "og:title", content: `${name} · Wildlog` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: loaderData
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ProfilePage",
                url,
                mainEntity: {
                  "@type": "Person",
                  name: loaderData.username,
                  url,
                  interactionStatistic: {
                    "@type": "InteractionCounter",
                    interactionType: "https://schema.org/WriteAction",
                    userInteractionCount: loaderData.sightingCount,
                  },
                },
              }),
            },
          ]
        : [],
    };
  },
  component: PublicProfilePage,
  notFoundComponent: NotFound,
  errorComponent: NotFound,
});

function PublicProfilePage() {
  const profile = Route.useLoaderData() as PublicProfile;
  const [active, setActive] = useState<DetailSighting | null>(null);

  return (
    <main className="min-h-screen pb-16">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-6">
        <Wordmark />
      </header>

      <section className="mx-auto max-w-3xl px-5 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center text-center"
        >
          <BlobAvatar name={profile.username} className="h-24 w-24 text-4xl" />
          <h1 className="mt-4 font-display text-3xl text-foreground">
            @{profile.username}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Logging since{" "}
            {new Date(profile.joinedAt).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </p>
          <div className="mt-4 flex gap-6">
            <span className="text-sm text-muted-foreground">
              <span className="font-display text-xl text-foreground">
                {profile.sightingCount}
              </span>{" "}
              sightings
            </span>
            <span className="text-sm text-muted-foreground">
              <span className="font-display text-xl text-foreground">
                {profile.speciesCount}
              </span>{" "}
              species
            </span>
          </div>
        </motion.div>

        {profile.sightings.length === 0 ? (
          <p className="mt-12 text-center text-sm text-muted-foreground">
            No public sightings yet.
          </p>
        ) : (
          <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {profile.sightings.map((s, i) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 10) * 0.04 }}
                whileHover={{ y: -3 }}
                className="card-journal cursor-pointer bg-card p-3"
                onClick={() => setActive(s as DetailSighting)}
              >
                {s.image_url && (
                  <img
                    src={s.image_url}
                    alt={s.common_name}
                    loading="lazy"
                    className={`${i % 2 === 0 ? "blob" : "blob-alt"} aspect-square w-full object-cover`}
                  />
                )}
                <div className="px-1 py-2">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {s.common_name}
                  </p>
                  <p className="truncate text-xs italic text-muted-foreground">
                    {s.scientific_name || "—"}
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      <SightingDetailModal sighting={active} onClose={() => setActive(null)} />
    </main>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-4xl text-foreground">No journal here</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We couldn't find that field journal.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Go to Wildlog
        </Link>
      </div>
    </div>
  );
}
