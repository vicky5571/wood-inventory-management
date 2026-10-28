import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

let globalDbInstance: DatabaseSync | null = null;

function isServerlessEnvironment(): boolean {
  return Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.NOW_REGION
  );
}

function instantiateDatabase(targetPath: string): DatabaseSync {
  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(targetPath);

  // Enable foreign keys and pragmas
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');

  if (targetPath !== ':memory:') {
    try {
      db.exec('PRAGMA journal_mode = WAL;');
      db.exec('PRAGMA synchronous = NORMAL;');
    } catch {
      // WAL may not be supported on some serverless/virtual mounts, fallback gracefully
    }
  }

  return db;
}

export function createSqliteDatabase(dbPath?: string): DatabaseSync {
  let resolvedPath: string;

  if (dbPath) {
    resolvedPath = dbPath === ':memory:' ? ':memory:' : path.resolve(process.cwd(), dbPath);
  } else if (process.env.WOOD_DB_PATH) {
    resolvedPath = process.env.WOOD_DB_PATH === ':memory:' ? ':memory:' : path.resolve(process.cwd(), process.env.WOOD_DB_PATH);
  } else if (isServerlessEnvironment()) {
    // Vercel / AWS Lambda: /var/task is read-only. Only /tmp is writable.
    const tmpDbPath = path.join('/tmp', 'wood_inventory.db');
    if (!fs.existsSync(tmpDbPath)) {
      const bundledDbPath = path.resolve(process.cwd(), 'data', 'wood_inventory.db');
      if (fs.existsSync(bundledDbPath)) {
        try {
          fs.copyFileSync(bundledDbPath, tmpDbPath);
          if (fs.existsSync(bundledDbPath + '-wal')) {
            fs.copyFileSync(bundledDbPath + '-wal', tmpDbPath + '-wal');
          }
          if (fs.existsSync(bundledDbPath + '-shm')) {
            fs.copyFileSync(bundledDbPath + '-shm', tmpDbPath + '-shm');
          }
        } catch {
          // If copy fails, fresh initialization in /tmp will run migrations & seed
        }
      }
    }
    resolvedPath = tmpDbPath;
  } else {
    resolvedPath = path.resolve(process.cwd(), 'data', 'wood_inventory.db');
  }

  try {
    return instantiateDatabase(resolvedPath);
  } catch (primaryErr) {
    // If opening targeted file fails (e.g. read-only filesystem, EROFS, or error 14),
    // fallback to /tmp or :memory: to prevent complete API failure.
    if (resolvedPath !== ':memory:') {
      if (!resolvedPath.startsWith('/tmp')) {
        const fallbackTmpPath = path.join('/tmp', 'wood_inventory.db');
        try {
          return instantiateDatabase(fallbackTmpPath);
        } catch {
          // Fall through to in-memory fallback
        }
      }
      console.warn(`[Sqlite] Failed to open ${resolvedPath}, falling back to in-memory database:`, primaryErr);
      return instantiateDatabase(':memory:');
    }
    throw primaryErr;
  }
}

export function getDatabaseConnection(): DatabaseSync {
  if (!globalDbInstance) {
    globalDbInstance = createSqliteDatabase();
  }
  return globalDbInstance;
}

export function closeDatabaseConnection(): void {
  if (globalDbInstance) {
    try {
      globalDbInstance.close();
    } catch {
      // Ignore if already closed
    }
    globalDbInstance = null;
  }
}
