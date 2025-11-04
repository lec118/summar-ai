// src/adapters.ts
import fetch from "node-fetch";
var OpenAILLM = class {
  async summarize({ prompt, model }) {
    const apiKey = process.env.OPENAI_API_KEY;
    const primaryModel = model ?? process.env.SUMM_OPENAI_MODEL ?? "gpt-4o-mini";
    const fallbackModel = "gpt-4o";
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: primaryModel,
          messages: [
            { role: "system", content: "You are a summarization model that MUST cite slide evidence IDs for every bullet. Output JSON only." },
            { role: "user", content: prompt }
          ],
          temperature: 0.2
        })
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`OpenAI ${primaryModel} failed (${res.status}): ${errorText}`);
        console.log(`Falling back to ${fallbackModel}...`);
        const fallbackRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: fallbackModel,
            messages: [
              { role: "system", content: "You are a summarization model that MUST cite slide evidence IDs for every bullet. Output JSON only." },
              { role: "user", content: prompt }
            ],
            temperature: 0.2
          })
        });
        if (!fallbackRes.ok) {
          throw new Error(`OpenAI fallback ${fallbackModel} error ${fallbackRes.status}: ${await fallbackRes.text()}`);
        }
        const fallbackData = await fallbackRes.json();
        return fallbackData.choices[0]?.message?.content ?? "";
      }
      const data = await res.json();
      return data.choices[0]?.message?.content ?? "";
    } catch (error) {
      console.error("OpenAI summarize error:", error);
      throw error;
    }
  }
};
var AnthropicLLM = class {
  async summarize({ prompt, model }) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const m = model ?? process.env.SUMM_ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20240620";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: m,
        max_tokens: 1200,
        temperature: 0.2,
        system: "You are a summarization model that MUST cite slide evidence IDs for every bullet. Output JSON only.",
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!res.ok) {
      throw new Error(`Anthropic summarize error ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text ?? "";
  }
};
function getLLM() {
  const provider = (process.env.SUMM_LLM ?? "openai").toLowerCase();
  if (provider === "anthropic") {
    return new AnthropicLLM();
  }
  return new OpenAILLM();
}

// src/prompt.ts
function buildPrompt(input) {
  const evMap = {};
  for (const a of input.alignments) {
    evMap[a.paraId] = `${a.deckId}:${a.slidePage}:${a.paraId}`;
  }
  const slidesBrief = input.slides.map((s) => `- ${s.deckId}:${s.page} :: ${s.text.slice(0, 160).replace(/\n/g, " ")}`).join("\n");
  const parasBrief = input.paragraphs.map((p) => {
    const e = evMap[p.id] ?? "";
    return `- ${p.id} [${p.startMs}-${p.endMs}] ${e ? `(evidence:${e})` : ""} :: ${p.text.slice(0, 160).replace(/\n/g, " ")}`;
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

// src/index.ts
async function summarizeWithEvidence(input) {
  const prompt = buildPrompt(input);
  const llm = getLLM();
  const raw = await llm.summarize({ prompt });
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  const safe = jsonStart >= 0 ? raw.slice(jsonStart, jsonEnd + 1) : '{"items":[]}';
  let parsed;
  try {
    parsed = JSON.parse(safe);
  } catch (error) {
    console.error("Failed to parse LLM response:", error);
    console.error("Raw response:", raw);
    return { items: [] };
  }
  parsed.items = (parsed.items ?? []).filter((it) => Array.isArray(it.evidence_ids) && it.evidence_ids.length > 0);
  parsed.items = parsed.items.map((it) => ({ ...it, score: typeof it.score === "number" ? it.score : 0 }));
  return parsed;
}
export {
  summarizeWithEvidence
};
