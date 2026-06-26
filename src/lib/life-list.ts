// Groups a flat list of sightings into a species-level "life list" collection,
// and derives the handoff badge for each species. Pure functions, run on the
// client over the existing ["sightings"] query.

import type { DbSighting } from "@/lib/sightings.functions";

export type SpeciesBadge = "new" | "season" | "rare" | null;

export type SpeciesEntry = {
  /** Stable key (lowercased common name) used for routing + grouping. */
  key: string;
  commonName: string;
  scientificName: string | null;
  group: string | null;
  count: number;
  /** Most recent sighting of this species (drives the card photo). */
  latest: DbSighting;
  firstSeen: string;
  lastSeen: string;
  locations: number;
  badge: SpeciesBadge;
};

export type NearbySpecies = {
  commonName: string;
  scientificName: string | null;
  group: string | null;
  count: number;
};

const DAY = 86_400_000;

function seasonKey(d: Date): string {
  // Meteorological seasons, hemisphere-agnostic (northern labels are fine as
  // a bucketing device — we only need a stable window per year).
  const m = d.getMonth();
  const season = m <= 1 || m === 11 ? "w" : m <= 4 ? "sp" : m <= 7 ? "su" : "a";
  const year = m === 11 ? d.getFullYear() + 1 : d.getFullYear();
  return `${season}-${year}`;
}

/**
 * Group sightings (already filtered to animals) by species, newest-first.
 * `nearby` powers the RARE NEARBY badge: a species you've logged that is
 * uncommon in nearby public sightings.
 */
export function buildLifeList(
  sightings: DbSighting[],
  nearby: NearbySpecies[] = [],
): SpeciesEntry[] {
  const now = new Date();
  const nowSeason = seasonKey(now);

  const rareNames = new Set(
    nearby.filter((n) => n.count <= 2).map((n) => n.commonName.toLowerCase()),
  );

  const map = new Map<string, DbSighting[]>();
  for (const s of sightings) {
    const key = s.common_name.trim().toLowerCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }

  const entries: SpeciesEntry[] = [];
  for (const [key, rows] of map) {
    const sorted = [...rows].sort(
      (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
    );
    const latest = sorted[0];
    const firstSeen = sorted[sorted.length - 1].created_at;
    const lastSeen = sorted[0].created_at;

    const locations = new Set(
      rows
        .filter((r) => r.lat != null && r.lng != null)
        .map((r) => `${r.lat!.toFixed(2)},${r.lng!.toFixed(2)}`),
    ).size;

    // Badge priority: rare > new > season (show at most one).
    let badge: SpeciesBadge = null;
    if (rareNames.has(key)) badge = "rare";
    else if (now.getTime() - +new Date(firstSeen) <= 14 * DAY) badge = "new";
    else if (seasonKey(new Date(firstSeen)) === nowSeason) badge = "season";

    entries.push({
      key,
      commonName: latest.common_name,
      scientificName: latest.scientific_name,
      group: latest.animal_group,
      count: rows.length,
      latest,
      firstSeen,
      lastSeen,
      locations,
      badge,
    });
  }

  return entries.sort((a, b) => +new Date(b.lastSeen) - +new Date(a.lastSeen));
}

export function badgeLabel(badge: SpeciesBadge): string | null {
  switch (badge) {
    case "new":
      return "New";
    case "season":
      return "First this season";
    case "rare":
      return "Rare nearby";
    default:
      return null;
  }
}

/** Species seen publicly nearby that the user has not logged yet (ghost slots). */
export function ghostSpecies(
  nearby: NearbySpecies[],
  mine: SpeciesEntry[],
  max = 4,
): NearbySpecies[] {
  const owned = new Set(mine.map((m) => m.key));
  return nearby
    .filter((n) => !owned.has(n.commonName.trim().toLowerCase()))
    .sort((a, b) => b.count - a.count)
    .slice(0, max);
}
