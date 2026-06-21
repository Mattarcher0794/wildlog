import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  imageDataUrl: z.string().min(20),
});

export const ANIMAL_GROUPS = [
  "Mammal",
  "Bird",
  "Reptile",
  "Amphibian",
  "Fish",
  "Insect",
  "Arachnid",
  "Mollusk",
  "Crustacean",
  "Other",
] as const;

export type AnimalGroup = (typeof ANIMAL_GROUPS)[number];

export type AnimalIdentification = {
  commonName: string;
  scientificName: string;
  group: AnimalGroup;
  confidence: "low" | "medium" | "high";
  description: string;
  isAnimal: boolean;
  note?: string;
};

const SYSTEM = `You are an expert naturalist working as a friendly field guide.
Given a photo, identify the animal visible. You can identify ANY animal — mammals,
birds, reptiles, amphibians, fish, insects, arachnids, mollusks, crustaceans, and
other marine or land creatures.
Respond ONLY with a single JSON object matching this exact shape:
{
  "isAnimal": boolean,
  "commonName": string,
  "scientificName": string,
  "group": one of "Mammal" | "Bird" | "Reptile" | "Amphibian" | "Fish" | "Insect" | "Arachnid" | "Mollusk" | "Crustacean" | "Other",
  "confidence": "low" | "medium" | "high",
  "description": string,
  "note": string (optional)
}
- "group" is the broad taxonomic category that best fits the animal.
- "description" is 2-3 short sentences covering habitat, distinctive features, and one charming fun fact.
- If the image does not contain an animal, set isAnimal=false, commonName "Not an animal", scientificName "", group "Other", confidence "low", and describe what you see instead.
- Never wrap the JSON in markdown fences. No prose outside the JSON.`;

export const identifyAnimal = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<AnimalIdentification> => {
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
              { type: "text", text: "Identify the animal in this photo." },
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
    let parsed: AnimalIdentification;
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
