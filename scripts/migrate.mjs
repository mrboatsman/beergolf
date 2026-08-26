// Kör väntande Drizzle-migreringar (drizzle/*.sql) mot DATABASE_URL.
// Används som container-start (före servern) — kräver inte drizzle-kit.
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const url = (process.env.DATABASE_URL ?? './data/beergolf.db').replace(/^file:/, '');
mkdirSync(dirname(url), { recursive: true });

const sqlite = new Database(url);
sqlite.pragma('journal_mode = WAL');
migrate(drizzle(sqlite), { migrationsFolder: './drizzle' });
sqlite.close();
console.log(`Migreringar applicerade på ${url}`);
