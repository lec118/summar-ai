import type { FastifyInstance } from "fastify";
import { ApiResponse, RouteParamsSchemas, FileValidators } from "@summa/shared";
import { registerSegment } from "./db.js";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "crypto";
import { Transform } from "node:stream";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_FILE_MB = 500;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

class FileTooLargeError extends Error {
  constructor(limitMb: number) {
    super(`File size exceeds ${limitMb}MB limit`);
    this.name = "FileTooLargeError";
  }
}

function createSizeGuard(limitBytes: number) {
  let total = 0;
  return new Transform({
    transform(chunk, _encoding, callback) {
      total += chunk.length;
      if (total > limitBytes) {
        callback(new FileTooLargeError(limitBytes / (1024 * 1024)));
        return;
      }
      callback(null, chunk);
    }
  });
}

export async function registerTus(app: FastifyInstance) {
  // Ensure upload directory exists
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  // Upload audio file for a session
  app.post("/sessions/:sid/upload", async (req, reply) => {
    // Validate route parameters
    const params = RouteParamsSchemas.sessionId.safeParse(req.params);
    if (!params.success) {
      return reply.code(400).send({ ok: false, error: "Invalid session ID" });
    }

    const { sid: sessionId } = params.data;

    const data = await req.file();
    if (!data) {
      return reply.code(400).send({ ok: false, error: "No file uploaded" });
    }

    // Validate file type
    if (!FileValidators.isAllowedAudioType(data.mimetype)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid file type: ${data.mimetype}. Only audio files are allowed.`
      });
    }

    const segmentId = randomUUID();
    const extension = data.mimetype.split('/')[1]?.replace('mpeg', 'mp3') || 'webm';
    const filename = `${sessionId}_${segmentId}_${Date.now()}.${extension}`;
    const localPath = path.join(UPLOAD_DIR, filename);

    try {
      await pipeline(
        data.file,
        createSizeGuard(MAX_FILE_BYTES),
        fs.createWriteStream(localPath)
      );

      const segment = registerSegment(sessionId, {
        id: segmentId,
        localPath
      });

      app.log.info({ segId: segment.id, mimetype: data.mimetype, size: data.file.bytesRead }, "segment uploaded");

      return ApiResponse({ segment });
    } catch (err) {
      app.log.error(err, "Upload failed");
      // Clean up partial file if it exists
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
      if (err instanceof FileTooLargeError) {
        return reply.code(400).send({ ok: false, error: err.message });
      }
      return reply.code(500).send({ ok: false, error: "Upload failed" });
    }
  });
}
