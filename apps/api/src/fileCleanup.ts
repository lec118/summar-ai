import cron from 'node-cron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config, CONSTANTS } from './config.js';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Clean up uploaded files older than MAX_AGE_MS
 */
async function cleanupOldFiles(): Promise<void> {
  console.log('🧹 Starting file cleanup job...');
  const now = Date.now();
  let deletedCount = 0;
  let totalSize = 0;

  try {
    // Check if upload directory exists
    try {
      await fs.access(UPLOAD_DIR);
    } catch {
      console.log('📂 Upload directory does not exist yet, skipping cleanup');
      return;
    }

    const files = await fs.readdir(UPLOAD_DIR);

    for (const file of files) {
      try {
        const filePath = path.join(UPLOAD_DIR, file);
        const stats = await fs.stat(filePath);

        // Skip if not a file
        if (!stats.isFile()) continue;

        const ageMs = now - stats.mtimeMs;

        if (ageMs > MAX_AGE_MS) {
          const sizeKB = Math.round(stats.size / 1024);
          await fs.unlink(filePath);
          deletedCount++;
          totalSize += stats.size;
          console.log(`  ✓ Deleted: ${file} (${sizeKB} KB, age: ${Math.round(ageMs / (24 * 60 * 60 * 1000))} days)`);
        }
      } catch (err) {
        console.error(`  ✗ Failed to process file ${file}:`, err instanceof Error ? err.message : err);
      }
    }

    if (deletedCount > 0) {
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
      console.log(`✅ Cleanup complete. Deleted ${deletedCount} file(s), freed ${totalSizeMB} MB`);
    } else {
      console.log('✅ Cleanup complete. No old files found.');
    }
  } catch (error) {
    console.error('❌ Cleanup job failed:', error instanceof Error ? error.message : error);
  }
}

/**
 * Initialize file cleanup cron job
 * Runs daily at 2 AM
 */
export function initializeFileCleanup(): void {
  if (config.NODE_ENV === 'test') {
    console.log('⚠️  File cleanup disabled in test environment');
    return;
  }

  // Run daily at 2 AM
  cron.schedule('0 2 * * *', () => {
    cleanupOldFiles().catch(err => {
      console.error('❌ Unhandled error in cleanup job:', err);
    });
  });

  console.log('🗑️  File cleanup job scheduled (daily at 2 AM)');

  // Optional: Run cleanup on startup in development
  if (config.NODE_ENV === 'development') {
    console.log('🔧 Running initial cleanup in development mode...');
    cleanupOldFiles().catch(err => {
      console.error('❌ Initial cleanup failed:', err);
    });
  }
}

/**
 * Manually trigger file cleanup (for testing or manual execution)
 */
export async function runCleanupNow(): Promise<void> {
  await cleanupOldFiles();
}
