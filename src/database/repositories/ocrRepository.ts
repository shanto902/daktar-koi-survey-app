import { getDatabase } from '../index';
import { SurveyOCRResult } from '../../types';

export const ocrRepository = {
  async create(result: SurveyOCRResult): Promise<SurveyOCRResult> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO survey_ocr_results (
        id, survey_id, photo_id, provider, raw_text,
        structured_result_json, processing_status, processed_at, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        result.id,
        result.survey_id,
        result.photo_id,
        result.provider,
        result.raw_text,
        result.structured_result_json,
        result.processing_status,
        result.processed_at,
        result.error_message,
      ]
    );
    return result;
  },

  async getBySurveyId(surveyId: string): Promise<SurveyOCRResult[]> {
    const db = await getDatabase();
    return await db.getAllAsync<SurveyOCRResult>(
      'SELECT * FROM survey_ocr_results WHERE survey_id = ? ORDER BY processed_at DESC;',
      [surveyId]
    );
  },

  async getByPhotoId(photoId: string): Promise<SurveyOCRResult | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<SurveyOCRResult>(
      'SELECT * FROM survey_ocr_results WHERE photo_id = ? ORDER BY processed_at DESC LIMIT 1;',
      [photoId]
    );
    return row ?? null;
  },

  async getAll(): Promise<SurveyOCRResult[]> {
    const db = await getDatabase();
    return await db.getAllAsync<SurveyOCRResult>(
      'SELECT * FROM survey_ocr_results ORDER BY processed_at DESC;'
    );
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    const res = await db.runAsync('DELETE FROM survey_ocr_results WHERE id = ?;', [id]);
    return res.changes > 0;
  },
};

