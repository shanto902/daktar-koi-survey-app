import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

const DATABASE_NAME = 'doctor_survey.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA busy_timeout = 5000;
        PRAGMA foreign_keys = ON;
      `);
      await runMigrations(db);
      dbInstance = db;
      return db;
    } catch (err) {
      initPromise = null;
      console.error('Failed to initialize SQLite database:', err);
      throw err;
    }
  })();

  return initPromise;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    try {
      await dbInstance.closeAsync();
    } catch (e) {
      console.warn('Error closing SQLite connection:', e);
    } finally {
      dbInstance = null;
      initPromise = null;
    }
  }
}

/**
 * Resets the entire database cleanly without encountering lock contention.
 * Used for Replace-All backup restore or user data wipe.
 */
export async function resetDatabase(): Promise<void> {
  // 1. Close active connections so all locks are released
  await closeDatabase();

  // 2. Delete database file directly
  try {
    await SQLite.deleteDatabaseAsync(DATABASE_NAME);
  } catch (err) {
    console.warn('deleteDatabaseAsync failed, falling back to table truncation:', err);
    try {
      const db = await getDatabase();
      await db.execAsync('PRAGMA foreign_keys = OFF;');
      await db.execAsync(`
        DELETE FROM survey_ocr_results;
        DELETE FROM survey_photos;
        DELETE FROM surveys;
        DELETE FROM doctor_facilities;
        DELETE FROM facilities;
        DELETE FROM doctors;
        DELETE FROM app_settings;
        DELETE FROM schema_migrations;
      `);
      await db.execAsync('PRAGMA foreign_keys = ON;');
      await runMigrations(db);
      return;
    } catch (fallbackErr) {
      console.error('Fallback table truncation failed:', fallbackErr);
      throw fallbackErr;
    }
  }

  // 3. Re-open and re-run migrations fresh on clean database file
  await getDatabase();
}

