import { getLLM } from "./adapters";
import { buildPrompt } from "./prompt";
import type { SummarizeInput, SummarizeOutput } from "./types";

export async function summarizeWithEvidence(input: SummarizeInput): Promise<SummarizeOutput> {
  const prompt = buildPrompt(input);
  const llm = getLLM();
  const raw = await llm.summarize({ prompt });
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  const safe = jsonStart >= 0 ? raw.slice(jsonStart, jsonEnd + 1) : "{\"items\":[]}";

  let parsed: SummarizeOutput;
  try {
    parsed = JSON.parse(safe) as SummarizeOutput;
  } catch (error) {
    console.error("Failed to parse LLM response:", error);
    console.error("Raw response:", raw);
    // Return empty result instead of crashing
    return { items: [] };
  }

  parsed.items = (parsed.items ?? []).filter(it => Array.isArray(it.evidence_ids) && it.evidence_ids.length > 0);
  parsed.items = parsed.items.map(it => ({ ...it, score: typeof it.score === "number" ? it.score : 0.0 }));
  return parsed;
}

export * from "./types";