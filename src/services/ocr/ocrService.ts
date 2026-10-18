import { fileStorage } from '../storage/fileStorage';
import { settingsRepository } from '../../database/repositories/settingsRepository';
import { GoogleVisionOCRProvider } from './googleVisionProvider';
import { MockVisionOCRProvider } from './mockVisionProvider';
import { CustomGatewayOCRProvider } from './customGatewayProvider';
import { IOCRProvider, OCROptions, OCRResponse } from './types';

class OCRService {
  private async getActiveProvider(): Promise<IOCRProvider> {
    const providerType = await settingsRepository.get('ocr_provider', 'google');
    const googleKey = await settingsRepository.get('google_cloud_vision_key', '');
    const gatewayUrl = await settingsRepository.get('ocr_gateway_url', '');

    if (providerType === 'mock') {
      return new MockVisionOCRProvider();
    }

    if (providerType === 'gateway') {
      if (!gatewayUrl) {
        throw new Error(
          'OCR Gateway URL is not configured. Please set your Gateway URL in Settings > OCR Configuration, or enter survey details manually.'
        );
      }
      return new CustomGatewayOCRProvider(gatewayUrl);
    }

    // Default: Google Cloud Vision
    if (!googleKey) {
      throw new Error(
        'Google Cloud Vision API key is not configured. Go to Settings > OCR Configuration to set your API key to scan real photos, or enter survey details manually.'
      );
    }

    return new GoogleVisionOCRProvider(googleKey);
  }

  /**
   * Process a photo file stored on disk
   */
  async processPhoto(
    relativePathOrUri: string,
    options?: OCROptions
  ): Promise<OCRResponse> {
    try {
      const base64 = await fileStorage.readPhotoAsBase64(relativePathOrUri);
      return await this.processBase64(base64, options);
    } catch (err: any) {
      return {
        rawText: '',
        structuredData: {},
        provider: 'System',
        success: false,
        errorMessage: `Failed to read photo file: ${err?.message || 'Unknown error'}`,
        durationMs: 0,
      };
    }
  }

  /**
   * Process a Base64 encoded image
   */
  async processBase64(base64: string, options?: OCROptions): Promise<OCRResponse> {
    const provider = await this.getActiveProvider();
    const hints = await settingsRepository.get('ocr_language_hints', 'bn,en');
    const languageHints = hints ? hints.split(',').map((s) => s.trim()) : ['bn', 'en'];

    return await provider.processImage(base64, {
      languageHints,
      ...options,
    });
  }
}

export const ocrService = new OCRService();

