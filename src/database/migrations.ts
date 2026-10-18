import { type SQLiteDatabase } from 'expo-sqlite';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: async (db: SQLiteDatabase) => {
      // Enable foreign keys
      await db.execAsync('PRAGMA foreign_keys = ON;');

      // 1. doctors table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS doctors (
          id TEXT PRIMARY KEY,
          name_bn TEXT,
          name_en TEXT,
          qualifications TEXT,
          specialization TEXT,
          bmdc_registration_number TEXT,
          primary_phone TEXT,
          additional_phones_json TEXT,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_doctors_name_bn ON doctors(name_bn);
        CREATE INDEX IF NOT EXISTS idx_doctors_name_en ON doctors(name_en);
        CREATE INDEX IF NOT EXISTS idx_doctors_phone ON doctors(primary_phone);
        CREATE INDEX IF NOT EXISTS idx_doctors_bmdc ON doctors(bmdc_registration_number);
      `);

      // 2. facilities table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS facilities (
          id TEXT PRIMARY KEY,
          name_bn TEXT,
          name_en TEXT,
          facility_type TEXT NOT NULL,
          address TEXT,
          division TEXT,
          district TEXT,
          upazila TEXT,
          contact_numbers_json TEXT,
          opening_hours_json TEXT,
          latitude REAL,
          longitude REAL,
          gps_accuracy_meters REAL,
          location_captured_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_facilities_name_bn ON facilities(name_bn);
        CREATE INDEX IF NOT EXISTS idx_facilities_name_en ON facilities(name_en);
        CREATE INDEX IF NOT EXISTS idx_facilities_type ON facilities(facility_type);
        CREATE INDEX IF NOT EXISTS idx_facilities_district ON facilities(district);
        CREATE INDEX IF NOT EXISTS idx_facilities_lat_lng ON facilities(latitude, longitude);
      `);

      // 3. doctor_facilities table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS doctor_facilities (
          id TEXT PRIMARY KEY,
          doctor_id TEXT NOT NULL,
          facility_id TEXT NOT NULL,
          visiting_days_json TEXT,
          visiting_start_time TEXT,
          visiting_end_time TEXT,
          appointment_phone TEXT,
          consultation_fee REAL,
          verification_status TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
          FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_docfac_doctor_id ON doctor_facilities(doctor_id);
        CREATE INDEX IF NOT EXISTS idx_docfac_facility_id ON doctor_facilities(facility_id);
      `);

      // 4. surveys table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS surveys (
          id TEXT PRIMARY KEY,
          survey_type TEXT NOT NULL,
          doctor_id TEXT,
          facility_id TEXT,
          survey_date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Draft',
          latitude REAL,
          longitude REAL,
          gps_accuracy_meters REAL,
          location_captured_at TEXT,
          address_notes TEXT,
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
          FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_surveys_type ON surveys(survey_type);
        CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);
        CREATE INDEX IF NOT EXISTS idx_surveys_date ON surveys(survey_date);
        CREATE INDEX IF NOT EXISTS idx_surveys_doctor_id ON surveys(doctor_id);
        CREATE INDEX IF NOT EXISTS idx_surveys_facility_id ON surveys(facility_id);
        CREATE INDEX IF NOT EXISTS idx_surveys_lat_lng ON surveys(latitude, longitude);
        CREATE INDEX IF NOT EXISTS idx_surveys_created_at ON surveys(created_at);
      `);

      // 5. survey_photos table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS survey_photos (
          id TEXT PRIMARY KEY,
          survey_id TEXT NOT NULL,
          photo_type TEXT NOT NULL,
          original_filename TEXT,
          mime_type TEXT,
          local_path TEXT NOT NULL,
          captured_at TEXT,
          width INTEGER,
          height INTEGER,
          ocr_status TEXT NOT NULL DEFAULT 'pending',
          raw_ocr_text TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_photos_survey_id ON survey_photos(survey_id);
        CREATE INDEX IF NOT EXISTS idx_photos_ocr_status ON survey_photos(ocr_status);
      `);

      // 6. survey_ocr_results table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS survey_ocr_results (
          id TEXT PRIMARY KEY,
          survey_id TEXT,
          photo_id TEXT,
          provider TEXT NOT NULL,
          raw_text TEXT NOT NULL,
          structured_result_json TEXT,
          processing_status TEXT NOT NULL,
          processed_at TEXT NOT NULL,
          error_message TEXT,
          FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
          FOREIGN KEY (photo_id) REFERENCES survey_photos(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_ocr_survey_id ON survey_ocr_results(survey_id);
        CREATE INDEX IF NOT EXISTS idx_ocr_photo_id ON survey_ocr_results(photo_id);
      `);

      // 7. app_settings table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    },
  },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Ensure schema_migrations table exists
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version ASC;'
  );
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      console.log(`Applying migration v${migration.version}: ${migration.name}`);
      await db.withTransactionAsync(async () => {
        await migration.up(db);
        await db.runAsync(
          'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
          [migration.version, migration.name, new Date().toISOString()]
        );
      });
      console.log(`Migration v${migration.version} applied successfully.`);
    }
  }
}

