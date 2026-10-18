import { getDatabase } from '../index';
import {
  DashboardStats,
  Doctor,
  DoctorFacility,
  Facility,
  Survey,
  SurveyFullRecord,
  SurveyOCRResult,
  SurveyPhoto,
  SurveyStatus,
  SurveySummaryItem,
  SurveyType,
} from '../../types';

export interface SurveyFilterOptions {
  query?: string;
  surveyType?: SurveyType;
  status?: SurveyStatus;
  startDate?: string;
  endDate?: string;
  sortBy?: 'newest' | 'oldest';
  limit?: number;
  offset?: number;
}

export const surveyRepository = {
  async create(survey: Survey): Promise<Survey> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO surveys (
        id, survey_type, doctor_id, facility_id, survey_date,
        status, latitude, longitude, gps_accuracy_meters,
        location_captured_at, address_notes, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        survey.id,
        survey.survey_type,
        survey.doctor_id,
        survey.facility_id,
        survey.survey_date,
        survey.status,
        survey.latitude,
        survey.longitude,
        survey.gps_accuracy_meters,
        survey.location_captured_at,
        survey.address_notes,
        survey.notes,
        survey.created_at,
        survey.updated_at,
      ]
    );
    return survey;
  },

  async update(survey: Survey): Promise<Survey> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE surveys SET
        survey_type = ?,
        doctor_id = ?,
        facility_id = ?,
        survey_date = ?,
        status = ?,
        latitude = ?,
        longitude = ?,
        gps_accuracy_meters = ?,
        location_captured_at = ?,
        address_notes = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?;`,
      [
        survey.survey_type,
        survey.doctor_id,
        survey.facility_id,
        survey.survey_date,
        survey.status,
        survey.latitude,
        survey.longitude,
        survey.gps_accuracy_meters,
        survey.location_captured_at,
        survey.address_notes,
        survey.notes,
        survey.updated_at,
        survey.id,
      ]
    );
    return survey;
  },

  async getById(id: string): Promise<Survey | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Survey>('SELECT * FROM surveys WHERE id = ?;', [id]);
    return row ?? null;
  },

  async getAll(): Promise<Survey[]> {
    const db = await getDatabase();
    return await db.getAllAsync<Survey>('SELECT * FROM surveys ORDER BY created_at DESC;');
  },

  /**
   * Save or update an entire survey with doctor, facility, chamber schedule,
   * photos, and OCR results atomically in a single transaction.
   */
  async saveCompleteSurvey(payload: {
    survey: Survey;
    doctor?: Doctor | null;
    facility?: Facility | null;
    doctorFacility?: DoctorFacility | null;
    photos?: SurveyPhoto[];
    ocrResults?: SurveyOCRResult[];
  }): Promise<void> {
    const db = await getDatabase();

    await db.withTransactionAsync(async () => {
      // 1. Doctor
      if (payload.doctor) {
        await db.runAsync(
          `INSERT INTO doctors (
            id, name_bn, name_en, qualifications, specialization,
            bmdc_registration_number, primary_phone, additional_phones_json,
            notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name_bn = excluded.name_bn,
            name_en = excluded.name_en,
            qualifications = excluded.qualifications,
            specialization = excluded.specialization,
            bmdc_registration_number = excluded.bmdc_registration_number,
            primary_phone = excluded.primary_phone,
            additional_phones_json = excluded.additional_phones_json,
            notes = excluded.notes,
            updated_at = excluded.updated_at;`,
          [
            payload.doctor.id,
            payload.doctor.name_bn,
            payload.doctor.name_en,
            payload.doctor.qualifications,
            payload.doctor.specialization,
            payload.doctor.bmdc_registration_number,
            payload.doctor.primary_phone,
            payload.doctor.additional_phones_json,
            payload.doctor.notes,
            payload.doctor.created_at,
            payload.doctor.updated_at,
          ]
        );
      }

      // 2. Facility
      if (payload.facility) {
        await db.runAsync(
          `INSERT INTO facilities (
            id, name_bn, name_en, facility_type, address, division,
            district, upazila, contact_numbers_json, opening_hours_json,
            latitude, longitude, gps_accuracy_meters, location_captured_at,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name_bn = excluded.name_bn,
            name_en = excluded.name_en,
            facility_type = excluded.facility_type,
            address = excluded.address,
            division = excluded.division,
            district = excluded.district,
            upazila = excluded.upazila,
            contact_numbers_json = excluded.contact_numbers_json,
            opening_hours_json = excluded.opening_hours_json,
            latitude = excluded.latitude,
            longitude = excluded.longitude,
            gps_accuracy_meters = excluded.gps_accuracy_meters,
            location_captured_at = excluded.location_captured_at,
            updated_at = excluded.updated_at;`,
          [
            payload.facility.id,
            payload.facility.name_bn,
            payload.facility.name_en,
            payload.facility.facility_type,
            payload.facility.address,
            payload.facility.division,
            payload.facility.district,
            payload.facility.upazila,
            payload.facility.contact_numbers_json,
            payload.facility.opening_hours_json,
            payload.facility.latitude,
            payload.facility.longitude,
            payload.facility.gps_accuracy_meters,
            payload.facility.location_captured_at,
            payload.facility.created_at,
            payload.facility.updated_at,
          ]
        );
      }

      // 3. DoctorFacility relation
      if (payload.doctorFacility && payload.doctor && payload.facility) {
        await db.runAsync(
          `INSERT INTO doctor_facilities (
            id, doctor_id, facility_id, visiting_days_json,
            visiting_start_time, visiting_end_time, appointment_phone,
            consultation_fee, verification_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            doctor_id = excluded.doctor_id,
            facility_id = excluded.facility_id,
            visiting_days_json = excluded.visiting_days_json,
            visiting_start_time = excluded.visiting_start_time,
            visiting_end_time = excluded.visiting_end_time,
            appointment_phone = excluded.appointment_phone,
            consultation_fee = excluded.consultation_fee,
            verification_status = excluded.verification_status,
            updated_at = excluded.updated_at;`,
          [
            payload.doctorFacility.id,
            payload.doctorFacility.doctor_id,
            payload.doctorFacility.facility_id,
            payload.doctorFacility.visiting_days_json,
            payload.doctorFacility.visiting_start_time,
            payload.doctorFacility.visiting_end_time,
            payload.doctorFacility.appointment_phone,
            payload.doctorFacility.consultation_fee,
            payload.doctorFacility.verification_status,
            payload.doctorFacility.created_at,
            payload.doctorFacility.updated_at,
          ]
        );
      }

      // 4. Survey
      await db.runAsync(
        `INSERT INTO surveys (
          id, survey_type, doctor_id, facility_id, survey_date,
          status, latitude, longitude, gps_accuracy_meters,
          location_captured_at, address_notes, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          survey_type = excluded.survey_type,
          doctor_id = excluded.doctor_id,
          facility_id = excluded.facility_id,
          survey_date = excluded.survey_date,
          status = excluded.status,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          gps_accuracy_meters = excluded.gps_accuracy_meters,
          location_captured_at = excluded.location_captured_at,
          address_notes = excluded.address_notes,
          notes = excluded.notes,
          updated_at = excluded.updated_at;`,
        [
          payload.survey.id,
          payload.survey.survey_type,
          payload.survey.doctor_id,
          payload.survey.facility_id,
          payload.survey.survey_date,
          payload.survey.status,
          payload.survey.latitude,
          payload.survey.longitude,
          payload.survey.gps_accuracy_meters,
          payload.survey.location_captured_at,
          payload.survey.address_notes,
          payload.survey.notes,
          payload.survey.created_at,
          payload.survey.updated_at,
        ]
      );

      // 5. Photos
      if (payload.photos && payload.photos.length > 0) {
        for (const photo of payload.photos) {
          await db.runAsync(
            `INSERT INTO survey_photos (
              id, survey_id, photo_type, original_filename,
              mime_type, local_path, captured_at, width, height,
              ocr_status, raw_ocr_text, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              photo_type = excluded.photo_type,
              original_filename = excluded.original_filename,
              mime_type = excluded.mime_type,
              local_path = excluded.local_path,
              captured_at = excluded.captured_at,
              width = excluded.width,
              height = excluded.height,
              ocr_status = excluded.ocr_status,
              raw_ocr_text = excluded.raw_ocr_text;`,
            [
              photo.id,
              photo.survey_id,
              photo.photo_type,
              photo.original_filename,
              photo.mime_type,
              photo.local_path,
              photo.captured_at,
              photo.width,
              photo.height,
              photo.ocr_status,
              photo.raw_ocr_text,
              photo.created_at,
            ]
          );
        }
      }

      // 6. OCR Results
      if (payload.ocrResults && payload.ocrResults.length > 0) {
        for (const ocr of payload.ocrResults) {
          await db.runAsync(
            `INSERT INTO survey_ocr_results (
              id, survey_id, photo_id, provider, raw_text,
              structured_result_json, processing_status, processed_at, error_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              raw_text = excluded.raw_text,
              structured_result_json = excluded.structured_result_json,
              processing_status = excluded.processing_status,
              processed_at = excluded.processed_at,
              error_message = excluded.error_message;`,
            [
              ocr.id,
              ocr.survey_id,
              ocr.photo_id,
              ocr.provider,
              ocr.raw_text,
              ocr.structured_result_json,
              ocr.processing_status,
              ocr.processed_at,
              ocr.error_message,
            ]
          );
        }
      }
    });
  },

  /**
   * Fetch full survey details with associated entities
   */
  async getFullRecord(id: string): Promise<SurveyFullRecord | null> {
    const db = await getDatabase();
    const survey = await db.getFirstAsync<Survey>('SELECT * FROM surveys WHERE id = ?;', [id]);
    if (!survey) return null;

    let doctor: Doctor | null = null;
    if (survey.doctor_id) {
      doctor = await db.getFirstAsync<Doctor>('SELECT * FROM doctors WHERE id = ?;', [
        survey.doctor_id,
      ]);
    }

    let facility: Facility | null = null;
    if (survey.facility_id) {
      facility = await db.getFirstAsync<Facility>('SELECT * FROM facilities WHERE id = ?;', [
        survey.facility_id,
      ]);
    }

    let doctorFacility: DoctorFacility | null = null;
    if (survey.doctor_id && survey.facility_id) {
      doctorFacility = await db.getFirstAsync<DoctorFacility>(
        'SELECT * FROM doctor_facilities WHERE doctor_id = ? AND facility_id = ? LIMIT 1;',
        [survey.doctor_id, survey.facility_id]
      );
    }

    const photos = await db.getAllAsync<SurveyPhoto>(
      'SELECT * FROM survey_photos WHERE survey_id = ? ORDER BY created_at ASC;',
      [id]
    );

    const ocrResults = await db.getAllAsync<SurveyOCRResult>(
      'SELECT * FROM survey_ocr_results WHERE survey_id = ? ORDER BY processed_at DESC;',
      [id]
    );

    return {
      survey,
      doctor,
      facility,
      doctorFacility,
      photos,
      ocrResults,
    };
  },

  /**
   * Get filtered and paginated survey summaries for the History list
   */
  async getSummaries(filters: SurveyFilterOptions = {}): Promise<SurveySummaryItem[]> {
    const db = await getDatabase();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters.surveyType) {
      conditions.push('s.survey_type = ?');
      params.push(filters.surveyType);
    }

    if (filters.status) {
      conditions.push('s.status = ?');
      params.push(filters.status);
    }

    if (filters.startDate) {
      conditions.push('s.survey_date >= ?');
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push('s.survey_date <= ?');
      params.push(filters.endDate);
    }

    if (filters.query && filters.query.trim().length > 0) {
      const q = `%${filters.query.trim()}%`;
      conditions.push(
        `(d.name_bn LIKE ? OR d.name_en LIKE ? OR f.name_bn LIKE ? OR f.name_en LIKE ? OR d.primary_phone LIKE ? OR s.notes LIKE ?)`
      );
      params.push(q, q, q, q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderDirection = filters.sortBy === 'oldest' ? 'ASC' : 'DESC';
    const limitClause = filters.limit ? `LIMIT ${filters.limit}` : '';
    const offsetClause = filters.offset ? `OFFSET ${filters.offset}` : '';

    const sql = `
      SELECT
        s.id,
        s.survey_type,
        d.name_bn AS doctor_name_bn,
        d.name_en AS doctor_name_en,
        f.name_bn AS facility_name_bn,
        f.name_en AS facility_name_en,
        s.survey_date,
        s.status,
        s.latitude,
        s.longitude,
        s.gps_accuracy_meters,
        d.primary_phone,
        s.created_at,
        s.updated_at,
        COUNT(p.id) AS photo_count,
        (SELECT local_path FROM survey_photos WHERE survey_id = s.id ORDER BY created_at ASC LIMIT 1) AS primary_photo_path
      FROM surveys s
      LEFT JOIN doctors d ON s.doctor_id = d.id
      LEFT JOIN facilities f ON s.facility_id = f.id
      LEFT JOIN survey_photos p ON s.id = p.survey_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY s.created_at ${orderDirection}
      ${limitClause} ${offsetClause};
    `;

    return await db.getAllAsync<SurveySummaryItem>(sql, params);
  },

  /**
   * Get calculated real statistics from SQLite for the Dashboard
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const db = await getDatabase();
    const todayStr = new Date().toISOString().slice(0, 10);

    const [surveysCount] = await db.getAllAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM surveys;'
    );
    const [doctorsCount] = await db.getAllAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM doctors;'
    );
    const [facilitiesCount] = await db.getAllAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM facilities;'
    );
    const [surveysTodayCount] = await db.getAllAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM surveys WHERE survey_date = ? OR created_at LIKE ?;',
      [todayStr, `${todayStr}%`]
    );
    const [surveysWithOcrCount] = await db.getAllAsync<{ count: number }>(
      `SELECT COUNT(DISTINCT survey_id) AS count FROM survey_photos WHERE ocr_status = 'completed';`
    );
    const [surveysMissingGpsCount] = await db.getAllAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM surveys WHERE latitude IS NULL OR longitude IS NULL;'
    );
    const [draftSurveysCount] = await db.getAllAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM surveys WHERE status = 'Draft';`
    );
    const [completedSurveysCount] = await db.getAllAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM surveys WHERE status = 'Completed';`
    );

    return {
      totalSurveys: surveysCount?.count ?? 0,
      totalDoctors: doctorsCount?.count ?? 0,
      totalFacilities: facilitiesCount?.count ?? 0,
      surveysToday: surveysTodayCount?.count ?? 0,
      surveysWithOcr: surveysWithOcrCount?.count ?? 0,
      surveysMissingGps: surveysMissingGpsCount?.count ?? 0,
      draftSurveys: draftSurveysCount?.count ?? 0,
      completedSurveys: completedSurveysCount?.count ?? 0,
    };
  },

  /**
   * Get surveys with coordinates for map display
   */
  async getForMap(): Promise<
    {
      id: string;
      survey_type: SurveyType;
      latitude: number;
      longitude: number;
      gps_accuracy_meters: number | null;
      status: SurveyStatus;
      doctor_name: string | null;
      facility_name: string | null;
      address: string | null;
    }[]
  > {
    const db = await getDatabase();
    return await db.getAllAsync(`
      SELECT
        s.id,
        s.survey_type,
        s.latitude,
        s.longitude,
        s.gps_accuracy_meters,
        s.status,
        COALESCE(d.name_bn, d.name_en) AS doctor_name,
        COALESCE(f.name_bn, f.name_en) AS facility_name,
        COALESCE(f.address, s.address_notes) AS address
      FROM surveys s
      LEFT JOIN doctors d ON s.doctor_id = d.id
      LEFT JOIN facilities f ON s.facility_id = f.id
      WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL;
    `);
  },

  /**
   * Delete a survey and return relative photo paths so they can be deleted from disk safely
   */
  async deleteSurvey(id: string): Promise<{ deleted: boolean; photoPathsToDelete: string[] }> {
    const db = await getDatabase();

    // Find photo paths first
    const photos = await db.getAllAsync<{ local_path: string }>(
      'SELECT local_path FROM survey_photos WHERE survey_id = ?;',
      [id]
    );
    const photoPathsToDelete = photos.map((p) => p.local_path);

    let deleted = false;
    await db.withTransactionAsync(async () => {
      // Cascading foreign keys or manual cleanup
      await db.runAsync('DELETE FROM survey_ocr_results WHERE survey_id = ?;', [id]);
      await db.runAsync('DELETE FROM survey_photos WHERE survey_id = ?;', [id]);
      const res = await db.runAsync('DELETE FROM surveys WHERE id = ?;', [id]);
      deleted = res.changes > 0;
    });

    return { deleted, photoPathsToDelete };
  },
};

