import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

// Создаем директорию для базы данных если её нет
const dbDir = join(process.cwd(), 'data');
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const dbPath = join(dbDir, 'interview.db');
const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });

console.log(`📊 Database initialized at: ${dbPath}`);
