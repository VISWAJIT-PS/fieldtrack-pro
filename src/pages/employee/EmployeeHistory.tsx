import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Attendance } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OvertimeBadge } from '@/components/OvertimeBadge';
import { Badge } from '@/components/ui/badge';
import { History, Clock, MapPin, Image } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, getGoogleMapsLink, isWithinWorkLocation } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function EmployeeHistory() {
  const { employee } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [attendanceDates, setAttendanceDates] = useState<Date[]>([]);

  useEffect(() => {
    if (employee?.id) {
      fetchMonthAttendance();
    }
  }, [employee?.id, selectedDate]);

  const fetchMonthAttendance = async () => {
    if (!employee?.id) return;

    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employee.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAttendance(data as unknown as Attendance[]);
      setAttendanceDates(
        data
          .filter((a) => a.check_in_time)
          .map((a) => new Date(a.check_in_time!))
      );
    }
    setIsLoading(false);
  };

  const getAttendanceStatus = (record: Attendance) => {
    const checkInPresent = isWithinWorkLocation(record.check_in_location, employee?.work_location || null);
    const checkOutPresent = isWithinWorkLocation(record.check_out_location, employee?.work_location || null);
    
    if (checkInPresent && checkOutPresent) {
      return { status: 'Present', variant: 'success' };
    }
    return { status: 'Away', variant: 'orange' };
  };

  const totalHoursThisMonth = attendance.reduce(
    (sum, a) => sum + (a.total_hours || 0),
    0
  );

  const totalOvertimeThisMonth = attendance.reduce(
    (sum, a) => sum + (a.overtime_hours || 0),
    0
  );

  const presentDays = attendance.filter(a => {
    const status = getAttendanceStatus(a);
    return status.status === 'Present';
  }).length;

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 pb-24">
      <div className="animate-fade-in">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <History className="h-6 w-6 text-primary" />
          Attendance History
        </h1>
        <p className="text-muted-foreground">
          View your attendance records
        </p>
      </div>

      {/* Calendar */}
      <Card className="animate-slide-up">
        <CardContent className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="rounded-md pointer-events-auto"
            modifiers={{
              attended: attendanceDates,
            }}
            modifiersStyles={{
              attended: {
                backgroundColor: 'hsl(var(--success) / 0.2)',
                color: 'hsl(var(--success))',
                fontWeight: 'bold',
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      <div className="grid grid-cols-3 gap-4 animate-slide-up">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Present</p>
            <p className="text-xl font-bold text-success">
              {presentDays}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Hours</p>
            <p className="text-xl font-bold text-primary">
              {totalHoursThisMonth.toFixed(1)}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Overtime</p>
            <p className="text-xl font-bold text-warning">
              {totalOvertimeThisMonth.toFixed(1)}h
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance List */}
      <Card className="animate-slide-up">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            {format(selectedDate, 'MMMM yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No attendance records for this month
            </p>
          ) : (
            <div className="space-y-3">
              {attendance.map((record) => {
                const status = getAttendanceStatus(record);
                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {format(new Date(record.created_at), 'EEE, MMM d')}
                        </p>
                        <Badge 
                          variant="secondary"
                          className={
                            status.variant === 'success' ? 'bg-success/10 text-success text-xs' :
                            'bg-orange-500/10 text-orange-500 text-xs'
                          }
                        >
                          {status.status}
                        </Badge>
                      </div>
                      <div className="mt-1 space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>
                            {record.check_in_time
                              ? format(new Date(record.check_in_time), 'hh:mm a')
                              : '--:--'}
                          </span>
                          <span>→</span>
                          <span>
                            {record.check_out_time
                              ? format(new Date(record.check_out_time), 'hh:mm a')
                              : '--:--'}
                          </span>
                        </div>
                        <div className="flex gap-3 text-xs flex-wrap">
                          {record.check_in_location && (
                            <a
                              href={getGoogleMapsLink(record.check_in_location) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline"
                              title="View Check-in Location"
                            >
                              <MapPin className="h-3 w-3" /> In
                            </a>
                          )}
                          {record.check_out_location && (
                            <a
                              href={getGoogleMapsLink(record.check_out_location) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline"
                              title="View Check-out Location"
                            >
                              <MapPin className="h-3 w-3" /> Out
                            </a>
                          )}
                          {record.check_in_selfie_url && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-5 px-1 text-xs">
                                  <Image className="h-3 w-3 mr-1" /> In Photo
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Check-in Selfie</DialogTitle>
                                </DialogHeader>
                                <img 
                                  src={record.check_in_selfie_url} 
                                  alt="Check-in selfie" 
                                  className="w-full rounded-lg"
                                />
                              </DialogContent>
                            </Dialog>
                          )}
                          {record.check_out_selfie_url && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-5 px-1 text-xs">
                                  <Image className="h-3 w-3 mr-1" /> Out Photo
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Check-out Selfie</DialogTitle>
                                </DialogHeader>
                                <img 
                                  src={record.check_out_selfie_url} 
                                  alt="Check-out selfie" 
                                  className="w-full rounded-lg"
                                />
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {record.total_hours?.toFixed(1) || '0'}h
                      </p>
                      {record.overtime_hours && record.overtime_hours > 0 && (
                        <OvertimeBadge hours={record.overtime_hours} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}