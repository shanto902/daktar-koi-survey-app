import { getDatabase } from '../index';
import { SurveyPhoto } from '../../types';

export const photoRepository = {
  async create(photo: SurveyPhoto): Promise<SurveyPhoto> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO survey_photos (
        id, survey_id, photo_type, original_filename,
        mime_type, local_path, captured_at, width, height,
        ocr_status, raw_ocr_text, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
    return photo;
  },

  async update(photo: SurveyPhoto): Promise<SurveyPhoto> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE survey_photos SET
        photo_type = ?,
        original_filename = ?,
        mime_type = ?,
        local_path = ?,
        captured_at = ?,
        width = ?,
        height = ?,
        ocr_status = ?,
        raw_ocr_text = ?
      WHERE id = ?;`,
      [
        photo.photo_type,
        photo.original_filename,
        photo.mime_type,
        photo.local_path,
        photo.captured_at,
        photo.width,
        photo.height,
        photo.ocr_status,
        photo.raw_ocr_text,
        photo.id,
      ]
    );
    return photo;
  },

  async getById(id: string): Promise<SurveyPhoto | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<SurveyPhoto>(
      'SELECT * FROM survey_photos WHERE id = ?;',
      [id]
    );
    return row ?? null;
  },

  async getBySurveyId(surveyId: string): Promise<SurveyPhoto[]> {
    const db = await getDatabase();
    return await db.getAllAsync<SurveyPhoto>(
      'SELECT * FROM survey_photos WHERE survey_id = ? ORDER BY created_at ASC;',
      [surveyId]
    );
  },

  async getAll(): Promise<SurveyPhoto[]> {
    const db = await getDatabase();
    return await db.getAllAsync<SurveyPhoto>(
      'SELECT * FROM survey_photos ORDER BY created_at DESC;'
    );
  },

  async updateOcrStatus(
    id: string,
    ocrStatus: SurveyPhoto['ocr_status'],
    rawOcrText?: string | null
  ): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE survey_photos SET ocr_status = ?, raw_ocr_text = COALESCE(?, raw_ocr_text) WHERE id = ?;`,
      [ocrStatus, rawOcrText ?? null, id]
    );
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync('DELETE FROM survey_photos WHERE id = ?;', [id]);
    return result.changes > 0;
  },
};

