import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

// Создаем директорию для базы данных если её нет
const dbDir = join(process.cwd(), 'data');
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const dbPath = join(dbDir, 'interview.db');
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

console.log('🔄 Running migrations...');
migrate(db, { migrationsFolder: './drizzle' });
console.log('✅ Migrations completed!');

sqlite.close();
