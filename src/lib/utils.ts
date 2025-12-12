import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { GPSLocation } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getGoogleMapsLink(location: any): string | null {
  if (!location || !location.latitude || !location.longitude) return null;
  return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
}

// Calculate distance between two GPS coordinates in meters using Haversine formula
export function calculateDistance(loc1: GPSLocation | null, loc2: GPSLocation | null): number | null {
  if (!loc1 || !loc2) return null;

  const R = 6371e3; // Earth's radius in meters
  const φ1 = (loc1.latitude * Math.PI) / 180;
  const φ2 = (loc2.latitude * Math.PI) / 180;
  const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Format distance in km or meters
export function formatDistance(meters: number | null): string {
  if (meters === null) return 'Unknown';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// Check if location is within threshold (default 1km)
export function isWithinWorkLocation(currentLoc: GPSLocation | null, workLoc: GPSLocation | null, thresholdMeters: number = 1000): boolean {
  const distance = calculateDistance(currentLoc, workLoc);
  if (distance === null) return false;
  return distance <= thresholdMeters;
}
