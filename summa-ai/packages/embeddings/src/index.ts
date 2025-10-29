import fetch from "node-fetch";

export type EmbeddingResp = { vector: number[]; model: string };

export async function embedTexts(texts: string[], model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-large"): Promise<EmbeddingResp[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model, input: texts })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embeddings error: ${res.status} ${t}`);
  }
  const data = await res.json();
  return data.data.map((d: any) => ({ vector: d.embedding, model: data.model }));
}