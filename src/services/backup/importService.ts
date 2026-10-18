import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';
import { getDatabase, resetDatabase } from '../../database';
import { fileStorage } from '../storage/fileStorage';
import { BackupPayload } from '../../types';

import { validateBackupPayload } from '../../utils/backupValidation';

export interface ImportResult {
  success: boolean;
  mode: 'merge' | 'replace';
  totalSurveysImported: number;
  totalDoctorsImported: number;
  totalFacilitiesImported: number;
  totalPhotosRestored: number;
  conflictsReported: number;
  errors: string[];
}

export const importService = {
  /**
   * Let user pick a backup file from Android device storage
   */
  async pickBackupFile(): Promise<{ uri: string; name: string; size?: number } | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'application/zip', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.name,
      size: asset.size,
    };
  },

  /**
   * Validate raw JSON backup structure
   */
  validateBackup(payload: any): { valid: boolean; error?: string } {
    return validateBackupPayload(payload);
  },

  /**
   * Restore backup in 'Merge' mode:
   * Inserts records that do not yet exist, skips duplicates without overwriting,
   * writes missing photographs into persistent document storage.
   */
  async restoreMerge(payload: BackupPayload): Promise<ImportResult> {
    const validation = this.validateBackup(payload);
    if (!validation.valid) {
      return {
        success: false,
        mode: 'merge',
        totalSurveysImported: 0,
        totalDoctorsImported: 0,
        totalFacilitiesImported: 0,
        totalPhotosRestored: 0,
        conflictsReported: 0,
        errors: [validation.error || 'Validation failed'],
      };
    }

    const db = await getDatabase();
    const errors: string[] = [];
    let importedSurveys = 0;
    let importedDoctors = 0;
    let importedFacilities = 0;
    let restoredPhotos = 0;
    let conflicts = 0;

    // 1. Restore Images to Disk
    if (payload.images && Array.isArray(payload.images)) {
      for (const img of payload.images) {
        if (img.data && img.fileName) {
          try {
            await fileStorage.writePhotoFromBase64(img.fileName, img.data);
            restoredPhotos++;
          } catch (e: any) {
            errors.push(`Failed restoring photo ${img.fileName}: ${e.message}`);
          }
        }
      }
    }

    // 2. Merge Database Records inside transaction
    await db.withTransactionAsync(async () => {
      // Doctors
      for (const d of payload.doctors || []) {
        const existing = await db.getFirstAsync('SELECT id FROM doctors WHERE id = ?;', [d.id]);
        if (existing) {
          conflicts++;
        } else {
          await db.runAsync(
            `INSERT INTO doctors (
              id, name_bn, name_en, qualifications, specialization,
              bmdc_registration_number, primary_phone, additional_phones_json,
              notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              d.id,
              d.name_bn,
              d.name_en,
              d.qualifications,
              d.specialization,
              d.bmdc_registration_number,
              d.primary_phone,
              d.additional_phones_json,
              d.notes,
              d.created_at,
              d.updated_at,
            ]
          );
          importedDoctors++;
        }
      }

      // Facilities
      for (const f of payload.facilities || []) {
        const existing = await db.getFirstAsync('SELECT id FROM facilities WHERE id = ?;', [f.id]);
        if (existing) {
          conflicts++;
        } else {
          await db.runAsync(
            `INSERT INTO facilities (
              id, name_bn, name_en, facility_type, address, division,
              district, upazila, contact_numbers_json, opening_hours_json,
              latitude, longitude, gps_accuracy_meters, location_captured_at,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              f.id,
              f.name_bn,
              f.name_en,
              f.facility_type,
              f.address,
              f.division,
              f.district,
              f.upazila,
              f.contact_numbers_json,
              f.opening_hours_json,
              f.latitude,
              f.longitude,
              f.gps_accuracy_meters,
              f.location_captured_at,
              f.created_at,
              f.updated_at,
            ]
          );
          importedFacilities++;
        }
      }

      // DoctorFacilities
      for (const df of payload.doctorFacilities || []) {
        const existing = await db.getFirstAsync('SELECT id FROM doctor_facilities WHERE id = ?;', [df.id]);
        if (!existing) {
          await db.runAsync(
            `INSERT INTO doctor_facilities (
              id, doctor_id, facility_id, visiting_days_json,
              visiting_start_time, visiting_end_time, appointment_phone,
              consultation_fee, verification_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              df.id,
              df.doctor_id,
              df.facility_id,
              df.visiting_days_json,
              df.visiting_start_time,
              df.visiting_end_time,
              df.appointment_phone,
              df.consultation_fee,
              df.verification_status,
              df.created_at,
              df.updated_at,
            ]
          );
        }
      }

      // Surveys
      for (const s of payload.surveys || []) {
        const existing = await db.getFirstAsync('SELECT id FROM surveys WHERE id = ?;', [s.id]);
        if (existing) {
          conflicts++;
        } else {
          await db.runAsync(
            `INSERT INTO surveys (
              id, survey_type, doctor_id, facility_id, survey_date,
              status, latitude, longitude, gps_accuracy_meters,
              location_captured_at, address_notes, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              s.id,
              s.survey_type,
              s.doctor_id,
              s.facility_id,
              s.survey_date,
              s.status,
              s.latitude,
              s.longitude,
              s.gps_accuracy_meters,
              s.location_captured_at,
              s.address_notes,
              s.notes,
              s.created_at,
              s.updated_at,
            ]
          );
          importedSurveys++;
        }
      }

      // SurveyPhotos
      for (const p of payload.surveyPhotos || []) {
        const existing = await db.getFirstAsync('SELECT id FROM survey_photos WHERE id = ?;', [p.id]);
        if (!existing) {
          await db.runAsync(
            `INSERT INTO survey_photos (
              id, survey_id, photo_type, original_filename,
              mime_type, local_path, captured_at, width, height,
              ocr_status, raw_ocr_text, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              p.id,
              p.survey_id,
              p.photo_type,
              p.original_filename,
              p.mime_type,
              p.local_path,
              p.captured_at,
              p.width,
              p.height,
              p.ocr_status,
              p.raw_ocr_text,
              p.created_at,
            ]
          );
        }
      }

      // SurveyOCRResults
      for (const o of payload.ocrResults || []) {
        const existing = await db.getFirstAsync('SELECT id FROM survey_ocr_results WHERE id = ?;', [o.id]);
        if (!existing) {
          await db.runAsync(
            `INSERT INTO survey_ocr_results (
              id, survey_id, photo_id, provider, raw_text,
              structured_result_json, processing_status, processed_at, error_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              o.id,
              o.survey_id,
              o.photo_id,
              o.provider,
              o.raw_text,
              o.structured_result_json,
              o.processing_status,
              o.processed_at,
              o.error_message,
            ]
          );
        }
      }
    });

    return {
      success: true,
      mode: 'merge',
      totalSurveysImported: importedSurveys,
      totalDoctorsImported: importedDoctors,
      totalFacilitiesImported: importedFacilities,
      totalPhotosRestored: restoredPhotos,
      conflictsReported: conflicts,
      errors,
    };
  },

  /**
   * Restore backup in 'Replace All' mode:
   * Drops current database records and restores entire backup dataset and photographs.
   */
  async restoreReplaceAll(payload: BackupPayload): Promise<ImportResult> {
    const validation = this.validateBackup(payload);
    if (!validation.valid) {
      return {
        success: false,
        mode: 'replace',
        totalSurveysImported: 0,
        totalDoctorsImported: 0,
        totalFacilitiesImported: 0,
        totalPhotosRestored: 0,
        conflictsReported: 0,
        errors: [validation.error || 'Validation failed'],
      };
    }

    const errors: string[] = [];
    let restoredPhotos = 0;

    // 1. Clear existing photos and restore new images to document directory
    await fileStorage.clearPhotos();
    if (payload.images && Array.isArray(payload.images)) {
      for (const img of payload.images) {
        if (img.data && img.fileName) {
          try {
            await fileStorage.writePhotoFromBase64(img.fileName, img.data);
            restoredPhotos++;
          } catch (e: any) {
            errors.push(`Failed restoring photo ${img.fileName}: ${e.message}`);
          }
        }
      }
    }

    // 2. Wipe database tables cleanly
    await resetDatabase();
    const db = await getDatabase();

    // 3. Insert all records inside transaction
    await db.withTransactionAsync(async () => {
      // Doctors
      for (const d of payload.doctors || []) {
        await db.runAsync(
          `INSERT INTO doctors (
            id, name_bn, name_en, qualifications, specialization,
            bmdc_registration_number, primary_phone, additional_phones_json,
            notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            d.id,
            d.name_bn,
            d.name_en,
            d.qualifications,
            d.specialization,
            d.bmdc_registration_number,
            d.primary_phone,
            d.additional_phones_json,
            d.notes,
            d.created_at,
            d.updated_at,
          ]
        );
      }

      // Facilities
      for (const f of payload.facilities || []) {
        await db.runAsync(
          `INSERT INTO facilities (
            id, name_bn, name_en, facility_type, address, division,
            district, upazila, contact_numbers_json, opening_hours_json,
            latitude, longitude, gps_accuracy_meters, location_captured_at,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            f.id,
            f.name_bn,
            f.name_en,
            f.facility_type,
            f.address,
            f.division,
            f.district,
            f.upazila,
            f.contact_numbers_json,
            f.opening_hours_json,
            f.latitude,
            f.longitude,
            f.gps_accuracy_meters,
            f.location_captured_at,
            f.created_at,
            f.updated_at,
          ]
        );
      }

      // DoctorFacilities
      for (const df of payload.doctorFacilities || []) {
        await db.runAsync(
          `INSERT INTO doctor_facilities (
            id, doctor_id, facility_id, visiting_days_json,
            visiting_start_time, visiting_end_time, appointment_phone,
            consultation_fee, verification_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            df.id,
            df.doctor_id,
            df.facility_id,
            df.visiting_days_json,
            df.visiting_start_time,
            df.visiting_end_time,
            df.appointment_phone,
            df.consultation_fee,
            df.verification_status,
            df.created_at,
            df.updated_at,
          ]
        );
      }

      // Surveys
      for (const s of payload.surveys || []) {
        await db.runAsync(
          `INSERT INTO surveys (
            id, survey_type, doctor_id, facility_id, survey_date,
            status, latitude, longitude, gps_accuracy_meters,
            location_captured_at, address_notes, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            s.id,
            s.survey_type,
            s.doctor_id,
            s.facility_id,
            s.survey_date,
            s.status,
            s.latitude,
            s.longitude,
            s.gps_accuracy_meters,
            s.location_captured_at,
            s.address_notes,
            s.notes,
            s.created_at,
            s.updated_at,
          ]
        );
      }

      // SurveyPhotos
      for (const p of payload.surveyPhotos || []) {
        await db.runAsync(
          `INSERT INTO survey_photos (
            id, survey_id, photo_type, original_filename,
            mime_type, local_path, captured_at, width, height,
            ocr_status, raw_ocr_text, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            p.id,
            p.survey_id,
            p.photo_type,
            p.original_filename,
            p.mime_type,
            p.local_path,
            p.captured_at,
            p.width,
            p.height,
            p.ocr_status,
            p.raw_ocr_text,
            p.created_at,
          ]
        );
      }

      // SurveyOCRResults
      for (const o of payload.ocrResults || []) {
        await db.runAsync(
          `INSERT INTO survey_ocr_results (
            id, survey_id, photo_id, provider, raw_text,
            structured_result_json, processing_status, processed_at, error_message
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            o.id,
            o.survey_id,
            o.photo_id,
            o.provider,
            o.raw_text,
            o.structured_result_json,
            o.processing_status,
            o.processed_at,
            o.error_message,
          ]
        );
      }
    });

    return {
      success: true,
      mode: 'replace',
      totalSurveysImported: payload.surveys?.length || 0,
      totalDoctorsImported: payload.doctors?.length || 0,
      totalFacilitiesImported: payload.facilities?.length || 0,
      totalPhotosRestored: restoredPhotos,
      conflictsReported: 0,
      errors,
    };
  },

  /**
   * Import from file URI (supports both .json and .zip)
   */
  async importFromFileUri(
    uri: string,
    mode: 'merge' | 'replace'
  ): Promise<ImportResult> {
    try {
      if (uri.endsWith('.zip')) {
        return await this.importFromZipFile(uri, mode);
      }

      const content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const payload = JSON.parse(content);
      return mode === 'replace'
        ? await this.restoreReplaceAll(payload)
        : await this.restoreMerge(payload);
    } catch (err: any) {
      return {
        success: false,
        mode,
        totalSurveysImported: 0,
        totalDoctorsImported: 0,
        totalFacilitiesImported: 0,
        totalPhotosRestored: 0,
        conflictsReported: 0,
        errors: [`Failed to parse backup file: ${err.message}`],
      };
    }
  },

  /**
   * Import from ZIP archive
   */
  async importFromZipFile(
    uri: string,
    mode: 'merge' | 'replace'
  ): Promise<ImportResult> {
    const base64Data = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const zip = await JSZip.loadAsync(base64Data, { base64: true });
    const backupJsonFile = zip.file('backup.json');

    if (!backupJsonFile) {
      throw new Error('ZIP archive is missing "backup.json" metadata file.');
    }

    const jsonText = await backupJsonFile.async('text');
    const payload: BackupPayload = JSON.parse(jsonText);

    // Read images from ZIP
    const images: any[] = [];
    const imagesFolder = zip.folder('images');
    if (imagesFolder) {
      for (const [relativePath, file] of Object.entries(imagesFolder.files)) {
        if (!file.dir) {
          const imgBase64 = await file.async('base64');
          const fileName = relativePath.split('/').pop() || relativePath;
          images.push({
            photoId: fileName.split('.')[0],
            fileName,
            mimeType: 'image/jpeg',
            encoding: 'base64',
            data: imgBase64,
          });
        }
      }
    }

    payload.images = images;

    return mode === 'replace'
      ? await this.restoreReplaceAll(payload)
      : await this.restoreMerge(payload);
  },
};
