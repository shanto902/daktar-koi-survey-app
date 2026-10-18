import { IOCRProvider, OCROptions, OCRResponse } from './types';
import { extractStructuredDataFromText } from './structuredExtractor';

export class CustomGatewayOCRProvider implements IOCRProvider {
  name = 'Custom Gateway';

  private gatewayUrl: string;

  constructor(gatewayUrl: string) {
    this.gatewayUrl = gatewayUrl;
  }

  async processImage(base64Image: string, options?: OCROptions): Promise<OCRResponse> {
    const startTime = Date.now();

    if (!this.gatewayUrl || this.gatewayUrl.trim().length === 0) {
      return {
        rawText: '',
        structuredData: {},
        provider: this.name,
        success: false,
        errorMessage: 'Custom Gateway URL is not configured in Settings.',
        durationMs: Date.now() - startTime,
      };
    }

    const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
    const timeoutMs = options?.timeoutMs || 25000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          image: cleanBase64,
          languageHints: options?.languageHints || ['bn', 'en'],
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        return {
          rawText: '',
          structuredData: {},
          provider: this.name,
          success: false,
          errorMessage: `Gateway returned HTTP ${response.status}`,
          durationMs: Date.now() - startTime,
        };
      }

      const json = await response.json();
      const rawText = json.rawText || json.text || '';
      const structuredData = json.structuredData || extractStructuredDataFromText(rawText);

      return {
        rawText,
        structuredData,
        provider: this.name,
        success: true,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      clearTimeout(timer);
      return {
        rawText: '',
        structuredData: {},
        provider: this.name,
        success: false,
        errorMessage: err?.message || 'Failed to connect to OCR gateway.',
        durationMs: Date.now() - startTime,
      };
    }
  }
}

