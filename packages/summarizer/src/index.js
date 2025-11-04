import { getLLM } from "./adapters";
import { buildPrompt } from "./prompt";
export async function summarizeWithEvidence(input) {
    const prompt = buildPrompt(input);
    const llm = getLLM();
    const raw = await llm.summarize({ prompt });
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    const safe = jsonStart >= 0 ? raw.slice(jsonStart, jsonEnd + 1) : "{\"items\":[]}";
    const parsed = JSON.parse(safe);
    parsed.items = (parsed.items ?? []).filter(it => Array.isArray(it.evidence_ids) && it.evidence_ids.length > 0);
    parsed.items = parsed.items.map(it => ({ ...it, score: typeof it.score === "number" ? it.score : 0.0 }));
    return parsed;
}
export * from "./types";
