import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Attendance, STANDARD_WORKING_HOURS } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CameraCapture } from '@/components/CameraCapture';
import { useGPS, checkLocationMatch } from '@/hooks/useGPS';
import { toast } from '@/hooks/use-toast';
import { LogIn, LogOut, MapPin, Camera, Clock, CheckCircle, Loader2, Timer } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { OvertimeBadge } from '@/components/OvertimeBadge';
import { getGoogleMapsLink } from '@/lib/utils';

export default function EmployeeAttendance() {
  const { employee } = useAuth();
  const { getLocation, isLoading: gpsLoading } = useGPS();
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [actionType, setActionType] = useState<'check-in' | 'check-out'>('check-in');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workingDuration, setWorkingDuration] = useState('00:00:00');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update working duration
  useEffect(() => {
    const updateDuration = async () => {
      if (todayAttendance?.check_in_time && !todayAttendance.check_out_time) {
        const start = new Date(todayAttendance.check_in_time).getTime();
        const now = new Date().getTime();
        const diff = now - start;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setWorkingDuration(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );

        // Auto Checkout Logic (if greater than 9 hours)
        if (diff > 9 * 60 * 60 * 1000) {
          try {
            // We need to fetch location here again seamlessly or use last known
            // ideally we trigger the checkout flow differently, but for now we try to get location if possible or just checkout
            const location = await getLocation();

            const checkInTime = new Date(todayAttendance.check_in_time!);
            const checkOutTime = new Date();
            const hoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

            // Check location match for overtime calculation
            const locationMatch = checkLocationMatch(
              todayAttendance.check_in_location as any,
              location
            );

            // If location matches check-in, use check-in location, else use current (or null if failed)
            const checkoutLocation = location || todayAttendance.check_in_location;


            const overtime = hoursWorked > STANDARD_WORKING_HOURS
              ? hoursWorked - STANDARD_WORKING_HOURS
              : 0;

            const { error } = await supabase
              .from('attendance')
              .update({
                check_out_time: checkOutTime.toISOString(),
                check_out_location: checkoutLocation as unknown as Record<string, unknown>,
                total_hours: hoursWorked,
                overtime_hours: overtime,
              } as any)
              .eq('id', todayAttendance.id);

            if (!error) {
              toast({
                title: 'Auto Checked Out',
                description: 'Maximum working hours exceeded.',
              });
              fetchTodayAttendance();
            }

          } catch (e) {
            console.error("Auto checkout failed", e);
          }
        }

      } else if (todayAttendance?.check_in_time && todayAttendance.check_out_time) {
        // Show final duration if checked out
        const start = new Date(todayAttendance.check_in_time).getTime();
        const end = new Date(todayAttendance.check_out_time).getTime();
        const diff = end - start;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setWorkingDuration(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      } else {
        setWorkingDuration('00:00:00');
      }
    };

    updateDuration();
    const timer = setInterval(updateDuration, 1000);
    return () => clearInterval(timer);
  }, [todayAttendance]);

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

  const handleAction = (type: 'check-in' | 'check-out') => {
    setActionType(type);
    setCameraOpen(true);
  };

  const handleCapture = async (blob: Blob) => {
    if (!employee?.id) return;
    setIsSubmitting(true);

    try {
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

      const fileName = `${employee.id}/${actionType}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
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
          title: 'Checked In Successfully!',
          description: `Time: ${format(new Date(), 'hh:mm:ss a')}`,
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
          title: 'Checked Out Successfully!',
          description: `Total: ${hoursWorked.toFixed(1)}h${overtime > 0 ? ` | OT: ${overtime.toFixed(1)}h` : ''}`,
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
        <Skeleton className="h-64" />
      </div>
    );
  }

  const calculateOvertime = (attendance: Attendance | null) => {
    if (!attendance || !attendance.check_in_time) return 0;
    const start = new Date(attendance.check_in_time).getTime();
    const now = attendance.check_out_time ? new Date(attendance.check_out_time).getTime() : new Date().getTime();
    const diff = now - start;
    const hoursWorked = diff / (1000 * 60 * 60);
    return hoursWorked > STANDARD_WORKING_HOURS ? hoursWorked - STANDARD_WORKING_HOURS : 0;
  };

  return (
    <div className="space-y-6 p-4 pb-24">
      <div className="animate-fade-in">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Clock className="h-6 w-6 text-primary" />
          Mark Attendance
        </h1>
        <p className="text-muted-foreground font-medium text-lg">
          {workingDuration}
        </p>
      </div>

      {/* Live Clock / StopWatch */}
      <Card className="animate-slide-up overflow-hidden">
        <CardContent className="p-8 text-center gradient-primary text-primary-foreground">
          <p className="text-5xl font-bold tracking-wider">
            {workingDuration}
          </p>
          <p className="mt-2 text-primary-foreground/80">
            {hasCheckedOut ? 'Total Working Time' : hasCheckedIn ? 'Working Duration' : 'Not Started'}
          </p>
        </CardContent>
      </Card>

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-4 animate-slide-up">
        <Card className={hasCheckedIn ? 'border-success' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {hasCheckedIn ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <LogIn className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">Check In</span>
            </div>
            <p className="mt-2 text-xl font-bold">
              {hasCheckedIn
                ? format(new Date(todayAttendance!.check_in_time!), 'hh:mm a')
                : '--:--'}
            </p>
            {hasCheckedIn && todayAttendance?.check_in_location && (
              <a
                href={getGoogleMapsLink(todayAttendance.check_in_location) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                <MapPin className="h-3 w-3" />
                View Location
              </a>
            )}
          </CardContent>
        </Card>

        <Card className={hasCheckedOut ? 'border-success' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {hasCheckedOut ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <LogOut className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">Check Out</span>
            </div>
            <p className="mt-2 text-xl font-bold">
              {hasCheckedOut
                ? format(new Date(todayAttendance!.check_out_time!), 'hh:mm a')
                : '--:--'}
            </p>
            {hasCheckedOut && todayAttendance?.check_out_location && (
              <a
                href={getGoogleMapsLink(todayAttendance.check_out_location) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                <MapPin className="h-3 w-3" />
                View Location
              </a>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hours Summary */}
      {(hasCheckedOut || (hasCheckedIn && !hasCheckedOut && calculateOvertime(todayAttendance) > 0)) && todayAttendance && (
        <Card className="animate-slide-up">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Timer className="h-5 w-5 text-primary" />
              {hasCheckedOut ? "Today's Summary" : "Overtime Alert"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {hasCheckedOut
                    ? todayAttendance.total_hours?.toFixed(1) + 'h'
                    : "Working..."
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  {hasCheckedOut ? 'Total Hours' : 'Shift in Progress'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {/* Live Overtime Counter */}
                {hasCheckedIn && !hasCheckedOut && calculateOvertime(todayAttendance) > 0 && (
                  <div className="flex items-center gap-1 text-warning font-bold animate-pulse">
                    <Clock className="h-4 w-4" />
                    <span>
                      +{calculateOvertime(todayAttendance).toFixed(2)}h OT
                    </span>
                  </div>
                )}
                {/* Static Overtime Badge (if checked out) */}
                {hasCheckedOut && todayAttendance.overtime_hours && todayAttendance.overtime_hours > 0 && (
                  <OvertimeBadge hours={todayAttendance.overtime_hours} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Card */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="text-center">
            {hasCheckedOut
              ? 'Today\'s Attendance Complete'
              : hasCheckedIn
                ? 'Ready to Check Out?'
                : 'Ready to Check In?'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasCheckedOut && (
            <>
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Camera className="h-4 w-4" />
                  <span>Selfie</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>GPS</span>
                </div>
              </div>

              {!hasCheckedIn ? (
                <Button
                  className="w-full h-14 text-lg gradient-primary"
                  onClick={() => handleAction('check-in')}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <LogIn className="mr-2 h-5 w-5" />
                  )}
                  Check In Now
                </Button>
              ) : (
                <Button
                  className="w-full h-14 text-lg"
                  variant="destructive"
                  onClick={() => handleAction('check-out')}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-5 w-5" />
                  )}
                  Check Out Now
                </Button>
              )}
            </>
          )}

          {hasCheckedOut && (
            <div className="rounded-lg bg-success/10 p-6 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-success" />
              <p className="mt-4 font-medium text-success">
                Great job! You've completed today's attendance.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Total Hours: {todayAttendance?.total_hours?.toFixed(1)}h
                {todayAttendance?.overtime_hours && todayAttendance.overtime_hours > 0 && (
                  <span className="ml-2 text-warning">
                    (OT: {todayAttendance.overtime_hours.toFixed(1)}h)
                  </span>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <CameraCapture
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={handleCapture}
        title={actionType === 'check-in' ? 'Check In Selfie' : 'Check Out Selfie'}
      />
    </div>
  );
}
