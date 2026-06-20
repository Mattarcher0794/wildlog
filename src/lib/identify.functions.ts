import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  imageDataUrl: z.string().min(20),
});

export type BirdIdentification = {
  commonName: string;
  scientificName: string;
  confidence: "low" | "medium" | "high";
  description: string;
  isBird: boolean;
  note?: string;
};

const SYSTEM = `You are an expert ornithologist working as a friendly field guide.
Given a photo, identify the bird species visible.
Respond ONLY with a single JSON object matching this exact shape:
{
  "isBird": boolean,
  "commonName": string,
  "scientificName": string,
  "confidence": "low" | "medium" | "high",
  "description": string,
  "note": string (optional)
}
- "description" is 2-3 short sentences covering habitat, distinctive markings, and one charming fun fact.
- If the image does not contain a bird, set isBird=false, leave commonName as "Not a bird", scientificName as "", confidence "low", description explaining what you see instead.
- Never wrap the JSON in markdown fences. No prose outside the JSON.`;

export const identifyBird = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<BirdIdentification> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "Identify the bird in this photo." },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Too many requests — please wait a moment and try again.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please add credits in Settings → Plans & credits.");
      throw new Error(`Identification failed (${res.status}): ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    let parsed: BirdIdentification;
    try {
      parsed = JSON.parse(content);
    } catch {
      // try to extract JSON if model wrapped it
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Could not parse AI response.");
      parsed = JSON.parse(match[0]);
    }
    return parsed;
  });
