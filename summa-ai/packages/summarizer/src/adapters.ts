import fetch from "node-fetch";

export interface LLMAdapter {
  summarize(payload: {
    prompt: string;
    model?: string;
  }): Promise<string>;
}

export class OpenAILLM implements LLMAdapter {
  async summarize({ prompt, model }: { prompt: string; model?: string; }): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY!;
    const m = model ?? process.env.SUMM_OPENAI_MODEL ?? "gpt-5-turbo";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: m,
        messages: [
          { role: "system", content: "You are a summarization model that MUST cite slide evidence IDs for every bullet. Output JSON only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2
      })
    });
    if (!res.ok) throw new Error(`OpenAI summarize error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices[0].message.content;
  }
}

export class AnthropicLLM implements LLMAdapter {
  async summarize({ prompt, model }: { prompt: string; model?: string; }): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY!;
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
    if (!res.ok) throw new Error(`Anthropic summarize error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.content?.[0]?.text ?? "";
  }
}

export function getLLM(): LLMAdapter {
  const p = (process.env.SUMM_LLM ?? "openai").toLowerCase();
  if (p === "anthropic") return new AnthropicLLM();
  return new OpenAILLM();
}