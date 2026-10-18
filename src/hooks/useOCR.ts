import { useState, useCallback } from 'react';
import { ocrService } from '../services/ocr/ocrService';
import { OCRResponse } from '../services/ocr/types';
import { StructuredExtractedData } from '../types';

export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<OCRResponse | null>(null);
  const [rawText, setRawText] = useState('');
  const [structuredData, setStructuredData] = useState<StructuredExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runOCR = useCallback(async (localPathOrUri: string): Promise<OCRResponse | null> => {
    try {
      setIsProcessing(true);
      setError(null);

      const res = await ocrService.processPhoto(localPathOrUri);
      setLastResponse(res);

      if (res.success) {
        setRawText(res.rawText);
        setStructuredData(res.structuredData);
        return res;
      } else {
        setError(res.errorMessage || 'OCR processing failed.');
        return res;
      }
    } catch (err: any) {
      const msg = err?.message || 'Unexpected OCR error';
      setError(msg);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const setSavedResponse = useCallback((res: OCRResponse | null) => {
    setLastResponse(res);
    if (res) {
      setRawText(res.rawText || '');
      setStructuredData(res.structuredData || null);
      setError(res.errorMessage || null);
    } else {
      setRawText('');
      setStructuredData(null);
      setError(null);
    }
  }, []);

  const clearOCR = useCallback(() => {
    setLastResponse(null);
    setRawText('');
    setStructuredData(null);
    setError(null);
  }, []);

  return {
    isProcessing,
    lastResponse,
    rawText,
    structuredData,
    error,
    runOCR,
    clearOCR,
    setSavedResponse,
    setLastResponse,
  };
}

