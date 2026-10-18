import { useState } from 'react';
import { locationService, LocationCaptureResult } from '../services/location/locationService';

export function useLocationCapture() {
  const [location, setLocation] = useState<LocationCaptureResult | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureLocation = async (): Promise<LocationCaptureResult | null> => {
    try {
      setIsCapturing(true);
      setError(null);
      const res = await locationService.getCurrentLocation();
      setLocation(res);
      return res;
    } catch (err: any) {
      setError(err?.message || 'Failed to capture GPS location.');
      return null;
    } finally {
      setIsCapturing(false);
    }
  };

  const clearLocation = () => {
    setLocation(null);
    setError(null);
  };

  return {
    location,
    setLocation,
    isCapturing,
    error,
    captureLocation,
    clearLocation,
  };
}

