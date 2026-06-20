import type { BirdIdentification } from "./identify.functions";

export type Sighting = {
  id: string;
  at: number;
  thumbnail: string; // small data URL
  result: BirdIdentification;
};

const KEY = "plumage.sightings.v1";
const MAX = 12;

export function loadSightings(): Sighting[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Sighting[];
  } catch {
    return [];
  }
}

export function saveSighting(s: Sighting) {
  if (typeof window === "undefined") return;
  const all = [s, ...loadSightings()].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function clearSightings() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

// Downscale an image data URL to a small thumbnail (for storage).
export async function makeThumbnail(dataUrl: string, max = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = dataUrl;
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error ?? new Error("Read failed"));
    r.readAsDataURL(file);
  });
}
