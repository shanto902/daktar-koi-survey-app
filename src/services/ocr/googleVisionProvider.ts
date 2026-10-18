import { IOCRProvider, OCROptions, OCRResponse } from './types';
import { extractStructuredDataFromText } from './structuredExtractor';

export class GoogleVisionOCRProvider implements IOCRProvider {
  name = 'Google Cloud Vision';

  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async processImage(base64Image: string, options?: OCROptions): Promise<OCRResponse> {
    const startTime = Date.now();

    if (!this.apiKey || this.apiKey.trim().length === 0) {
      return {
        rawText: '',
        structuredData: {},
        provider: this.name,
        success: false,
        errorMessage: 'Google Cloud Vision API key is not configured in Settings.',
        durationMs: Date.now() - startTime,
      };
    }

    // Clean base64 prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const timeoutMs = options?.timeoutMs || 20000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(this.apiKey)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: cleanBase64,
                },
                features: [
                  {
                    type: 'DOCUMENT_TEXT_DETECTION',
                    maxResults: 1,
                  },
                ],
                imageContext: {
                  languageHints: options?.languageHints || ['bn', 'en'],
                },
              },
            ],
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text();
        let parsedMessage = `API request failed with HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.error?.message) {
            parsedMessage = parsed.error.message;
          }
        } catch {}
        return {
          rawText: '',
          structuredData: {},
          provider: this.name,
          success: false,
          errorMessage: parsedMessage,
          durationMs: Date.now() - startTime,
        };
      }

      const json = await response.json();
      const firstResponse = json.responses?.[0];

      if (firstResponse?.error?.message) {
        return {
          rawText: '',
          structuredData: {},
          provider: this.name,
          success: false,
          errorMessage: firstResponse.error.message,
          durationMs: Date.now() - startTime,
        };
      }

      const rawText = firstResponse?.fullTextAnnotation?.text || '';
      const structuredData = extractStructuredDataFromText(rawText);

      return {
        rawText,
        structuredData,
        provider: this.name,
        success: true,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      clearTimeout(timer);
      const isTimeout = err?.name === 'AbortError' || err?.message?.includes('aborted');
      return {
        rawText: '',
        structuredData: {},
        provider: this.name,
        success: false,
        errorMessage: isTimeout
          ? 'OCR request timed out. Please check your internet connection.'
          : err?.message || 'Failed to connect to Google Vision OCR service.',
        durationMs: Date.now() - startTime,
      };
    }
  }
}

