// Reverse-geocoding via the Lovable Google Maps Platform connector gateway.
// Server-only: reads LOVABLE_API_KEY + GOOGLE_MAPS_API_KEY from the runtime env.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};
type GeoResult = {
  address_components?: AddressComponent[];
  formatted_address?: string;
  types?: string[];
};

// Most-specific → least-specific component types we'd like to show as a label.
const PREFERRED_TYPES = [
  "park",
  "natural_feature",
  "point_of_interest",
  "premise",
  "neighborhood",
  "sublocality",
  "sublocality_level_1",
  "locality",
  "postal_town",
  "administrative_area_level_2",
  "administrative_area_level_1",
] as const;

function pickName(results: GeoResult[]): string | null {
  // 1) A result that *is* a park / natural feature / POI — use its primary name.
  for (const r of results) {
    const t = r.types ?? [];
    if (
      t.includes("park") ||
      t.includes("natural_feature") ||
      t.includes("point_of_interest")
    ) {
      const comp = r.address_components?.[0];
      if (comp?.long_name) return comp.long_name;
    }
  }
  // 2) Best available component across all results, by preference order.
  for (const type of PREFERRED_TYPES) {
    for (const r of results) {
      const comp = r.address_components?.find((c) => c.types.includes(type));
      if (comp?.long_name) return comp.long_name;
    }
  }
  // 3) First chunk of the first formatted address.
  const fa = results[0]?.formatted_address;
  if (fa) return fa.split(",")[0]?.trim() || fa;
  return null;
}

/** Resolve a coordinate to a short human place name, or null on failure. */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovableKey || !mapsKey) return null;

  try {
    const res = await fetch(
      `${GATEWAY_URL}/maps/api/geocode/json?latlng=${lat},${lng}`,
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": mapsKey,
        },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { status?: string; results?: GeoResult[] };
    if (data.status !== "OK" || !data.results?.length) return null;
    return pickName(data.results);
  } catch {
    return null;
  }
}
