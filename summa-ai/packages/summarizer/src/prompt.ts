import type { SummarizeInput } from "./types";

export function buildPrompt(input: SummarizeInput) {
  const evMap: Record<string, string> = {};
  for (const a of input.alignments) {
    evMap[a.paraId] = `${a.deckId}:${a.slidePage}:${a.paraId}`;
  }
  const slidesBrief = input.slides.map(s => `- ${s.deckId}:${s.page} :: ${s.text.slice(0,160).replace(/\n/g," ")}`).join("\n");
  const parasBrief = input.paragraphs.map(p => {
    const e = evMap[p.id] ?? "";
    return `- ${p.id} [${p.startMs}-${p.endMs}] ${e ? `(evidence:${e})` : ""} :: ${p.text.slice(0,160).replace(/\n/g," ")}`;
  }).join("\n");

  return `You are given lecture SLIDES and TRANSCRIPT PARAGRAPHS with pre-computed evidence matches.

Rules:
- Output JSON with shape: {"items":[{"level":"segment","text":"...","evidence_ids":["deck:page:paraId", ...],"score":0.0}]}
- EVERY item MUST include at least one evidence_id (no exceptions). If no evidence, SKIP that item.
- Prefer merging adjacent paragraphs that cite the SAME slide page.
- 5~8 bullets max for a 1-hour segment.
- Korean output (keep terminology from slides).

Slides (id:page :: text-head):
${slidesBrief}

Paragraphs (id [ms] (evidence) :: text-head):
${parasBrief}

Return JSON only.`;
}