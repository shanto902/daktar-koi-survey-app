import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { doctorRepository } from '../../database/repositories/doctorRepository';
import { facilityRepository } from '../../database/repositories/facilityRepository';
import { doctorFacilityRepository } from '../../database/repositories/doctorFacilityRepository';
import { surveyRepository } from '../../database/repositories/surveyRepository';
import { photoRepository } from '../../database/repositories/photoRepository';
import { ocrRepository } from '../../database/repositories/ocrRepository';
import { fileStorage } from '../storage/fileStorage';
import { BackupImageItem, BackupPayload } from '../../types';
import { csvExporter } from './csvExporter';

export interface ExportProgressCallback {
  (progress: { current: number; total: number; stage: string }): void;
}

export const exportService = {
  /**
   * Export complete JSON backup including Base64-encoded photos
   */
  async exportCompleteJson(onProgress?: ExportProgressCallback): Promise<{ filePath: string; totalPhotos: number }> {
    onProgress?.({ current: 0, total: 100, stage: 'Fetching database records...' });

    const [doctors, facilities, doctorFacilities, surveys, surveyPhotos, ocrResults] =
      await Promise.all([
        doctorRepository.getAll(),
        facilityRepository.getAll(),
        doctorFacilityRepository.getAll(),
        surveyRepository.getAll(),
        photoRepository.getAll(),
        ocrRepository.getAll(),
      ]);

    onProgress?.({ current: 10, total: 100, stage: 'Reading photograph files...' });

    const images: BackupImageItem[] = [];
    const totalPhotos = surveyPhotos.length;
    let processed = 0;

    for (const photo of surveyPhotos) {
      processed++;
      onProgress?.({
        current: 10 + Math.floor((processed / (totalPhotos || 1)) * 70),
        total: 100,
        stage: `Encoding image ${processed} of ${totalPhotos}...`,
      });

      try {
        const base64Data = await fileStorage.readPhotoAsBase64(photo.local_path);
        images.push({
          photoId: photo.id,
          fileName: photo.original_filename || photo.local_path.split('/').pop() || `${photo.id}.jpg`,
          mimeType: photo.mime_type || 'image/jpeg',
          encoding: 'base64',
          data: base64Data,
        });
      } catch (err) {
        console.warn(`Could not read photo file for backup: ${photo.local_path}`, err);
        // Include entry with empty data so the relationship is not lost
        images.push({
          photoId: photo.id,
          fileName: photo.original_filename || `${photo.id}.jpg`,
          mimeType: photo.mime_type || 'image/jpeg',
          encoding: 'base64',
          data: '',
        });
      }
    }

    onProgress?.({ current: 85, total: 100, stage: 'Generating backup JSON file...' });

    const backup: BackupPayload = {
      format: 'doctor-survey-backup',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      metadata: {
        totalSurveys: surveys.length,
        totalDoctors: doctors.length,
        totalFacilities: facilities.length,
        totalPhotos: surveyPhotos.length,
        includesImages: true,
      },
      doctors,
      facilities,
      doctorFacilities,
      surveys,
      surveyPhotos,
      ocrResults,
      images,
    };

    const jsonString = JSON.stringify(backup, null, 2);
    const filename = `doctor_survey_backup_complete_${Date.now()}.json`;
    const filePath = await fileStorage.saveExportFile(filename, jsonString);

    onProgress?.({ current: 100, total: 100, stage: 'Complete!' });
    return { filePath, totalPhotos };
  },

  /**
   * Export data-only JSON without images
   */
  async exportDataOnlyJson(): Promise<string> {
    const [doctors, facilities, doctorFacilities, surveys, surveyPhotos, ocrResults] =
      await Promise.all([
        doctorRepository.getAll(),
        facilityRepository.getAll(),
        doctorFacilityRepository.getAll(),
        surveyRepository.getAll(),
        photoRepository.getAll(),
        ocrRepository.getAll(),
      ]);

    const backup: BackupPayload = {
      format: 'doctor-survey-backup',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      metadata: {
        totalSurveys: surveys.length,
        totalDoctors: doctors.length,
        totalFacilities: facilities.length,
        totalPhotos: surveyPhotos.length,
        includesImages: false,
      },
      doctors,
      facilities,
      doctorFacilities,
      surveys,
      surveyPhotos,
      ocrResults,
    };

    const jsonString = JSON.stringify(backup, null, 2);
    const filename = `doctor_survey_data_only_${Date.now()}.json`;
    return await fileStorage.saveExportFile(filename, jsonString);
  },

  /**
   * Export full ZIP package with backup.json and photos directory
   */
  async exportZipBackup(onProgress?: ExportProgressCallback): Promise<string> {
    onProgress?.({ current: 0, total: 100, stage: 'Packaging database...' });

    const [doctors, facilities, doctorFacilities, surveys, surveyPhotos, ocrResults] =
      await Promise.all([
        doctorRepository.getAll(),
        facilityRepository.getAll(),
        doctorFacilityRepository.getAll(),
        surveyRepository.getAll(),
        photoRepository.getAll(),
        ocrRepository.getAll(),
      ]);

    const zip = new JSZip();

    // 1. Add structured records
    const metadata = {
      format: 'doctor-survey-backup-zip',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      doctors,
      facilities,
      doctorFacilities,
      surveys,
      surveyPhotos,
      ocrResults,
    };
    zip.file('backup.json', JSON.stringify(metadata, null, 2));

    // 2. Add manifest
    const manifest: Record<string, string> = {};
    const imagesFolder = zip.folder('images');

    let processed = 0;
    const totalPhotos = surveyPhotos.length;

    for (const photo of surveyPhotos) {
      processed++;
      onProgress?.({
        current: 10 + Math.floor((processed / (totalPhotos || 1)) * 60),
        total: 100,
        stage: `Adding image ${processed} of ${totalPhotos} to ZIP...`,
      });

      try {
        const base64 = await fileStorage.readPhotoAsBase64(photo.local_path);
        const fileName = photo.local_path.split('/').pop() || `${photo.id}.jpg`;
        manifest[photo.id] = fileName;
        if (imagesFolder && base64) {
          imagesFolder.file(fileName, base64, { base64: true });
        }
      } catch (err) {
        console.warn(`Could not add photo ${photo.local_path} to ZIP:`, err);
      }
    }

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    onProgress?.({ current: 80, total: 100, stage: 'Compressing archive...' });

    const zipBase64 = await zip.generateAsync({
      type: 'base64',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const filename = `doctor_survey_backup_${Date.now()}.zip`;
    const filePath = await fileStorage.saveExportFile(filename, zipBase64, true);

    onProgress?.({ current: 100, total: 100, stage: 'Complete!' });
    return filePath;
  },

  /**
   * Export all tables as CSV files
   */
  async exportAllCsv(): Promise<{
    doctors: string;
    facilities: string;
    doctorFacilities: string;
    surveys: string;
    photos: string;
  }> {
    const [doctors, facilities, doctorFacilities, surveys, surveyPhotos] =
      await Promise.all([
        doctorRepository.getAll(),
        facilityRepository.getAll(),
        doctorFacilityRepository.getAll(),
        surveyRepository.getAll(),
        photoRepository.getAll(),
      ]);

    const [dCsv, fCsv, dfCsv, sCsv, pCsv] = await Promise.all([
      csvExporter.exportDoctors(doctors),
      csvExporter.exportFacilities(facilities),
      csvExporter.exportDoctorFacilities(doctorFacilities),
      csvExporter.exportSurveys(surveys),
      csvExporter.exportPhotos(surveyPhotos),
    ]);

    return {
      doctors: dCsv,
      facilities: fCsv,
      doctorFacilities: dfCsv,
      surveys: sCsv,
      photos: pCsv,
    };
  },

  /**
   * Share exported file via Android system share sheet
   */
  async shareFile(filePath: string, mimeType?: string): Promise<boolean> {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device.');
    }
    await Sharing.shareAsync(filePath, {
      mimeType: mimeType || 'application/json',
      dialogTitle: 'Export Doctor Survey Backup',
    });
    return true;
  },
};

