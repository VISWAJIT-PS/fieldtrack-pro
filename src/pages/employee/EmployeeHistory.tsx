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
import { History, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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

  const totalHoursThisMonth = attendance.reduce(
    (sum, a) => sum + (a.total_hours || 0),
    0
  );

  const totalOvertimeThisMonth = attendance.reduce(
    (sum, a) => sum + (a.overtime_hours || 0),
    0
  );

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
      <div className="grid grid-cols-2 gap-4 animate-slide-up">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Hours</p>
            <p className="text-2xl font-bold text-primary">
              {totalHoursThisMonth.toFixed(1)}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Overtime</p>
            <p className="text-2xl font-bold text-warning">
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
              {attendance.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {format(new Date(record.created_at), 'EEE, MMM d')}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
