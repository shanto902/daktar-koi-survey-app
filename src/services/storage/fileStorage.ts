import * as FileSystem from 'expo-file-system/legacy';
import { generateUUID } from '../../utils/uuid';

const PHOTOS_DIR_NAME = 'photos';
const EXPORTS_DIR_NAME = 'exports';

class FileStorageService {
  private baseDir: string | null = null;
  private photosDir: string | null = null;
  private exportsDir: string | null = null;
  private isInitialized = false;

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized && this.photosDir && this.exportsDir) {
      return;
    }

    this.baseDir = FileSystem.documentDirectory;
    if (!this.baseDir) {
      throw new Error('FileSystem documentDirectory is not available on this platform.');
    }

    this.photosDir = `${this.baseDir}${PHOTOS_DIR_NAME}/`;
    this.exportsDir = `${this.baseDir}${EXPORTS_DIR_NAME}/`;

    // Ensure photo directory exists
    const photoDirInfo = await FileSystem.getInfoAsync(this.photosDir);
    if (!photoDirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.photosDir, { intermediates: true });
    }

    // Ensure exports directory exists
    const exportsDirInfo = await FileSystem.getInfoAsync(this.exportsDir);
    if (!exportsDirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.exportsDir, { intermediates: true });
    }

    this.isInitialized = true;
  }

  /**
   * Resolve a relative path (e.g. 'photos/abc.jpg') to an absolute file URI
   */
  resolveUri(relativePathOrUri: string): string {
    if (!relativePathOrUri) return '';
    if (relativePathOrUri.startsWith('file://') || relativePathOrUri.startsWith('content://') || relativePathOrUri.startsWith('http')) {
      return relativePathOrUri;
    }
    const base = FileSystem.documentDirectory || '';
    // Strip leading slash if any
    const cleanRelative = relativePathOrUri.startsWith('/') ? relativePathOrUri.slice(1) : relativePathOrUri;
    return `${base}${cleanRelative}`;
  }

  /**
   * Save a temporary photo file (from camera or gallery) into permanent app storage.
   * Returns the relative path to store in SQLite: 'photos/<photoId>.<ext>'
   */
  async savePhoto(
    sourceUri: string,
    customPhotoId?: string,
    originalFilename?: string
  ): Promise<{ relativePath: string; absoluteUri: string; photoId: string; sizeBytes: number }> {
    await this.ensureInitialized();

    const photoId = customPhotoId || generateUUID();
    let extension = 'jpg';

    if (originalFilename && originalFilename.includes('.')) {
      const ext = originalFilename.split('.').pop()?.toLowerCase();
      if (ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        extension = ext;
      }
    } else if (sourceUri.includes('.')) {
      const ext = sourceUri.split('.').pop()?.split('?')[0]?.toLowerCase();
      if (ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        extension = ext;
      }
    }

    const filename = `${photoId}.${extension}`;
    const destinationUri = `${this.photosDir}${filename}`;
    const relativePath = `${PHOTOS_DIR_NAME}/${filename}`;

    // Copy to persistent document directory
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destinationUri,
    });

    const info = await FileSystem.getInfoAsync(destinationUri);
    const sizeBytes = info.exists && 'size' in info ? (info.size ?? 0) : 0;

    return {
      relativePath,
      absoluteUri: destinationUri,
      photoId,
      sizeBytes,
    };
  }

  /**
   * Read photo content as Base64 string for cloud OCR and JSON backup
   */
  async readPhotoAsBase64(relativePathOrUri: string): Promise<string> {
    const fullUri = this.resolveUri(relativePathOrUri);
    const info = await FileSystem.getInfoAsync(fullUri);
    if (!info.exists) {
      throw new Error(`Photo file does not exist at URI: ${fullUri}`);
    }
    return await FileSystem.readAsStringAsync(fullUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  /**
   * Write a Base64 encoded image directly to the persistent photos directory (used during restore)
   */
  async writePhotoFromBase64(
    fileName: string,
    base64Data: string
  ): Promise<{ relativePath: string; absoluteUri: string }> {
    await this.ensureInitialized();

    // Clean base64 data if it contains a data URL prefix
    const cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const targetFilename = fileName.includes('/') ? fileName.split('/').pop() || fileName : fileName;
    const destinationUri = `${this.photosDir}${targetFilename}`;
    const relativePath = `${PHOTOS_DIR_NAME}/${targetFilename}`;

    await FileSystem.writeAsStringAsync(destinationUri, cleanBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return {
      relativePath,
      absoluteUri: destinationUri,
    };
  }

  /**
   * Delete a photo file safely
   */
  async deletePhoto(relativePathOrUri: string): Promise<boolean> {
    try {
      const fullUri = this.resolveUri(relativePathOrUri);
      const info = await FileSystem.getInfoAsync(fullUri);
      if (info.exists) {
        await FileSystem.deleteAsync(fullUri, { idempotent: true });
        return true;
      }
      return false;
    } catch (e) {
      console.warn(`Failed to delete photo at ${relativePathOrUri}:`, e);
      return false;
    }
  }

  /**
   * Save an export file (JSON, CSV, ZIP) in the exports directory
   */
  async saveExportFile(
    filename: string,
    content: string,
    isBase64: boolean = false
  ): Promise<string> {
    await this.ensureInitialized();
    const destinationUri = `${this.exportsDir}${filename}`;

    await FileSystem.writeAsStringAsync(destinationUri, content, {
      encoding: isBase64 ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8,
    });

    return destinationUri;
  }

  /**
   * Calculate storage statistics: photo count and total bytes
   */
  async getStorageStats(): Promise<{ photoCount: number; totalBytes: number; photosDirUri: string }> {
    await this.ensureInitialized();
    if (!this.photosDir) {
      return { photoCount: 0, totalBytes: 0, photosDirUri: '' };
    }

    try {
      const files = await FileSystem.readDirectoryAsync(this.photosDir);
      let totalBytes = 0;

      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${this.photosDir}${file}`);
        if (fileInfo.exists && 'size' in fileInfo && fileInfo.size) {
          totalBytes += fileInfo.size;
        }
      }

      return {
        photoCount: files.length,
        totalBytes,
        photosDirUri: this.photosDir,
      };
    } catch {
      return { photoCount: 0, totalBytes: 0, photosDirUri: this.photosDir };
    }
  }

  /**
   * Clean up all photo files in the photos directory
   */
  async clearPhotos(): Promise<void> {
    await this.ensureInitialized();
    if (this.photosDir) {
      const info = await FileSystem.getInfoAsync(this.photosDir);
      if (info.exists) {
        await FileSystem.deleteAsync(this.photosDir, { idempotent: true });
        await FileSystem.makeDirectoryAsync(this.photosDir, { intermediates: true });
      }
    }
  }

  /**
   * Completely clear both photos and exports directories
   */
  async clearAllStorage(): Promise<void> {
    await this.clearPhotos();
    await this.clearExports();
  }

  /**
   * Clean up all files in exports directory
   */
  async clearExports(): Promise<void> {
    await this.ensureInitialized();
    if (this.exportsDir) {
      const info = await FileSystem.getInfoAsync(this.exportsDir);
      if (info.exists) {
        await FileSystem.deleteAsync(this.exportsDir, { idempotent: true });
        await FileSystem.makeDirectoryAsync(this.exportsDir, { intermediates: true });
      }
    }
  }
}

export const fileStorage = new FileStorageService();

