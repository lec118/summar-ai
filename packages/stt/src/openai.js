import { fileFromPath } from "formdata-node/file-from-path";
import { FormData } from "formdata-node";
import fetch from "node-fetch";
export class OpenAIWhisperAdapter {
    async transcribeFile({ filePath, language, prompt }) {
        const apiKey = process.env.OPENAI_API_KEY;
        const model = process.env.OPENAI_STT_MODEL ?? "whisper-1";
        const fd = new FormData();
        fd.set("file", await fileFromPath(filePath));
        fd.set("model", model);
        if (language)
            fd.set("language", language);
        if (prompt)
            fd.set("prompt", prompt);
        const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: fd
        });
        if (!res.ok) {
            const t = await res.text();
            throw new Error(`OpenAI STT error: ${res.status} ${t}`);
        }
        const data = (await res.json());
        return {
            text: data.text ?? "",
            language: data.language,
            confidence: undefined
        };
    }
}
