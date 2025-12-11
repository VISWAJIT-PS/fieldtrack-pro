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
import { LogIn, LogOut, MapPin, Camera, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function EmployeeAttendance() {
  const { employee } = useAuth();
  const { getLocation, isLoading: gpsLoading } = useGPS();
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [actionType, setActionType] = useState<'check-in' | 'check-out'>('check-in');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  return (
    <div className="space-y-6 p-4 pb-24">
      <div className="animate-fade-in">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Clock className="h-6 w-6 text-primary" />
          Mark Attendance
        </h1>
        <p className="text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Live Clock */}
      <Card className="animate-slide-up overflow-hidden">
        <CardContent className="p-8 text-center gradient-primary text-primary-foreground">
          <p className="text-5xl font-bold tracking-wider">
            {format(currentTime, 'HH:mm:ss')}
          </p>
          <p className="mt-2 text-primary-foreground/80">
            Current Time
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
          </CardContent>
        </Card>
      </div>

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
