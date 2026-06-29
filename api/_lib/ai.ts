/**
 * Milestone 7: real AI processing via OpenAI.
 *
 * Every function is defensive: if the API key is missing or a call fails, it
 * returns null so the caller can fall back to the mock pipeline and the demo
 * never breaks. No throwing out of this module.
 */

const OPENAI_BASE = "https://api.openai.com/v1";
const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";

export function isAiEnabled() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function apiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return key;
}

export type NoteIntelligence = {
  summary: string;
  tags: string[];
  entities: { type: string; value: string }[];
  actionItems: string[];
};

/** Transcribe an audio buffer with Whisper. Returns null on any failure. */
export async function transcribeAudio(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<string | null> {
  try {
    const form = new FormData();
    form.append("model", TRANSCRIBE_MODEL);
    form.append(
      "file",
      new Blob([buffer], { type: mimeType || "audio/webm" }),
      filename || "audio.webm",
    );

    const response = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}` },
      body: form,
    });

    if (!response.ok) return null;
    const data = (await response.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Produce a summary, tags, entities, and action items from the combined note
 * text (written content + transcripts). Returns null on any failure.
 */
export async function analyzeNote(
  text: string,
): Promise<NoteIntelligence | null> {
  const trimmed = text.replace(/\s+/g, " ").trim().slice(0, 8000);
  if (!trimmed) return null;

  try {
    const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TEXT_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You extract structured metadata from a personal note so it can be searched later. " +
              "Respond with a single JSON object and nothing else, matching this shape: " +
              '{"summary": string (1-2 sentences), "tags": string[] (3-6 lowercase topical tags, no # prefix), ' +
              '"entities": [{"type": "person"|"place"|"project"|"tool"|"company"|"framework"|"language"|"content_topic", "value": string}], ' +
              '"actionItems": string[] (imperative tasks found in the note, may be empty)}.',
          },
          { role: "user", content: trimmed },
        ],
      }),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as Partial<NoteIntelligence>;
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      tags: Array.isArray(parsed.tags)
        ? parsed.tags
            .filter((t): t is string => typeof t === "string")
            .map((t) => t.trim().replace(/^#/, ""))
            .filter(Boolean)
        : [],
      entities: Array.isArray(parsed.entities)
        ? parsed.entities
            .filter(
              (e): e is { type: string; value: string } =>
                Boolean(e) &&
                typeof e.type === "string" &&
                typeof e.value === "string",
            )
            .map((e) => ({ type: e.type, value: e.value.trim() }))
            .filter((e) => e.value)
        : [],
      actionItems: Array.isArray(parsed.actionItems)
        ? parsed.actionItems
            .filter((a): a is string => typeof a === "string")
            .map((a) => a.trim())
            .filter(Boolean)
        : [],
    };
  } catch {
    return null;
  }
}

/** Describe an image (passed as a data URL) for search + accessibility. */
export async function describeImage(dataUrl: string): Promise<string | null> {
  if (!dataUrl?.startsWith("data:")) return null;

  try {
    const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TEXT_MODEL,
        max_tokens: 120,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe this image in one concise, factual sentence suitable for search and alt text.",
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}
