import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { fileStorage } from '../services/storage/fileStorage';
import { PhotoType } from '../constants/surveyTypes';
import { SurveyPhoto } from '../types';
import { generateUUID } from '../utils/uuid';

export interface StagedPhoto extends SurveyPhoto {
  previewUri: string;
}

export function useCameraCapture(surveyId: string) {
  const [photos, setPhotos] = useState<StagedPhoto[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Launch device camera to capture new photo
   */
  const capturePhoto = async (photoType: PhotoType = 'Doctor Visiting Card'): Promise<StagedPhoto | null> => {
    try {
      setIsCapturing(true);
      setError(null);

      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        setError('Camera permission is required to take photographs of visiting cards and banners.');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // Keep original intact
        quality: 0.9,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      const photoId = generateUUID();
      const now = new Date().toISOString();

      // Copy permanently into application persistent storage
      const saved = await fileStorage.savePhoto(asset.uri, photoId, asset.fileName || 'camera_photo.jpg');

      const newPhoto: StagedPhoto = {
        id: photoId,
        survey_id: surveyId,
        photo_type: photoType,
        original_filename: asset.fileName || `${photoId}.jpg`,
        mime_type: asset.mimeType || 'image/jpeg',
        local_path: saved.relativePath,
        captured_at: now,
        width: asset.width || null,
        height: asset.height || null,
        ocr_status: 'pending',
        raw_ocr_text: null,
        created_at: now,
        previewUri: saved.absoluteUri,
      };

      setPhotos((prev) => [...prev, newPhoto]);
      return newPhoto;
    } catch (err: any) {
      setError(err?.message || 'Failed to capture photo from camera.');
      return null;
    } finally {
      setIsCapturing(false);
    }
  };

  /**
   * Select an existing photo from the photo gallery
   */
  const pickFromGallery = async (photoType: PhotoType = 'Doctor Visiting Card'): Promise<StagedPhoto | null> => {
    try {
      setIsCapturing(true);
      setError(null);

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setError('Photo library permission is required to select images.');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // Keep original intact
        quality: 0.9,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      const photoId = generateUUID();
      const now = new Date().toISOString();

      const saved = await fileStorage.savePhoto(asset.uri, photoId, asset.fileName || 'gallery_photo.jpg');

      const newPhoto: StagedPhoto = {
        id: photoId,
        survey_id: surveyId,
        photo_type: photoType,
        original_filename: asset.fileName || `${photoId}.jpg`,
        mime_type: asset.mimeType || 'image/jpeg',
        local_path: saved.relativePath,
        captured_at: now,
        width: asset.width || null,
        height: asset.height || null,
        ocr_status: 'pending',
        raw_ocr_text: null,
        created_at: now,
        previewUri: saved.absoluteUri,
      };

      setPhotos((prev) => [...prev, newPhoto]);
      return newPhoto;
    } catch (err: any) {
      setError(err?.message || 'Failed to pick photo from gallery.');
      return null;
    } finally {
      setIsCapturing(false);
    }
  };

  /**
   * Update the category/type of an existing staged photo
   */
  const updatePhotoType = (photoId: string, newType: PhotoType) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, photo_type: newType } : p))
    );
  };

  /**
   * Update OCR result on a staged photo
   */
  const updatePhotoOCR = (photoId: string, status: SurveyPhoto['ocr_status'], text: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, ocr_status: status, raw_ocr_text: text } : p))
    );
  };

  /**
   * Remove a photograph and delete from disk if staged
   */
  const removePhoto = async (photoId: string): Promise<void> => {
    const photoToRemove = photos.find((p) => p.id === photoId);
    if (photoToRemove) {
      await fileStorage.deletePhoto(photoToRemove.local_path);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    }
  };

  return {
    photos,
    setPhotos,
    isCapturing,
    error,
    capturePhoto,
    pickFromGallery,
    updatePhotoType,
    updatePhotoOCR,
    removePhoto,
  };
}

