import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Attendance, STANDARD_WORKING_HOURS } from '@/types';
import { AttendanceSummaryCard } from '@/components/AttendanceSummaryCard';
import { OvertimeBadge } from '@/components/OvertimeBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogIn, LogOut, MapPin, Timer, CalendarDays } from 'lucide-react';
import { CameraCapture } from '@/components/CameraCapture';
import { useGPS, checkLocationMatch } from '@/hooks/useGPS';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { getGoogleMapsLink } from '@/lib/utils';

export default function EmployeeDashboard() {
  const { employee } = useAuth();
  const { getLocation } = useGPS();
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [actionType, setActionType] = useState<'check-in' | 'check-out'>('check-in');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (employee?.id) {
      fetchTodayAttendance();
    }
  }, [employee?.id]);

  const fetchTodayAttendance = async () => {
    if (!employee?.id) return;

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employee.id)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (!error && data) {
      setTodayAttendance(data as unknown as Attendance);
    }
    setIsLoading(false);
  };

  const handleCheckIn = () => {
    setActionType('check-in');
    setCameraOpen(true);
  };

  const handleCheckOut = () => {
    setActionType('check-out');
    setCameraOpen(true);
  };

  const handleCapture = async (blob: Blob) => {
    if (!employee?.id) return;
    setIsSubmitting(true);

    try {
      // Get GPS location
      const location = await getLocation();
      if (!location) {
        toast({
          title: 'Location Required',
          description: 'Please enable location access to continue.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Upload selfie
      const fileName = `${employee.id}/${actionType}-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('selfies')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('selfies')
        .getPublicUrl(fileName);

      const selfieUrl = urlData.publicUrl;
      const now = new Date().toISOString();

      if (actionType === 'check-in') {
        const { error } = await supabase.from('attendance').insert({
          employee_id: employee.id,
          check_in_time: now,
          check_in_location: location as unknown as Record<string, unknown>,
          check_in_selfie_url: selfieUrl,
        } as any);
        if (error) throw error;

        toast({
          title: 'Checked In!',
          description: `You checked in at ${format(new Date(), 'hh:mm a')}`,
        });
      } else {
        if (!todayAttendance) {
          toast({
            title: 'Error',
            description: 'No check-in found for today.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }

        const checkInTime = new Date(todayAttendance.check_in_time!);
        const checkOutTime = new Date();
        const hoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

        // Check location match for overtime calculation
        const locationMatch = checkLocationMatch(
          todayAttendance.check_in_location as any,
          location
        );

        const overtime = locationMatch && hoursWorked > STANDARD_WORKING_HOURS
          ? hoursWorked - STANDARD_WORKING_HOURS
          : 0;

        const { error } = await supabase
          .from('attendance')
          .update({
            check_out_time: now,
            check_out_location: location as unknown as Record<string, unknown>,
            check_out_selfie_url: selfieUrl,
            total_hours: hoursWorked,
            overtime_hours: overtime,
          } as any)
          .eq('id', todayAttendance.id);
        if (error) throw error;

        toast({
          title: 'Checked Out!',
          description: `Total hours: ${hoursWorked.toFixed(1)}h${overtime > 0 ? ` (OT: ${overtime.toFixed(1)}h)` : ''}`,
        });
      }

      fetchTodayAttendance();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    }

    setIsSubmitting(false);
  };

  const hasCheckedIn = !!todayAttendance?.check_in_time;
  const hasCheckedOut = !!todayAttendance?.check_out_time;

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 pb-24">
      {/* Greeting */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold">
          Hello, {employee?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>



      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <AttendanceSummaryCard
          title="Check In"
          value={
            hasCheckedIn
              ? format(new Date(todayAttendance!.check_in_time!), 'hh:mm a')
              : '--:--'
          }
          subtitle={
            hasCheckedIn && todayAttendance?.check_in_location ? (
              <a
                href={getGoogleMapsLink(todayAttendance.check_in_location) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                <MapPin className="h-3 w-3" />
                View Location
              </a>
            ) : null
          }
          icon={LogIn}
          variant={hasCheckedIn ? 'success' : 'default'}
        />
        <AttendanceSummaryCard
          title="Check Out"
          value={
            hasCheckedOut
              ? format(new Date(todayAttendance!.check_out_time!), 'hh:mm a')
              : '--:--'
          }
          subtitle={
            hasCheckedOut && todayAttendance?.check_out_location ? (
              <a
                href={getGoogleMapsLink(todayAttendance.check_out_location) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                <MapPin className="h-3 w-3" />
                View Location
              </a>
            ) : null
          }
          icon={LogOut}
          variant={hasCheckedOut ? 'success' : 'default'}
        />
      </div>

      {/* Hours Summary */}
      {hasCheckedOut && todayAttendance && (
        <Card className="animate-slide-up">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Timer className="h-5 w-5 text-primary" />
              Today's Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {todayAttendance.total_hours?.toFixed(1)}h
                </p>
                <p className="text-sm text-muted-foreground">Total Hours</p>
              </div>
              {todayAttendance.overtime_hours && todayAttendance.overtime_hours > 0 && (
                <OvertimeBadge hours={todayAttendance.overtime_hours} />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card className="animate-slide-up overflow-hidden">
        <CardContent className="p-6">
          <div className="space-y-4">
            {!hasCheckedIn ? (
              <Button
                className="w-full h-14 text-lg gradient-primary"
                onClick={handleCheckIn}
                disabled={isSubmitting}
              >
                <LogIn className="mr-2 h-5 w-5" />
                Check In
              </Button>
            ) : !hasCheckedOut ? (
              <Button
                className="w-full h-14 text-lg"
                variant="destructive"
                onClick={handleCheckOut}
                disabled={isSubmitting}
              >
                <LogOut className="mr-2 h-5 w-5" />
                Check Out
              </Button>
            ) : (
              <div className="rounded-lg bg-success/10 p-4 text-center">
                <p className="font-medium text-success">
                  ✓ You've completed today's attendance
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>GPS location will be recorded</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week Overview */}
      <Card className="animate-slide-up">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
              const isToday = i === new Date().getDay() - 1;
              const isPast = i < new Date().getDay() - 1;
              return (
                <div
                  key={day}
                  className={`flex flex-col items-center rounded-lg p-2 ${isToday ? 'bg-primary text-primary-foreground' : ''
                    }`}
                >
                  <span className="text-xs font-medium">{day}</span>
                  <div
                    className={`mt-1 h-2 w-2 rounded-full ${isToday
                      ? 'bg-primary-foreground'
                      : isPast
                        ? 'bg-success'
                        : 'bg-muted'
                      }`}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Camera Dialog */}
      <CameraCapture
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={handleCapture}
        title={actionType === 'check-in' ? 'Check In Selfie' : 'Check Out Selfie'}
      />
    </div>
  );
}
