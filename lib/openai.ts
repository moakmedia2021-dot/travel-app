// Lightweight OpenAI wrapper using fetch (no SDK dep).
// Uses Structured Outputs so the response is guaranteed to parse.

export type GeneratedItem = {
  day_number: number;
  title: string;
  type: "flight" | "hotel" | "activity" | "transport" | "note";
  start_time: string | null; // "HH:MM"
  end_time: string | null;
  location_name: string | null;
  price: number | null;
  notes: string | null;
};

type GeneratedItinerary = { items: GeneratedItem[] };

export function hasOpenAIKey(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

const ITINERARY_SCHEMA = {
  name: "itinerary",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            day_number: { type: "integer", minimum: 1 },
            title: { type: "string" },
            type: {
              type: "string",
              enum: ["flight", "hotel", "activity", "transport", "note"],
            },
            start_time: { type: ["string", "null"], description: "HH:MM 24-hour, or null" },
            end_time: { type: ["string", "null"] },
            location_name: { type: ["string", "null"] },
            price: { type: ["number", "null"], minimum: 0 },
            notes: { type: ["string", "null"] },
          },
          required: [
            "day_number",
            "title",
            "type",
            "start_time",
            "end_time",
            "location_name",
            "price",
            "notes",
          ],
        },
      },
    },
    required: ["items"],
  },
} as const;

export async function generateItinerary(args: {
  destination: string;
  startDate: string | null;
  endDate: string | null;
  dayCount: number;
  travelers: number;
  budgetTotal: number | null;
  currency: string;
  interests: string[];
  freeText: string;
}): Promise<GeneratedItinerary> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");

  const system = `You are an experienced travel planner. Generate a realistic, well-paced itinerary as structured JSON.

Rules:
- Cover days 1 through ${args.dayCount} (inclusive). Use day_number 1 for the first day.
- 3-5 items per day on average. Include hotels (one per multi-night stay, day_number = check-in day), at least one flight per trip if it's intercity, activities, and brief "note" items where useful.
- start_time / end_time are local 24h "HH:MM" strings. Use null for things without a clock time.
- Prices in ${args.currency} as numbers (no currency symbol).${args.budgetTotal ? ` Aim for items that sum to about ${args.budgetTotal} ${args.currency} total.` : ""}
- location_name is a short place name (e.g., "Senso-ji Temple"), not full address.
- Be specific. Real venue names, real neighborhoods.`;

  const user = `Destination: ${args.destination}
Dates: ${args.startDate ?? "TBD"} → ${args.endDate ?? "TBD"}
Travelers: ${args.travelers}
${args.budgetTotal ? `Budget: ${args.budgetTotal} ${args.currency}` : "Budget: flexible"}
Interests: ${args.interests.join(", ") || "general sightseeing"}
${args.freeText ? `Extra notes from traveler: ${args.freeText}` : ""}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: ITINERARY_SCHEMA },
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = data.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty response");
  return JSON.parse(content) as GeneratedItinerary;
}
