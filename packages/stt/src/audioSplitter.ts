import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const MAX_CHUNK_SIZE_MB = 24; // 24MB to be safe (OpenAI limit is 25MB)
const MAX_CHUNK_SIZE_BYTES = MAX_CHUNK_SIZE_MB * 1024 * 1024;

interface AudioChunk {
  path: string;
  index: number;
  duration: number;
}

/**
 * Get audio file duration in seconds
 */
function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      const duration = metadata.format.duration;
      if (!duration) {
        reject(new Error('Could not determine audio duration'));
        return;
      }
      resolve(duration);
    });
  });
}

/**
 * Split audio file into chunks based on size limit
 */
export async function splitAudioFile(filePath: string): Promise<AudioChunk[]> {
  const fileStats = await stat(filePath);
  const fileSizeBytes = fileStats.size;

  // If file is small enough, return it as-is
  if (fileSizeBytes <= MAX_CHUNK_SIZE_BYTES) {
    const duration = await getAudioDuration(filePath);
    return [{
      path: filePath,
      index: 0,
      duration
    }];
  }

  console.log(`📦 File size ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB exceeds limit. Splitting...`);

  // Calculate how many chunks we need
  const totalDuration = await getAudioDuration(filePath);
  const numChunks = Math.ceil(fileSizeBytes / MAX_CHUNK_SIZE_BYTES);
  const chunkDuration = totalDuration / numChunks;

  console.log(`🔪 Splitting into ${numChunks} chunks of ~${chunkDuration.toFixed(1)}s each`);

  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext);

  // Create all chunks in parallel
  const chunkPromises = Array.from({ length: numChunks }, (_, i) => {
    const startTime = i * chunkDuration;
    const chunkPath = path.join(dir, `${basename}_chunk_${i}${ext}`);

    return new Promise<AudioChunk>((resolve, reject) => {
      ffmpeg(filePath)
        .setStartTime(startTime)
        .setDuration(chunkDuration)
        .output(chunkPath)
        .audioCodec('copy') // Copy audio codec to avoid re-encoding
        .on('end', async () => {
          console.log(`✅ Created chunk ${i + 1}/${numChunks}: ${chunkPath}`);
          try {
            const chunkDurationActual = await getAudioDuration(chunkPath);
            resolve({
              path: chunkPath,
              index: i,
              duration: chunkDurationActual
            });
          } catch (err) {
            reject(err);
          }
        })
        .on('error', (err) => {
          console.error(`❌ Error creating chunk ${i}:`, err);
          reject(err);
        })
        .run();
    });
  });

  // Wait for all chunks to be created
  const chunks = await Promise.all(chunkPromises);

  // Sort by index to ensure correct order
  chunks.sort((a, b) => a.index - b.index);

  return chunks;
}

/**
 * Clean up chunk files after processing
 */
export async function cleanupChunks(chunks: AudioChunk[], originalPath: string): Promise<void> {
  for (const chunk of chunks) {
    // Don't delete the original file
    if (chunk.path === originalPath) {
      continue;
    }

    try {
      await unlink(chunk.path);
      console.log(`🗑️  Deleted chunk: ${chunk.path}`);
    } catch (err) {
      console.error(`Failed to delete chunk ${chunk.path}:`, err);
    }
  }
}
