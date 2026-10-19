import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

let globalDbInstance: DatabaseSync | null = null;

export function createSqliteDatabase(dbPath?: string): DatabaseSync {
  let resolvedPath: string;
  if (dbPath) {
    resolvedPath = dbPath === ':memory:' ? ':memory:' : path.resolve(process.cwd(), dbPath);
  } else if (process.env.WOOD_DB_PATH) {
    resolvedPath = process.env.WOOD_DB_PATH === ':memory:' ? ':memory:' : path.resolve(process.cwd(), process.env.WOOD_DB_PATH);
  } else {
    resolvedPath = path.resolve(process.cwd(), 'data', 'wood_inventory.db');
  }

  if (resolvedPath !== ':memory:') {
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(resolvedPath);

  // Enable foreign keys and pragmas
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');

  if (resolvedPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA synchronous = NORMAL;');
  }

  return db;
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
