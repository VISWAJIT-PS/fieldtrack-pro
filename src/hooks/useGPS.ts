import { useState, useCallback } from 'react';
import { GPSLocation } from '@/types';

interface UseGPSReturn {
  location: GPSLocation | null;
  error: string | null;
  isLoading: boolean;
  getLocation: () => Promise<GPSLocation | null>;
}

export function useGPS(): UseGPSReturn {
  const [location, setLocation] = useState<GPSLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getLocation = useCallback(async (): Promise<GPSLocation | null> => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return null;
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: GPSLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocation(loc);
          setIsLoading(false);
          resolve(loc);
        },
        (err) => {
          let errorMessage = 'Unable to get your location';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case err.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          setError(errorMessage);
          setIsLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return { location, error, isLoading, getLocation };
}

export function checkLocationMatch(loc1: GPSLocation | null, loc2: GPSLocation | null, thresholdMeters: number = 100): boolean {
  if (!loc1 || !loc2) return false;

  // Haversine formula to calculate distance between two points
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (loc1.latitude * Math.PI) / 180;
  const φ2 = (loc2.latitude * Math.PI) / 180;
  const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return distance <= thresholdMeters;
}
