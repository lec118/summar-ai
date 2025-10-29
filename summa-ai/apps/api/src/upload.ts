import type { FastifyInstance } from "fastify";
import { ApiResponse, RouteParamsSchemas, FileValidators } from "@summa/shared";
import { registerSegment } from "./db.js";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

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

    // Validate file size (500MB max)
    const sizeValidation = FileValidators.validateFileSize(
      data.file.bytesRead || 0,
      500
    );
    if (!sizeValidation.valid) {
      return reply.code(400).send({ ok: false, error: sizeValidation.error });
    }

    const segmentId = randomUUID();
    const extension = data.mimetype.split('/')[1]?.replace('mpeg', 'mp3') || 'webm';
    const filename = `${sessionId}_${segmentId}_${Date.now()}.${extension}`;
    const localPath = path.join(UPLOAD_DIR, filename);

    try {
      await pipeline(data.file, fs.createWriteStream(localPath));

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
      return reply.code(500).send({ ok: false, error: "Upload failed" });
    }
  });
}