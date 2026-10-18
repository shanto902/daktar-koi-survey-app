import * as Location from 'expo-location';
import { calculateHaversineDistance } from '../../utils/geo';

export interface LocationCaptureResult {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
  isAccurate: boolean; // accuracy <= 30 meters
  address?: {
    district?: string;
    city?: string;
    subregion?: string;
    street?: string;
    postalCode?: string;
    formattedAddress?: string;
  };
}

export const locationService = {
  /**
   * Check current location permissions
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  },

  /**
   * Request foreground location permission
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  },

  /**
   * Capture current high-accuracy GPS position
   */
  async getCurrentLocation(): Promise<LocationCaptureResult> {
    const hasPermission = await this.checkPermissions();
    if (!hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) {
        throw new Error('Location permission was denied. You can still save the survey without GPS.');
      }
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const accuracy = position.coords.accuracy ?? null;
      const result: LocationCaptureResult = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy,
        timestamp: new Date(position.timestamp).toISOString(),
        isAccurate: accuracy !== null && accuracy <= 30,
      };

      // Attempt reverse geocoding if online (fail silently if offline)
      try {
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        if (geo) {
          result.address = {
            district: geo.district || geo.subregion || undefined,
            city: geo.city || undefined,
            subregion: geo.subregion || undefined,
            street: geo.street || undefined,
            postalCode: geo.postalCode || undefined,
            formattedAddress: [geo.street, geo.subregion, geo.city, geo.region]
              .filter(Boolean)
              .join(', '),
          };
        }
      } catch {
        // Reverse geocoding requires internet; ignore if offline
      }

      return result;
    } catch (err: any) {
      throw new Error(`Failed to capture GPS position: ${err?.message || 'GPS signal unavailable'}`);
    }
  },

  /**
   * Calculate Haversine distance in meters between two lat/lng pairs
   */
  calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    return calculateHaversineDistance(lat1, lon1, lat2, lon2);
  },
};
