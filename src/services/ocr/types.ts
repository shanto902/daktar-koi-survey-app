import { StructuredExtractedData } from '../../types';

export interface OCRResponse {
  rawText: string;
  structuredData: StructuredExtractedData;
  provider: string;
  success: boolean;
  errorMessage?: string;
  durationMs: number;
}

export interface OCROptions {
  languageHints?: string[];
  timeoutMs?: number;
}

export interface IOCRProvider {
  name: string;
  processImage(base64Image: string, options?: OCROptions): Promise<OCRResponse>;
}

