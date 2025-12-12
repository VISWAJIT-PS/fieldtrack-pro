import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { AttendanceWithEmployee, Employee } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { OvertimeBadge } from '@/components/OvertimeBadge';
import { ClipboardList, CalendarIcon, Filter, MapPin, Image } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, getGoogleMapsLink, isWithinWorkLocation } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function AdminAttendance() {
  const [attendance, setAttendance] = useState<AttendanceWithEmployee[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, selectedEmployee]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('role', 'employee')
      .order('name');

    if (data) {
      setEmployees(data as unknown as Employee[]);
    }
  };

  const fetchAttendance = async () => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    let query = supabase
      .from('attendance')
      .select('*, employees(*)')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false });

    if (selectedEmployee !== 'all') {
      query = query.eq('employee_id', selectedEmployee);
    }

    const { data, error } = await query;

    if (!error && data) {
      setAttendance(data as unknown as AttendanceWithEmployee[]);
    }
    setIsLoading(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = (record: AttendanceWithEmployee) => {
    const emp = employees.find(e => e.id === record.employee_id);
    const checkInPresent = isWithinWorkLocation(record.check_in_location, emp?.work_location || null);
    
    if (!record.check_in_time) {
      return <Badge variant="secondary">Absent</Badge>;
    }
    if (!record.check_out_time) {
      return <Badge className="bg-warning/10 text-warning">Working</Badge>;
    }
    
    const checkOutPresent = isWithinWorkLocation(record.check_out_location, emp?.work_location || null);
    if (checkInPresent && checkOutPresent) {
      return <Badge className="bg-success/10 text-success">Present</Badge>;
    }
    return <Badge className="bg-orange-500/10 text-orange-500">Away</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 lg:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="animate-fade-in">
        <h1 className="flex items-center gap-2 text-2xl font-bold lg:text-3xl">
          <ClipboardList className="h-6 w-6 text-primary lg:h-7 lg:w-7" />
          Attendance Records
        </h1>
        <p className="text-muted-foreground">
          View daily attendance records with selfies
        </p>
      </div>

      {/* Filters */}
      <Card className="animate-fade-in">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-primary" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Select
              value={selectedEmployee}
              onValueChange={setSelectedEmployee}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card className="animate-slide-up">
        <CardContent className="p-0">
          {attendance.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No attendance records for this date
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead className="hidden sm:table-cell">Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-accent text-accent-foreground text-sm">
                              {record.employees?.name
                                ? getInitials(record.employees.name)
                                : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {record.employees?.name || 'Unknown'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {record.employees?.employee_id}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p>
                            {record.check_in_time
                              ? format(new Date(record.check_in_time), 'hh:mm a')
                              : '--:--'}
                          </p>
                          <div className="flex items-center gap-2">
                            {record.check_in_location && (
                              <a
                                href={getGoogleMapsLink(record.check_in_location) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                <MapPin className="h-3 w-3 inline" /> Loc
                              </a>
                            )}
                            {record.check_in_selfie_url && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 px-2">
                                    <Image className="h-3 w-3 mr-1" /> Photo
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
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p>
                            {record.check_out_time
                              ? format(new Date(record.check_out_time), 'hh:mm a')
                              : '--:--'}
                          </p>
                          <div className="flex items-center gap-2">
                            {record.check_out_location && (
                              <a
                                href={getGoogleMapsLink(record.check_out_location) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                <MapPin className="h-3 w-3 inline" /> Loc
                              </a>
                            )}
                            {record.check_out_selfie_url && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 px-2">
                                    <Image className="h-3 w-3 mr-1" /> Photo
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
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <span>{record.total_hours?.toFixed(1) || '0'}h</span>
                          {record.overtime_hours && record.overtime_hours > 0 && (
                            <OvertimeBadge hours={record.overtime_hours} />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(record)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}