import type { FastifyInstance } from "fastify";
import { ApiResponse, RouteParamsSchemas, FileValidators } from "@summa/shared";
import { registerSegment } from "./db.js";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "crypto";
import { Transform } from "node:stream";
import { promisify } from "node:util";

const readFile = promisify(fs.read);

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_FILE_MB = 3000; // 3GB - supports up to 4 hours of audio
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

/**
 * Verify file type by checking magic numbers (file signatures)
 * Returns true if the file is a valid audio file
 */
async function verifyAudioFileSignature(filePath: string): Promise<boolean> {
  const buffer = Buffer.alloc(12); // Read first 12 bytes
  const fd = fs.openSync(filePath, 'r');

  try {
    const bytesRead = fs.readSync(fd, buffer, 0, 12, 0);
    if (bytesRead < 4) return false;

    // Check common audio file signatures
    // MP3: FF FB, FF F3, FF F2, or ID3 (49 44 33)
    if (buffer[0] === 0xFF && (buffer[1] === 0xFB || buffer[1] === 0xF3 || buffer[1] === 0xF2)) {
      return true;
    }
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
      return true; // ID3 tag
    }

    // WAV/WAVE: RIFF....WAVE (52 49 46 46)
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
      return true;
    }

    // M4A/MP4: ....ftyp (66 74 79 70 at offset 4)
    if (bytesRead >= 8 && buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
      return true;
    }

    // OGG: OggS (4F 67 67 53)
    if (buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
      return true;
    }

    // FLAC: fLaC (66 4C 61 43)
    if (buffer[0] === 0x66 && buffer[1] === 0x4C && buffer[2] === 0x61 && buffer[3] === 0x43) {
      return true;
    }

    // WebM: 1A 45 DF A3
    if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
      return true;
    }

    return false;
  } finally {
    fs.closeSync(fd);
  }
}

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

      // Verify file signature (magic number check)
      const isValidAudio = await verifyAudioFileSignature(localPath);
      if (!isValidAudio) {
        // Clean up invalid file
        fs.unlinkSync(localPath);
        return reply.code(400).send({
          ok: false,
          error: 'Invalid audio file format. The file may be corrupted or is not a valid audio file.'
        });
      }

      const segment = await registerSegment(sessionId, {
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
