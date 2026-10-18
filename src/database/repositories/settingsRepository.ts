import { getDatabase } from '../index';

export const settingsRepository = {
  async get(key: string, defaultValue: string | null = null): Promise<string | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?;',
      [key]
    );
    return row ? row.value : defaultValue;
  },

  async set(key: string, value: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
      [key, value, now]
    );
  },

  async getAll(): Promise<Record<string, string>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM app_settings;'
    );
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return map;
  },

  async delete(key: string): Promise<boolean> {
    const db = await getDatabase();
    const res = await db.runAsync('DELETE FROM app_settings WHERE key = ?;', [key]);
    return res.changes > 0;
  },
};

