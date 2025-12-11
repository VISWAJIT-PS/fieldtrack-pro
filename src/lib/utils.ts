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
