export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface Employee {
  id: string;
  user_id: string | null;
  employee_id: string;
  name: string;
  dob: string;
  phone: string | null;
  role: 'admin' | 'employee';
  work_location: GPSLocation | null;
  created_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  check_in_time: string | null;
  check_in_location: GPSLocation | null;
  check_in_selfie_url: string | null;
  check_out_time: string | null;
  check_out_location: GPSLocation | null;
  check_out_selfie_url: string | null;
  total_hours: number | null;
  overtime_hours: number | null;
  is_present: boolean | null;
  created_at: string;
}

export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'employee';
}

export interface AttendanceWithEmployee extends Attendance {
  employees?: Employee;
}

export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  missingCheckout: number;
}

export const STANDARD_WORKING_HOURS = 8;
