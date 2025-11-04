"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  getSTTAdapter: () => getSTTAdapter
});
module.exports = __toCommonJS(index_exports);

// src/openai.js
var import_file_from_path = require("formdata-node/file-from-path");
var import_formdata_node = require("formdata-node");
var import_node_fetch = __toESM(require("node-fetch"), 1);
var OpenAIWhisperAdapter = class {
  async transcribeFile({ filePath, language, prompt }) {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_STT_MODEL ?? "whisper-1";
    const fd = new import_formdata_node.FormData();
    fd.set("file", await (0, import_file_from_path.fileFromPath)(filePath));
    fd.set("model", model);
    if (language)
      fd.set("language", language);
    if (prompt)
      fd.set("prompt", prompt);
    const res = await (0, import_node_fetch.default)("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`OpenAI STT error: ${res.status} ${t}`);
    }
    const data = await res.json();
    return {
      text: data.text ?? "",
      language: data.language,
      confidence: void 0
    };
  }
};

// src/whisper.js
var LocalWhisperAdapter = class {
  async transcribeFile({ filePath, language, prompt }) {
    const url = process.env.WHISPER_ENDPOINT ?? "http://localhost:9000/transcribe";
    const res = await fetch(`${url}?path=${encodeURIComponent(filePath)}&lang=${language ?? ""}&prompt=${encodeURIComponent(prompt ?? "")}`);
    if (!res.ok)
      throw new Error(`Local Whisper error: ${res.statusText}`);
    const data = await res.json();
    return data;
  }
};

// src/index.ts
function getSTTAdapter() {
  const provider = (process.env.STT_PROVIDER ?? "openai").toLowerCase();
  if (provider === "whisper") return new LocalWhisperAdapter();
  return new OpenAIWhisperAdapter();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getSTTAdapter
});
