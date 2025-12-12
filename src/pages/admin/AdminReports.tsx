import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { AttendanceWithEmployee, Employee } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OvertimeBadge } from '@/components/OvertimeBadge';
import { Badge } from '@/components/ui/badge';
import { Clock, CalendarIcon, Download, FileText, MapPin, Image } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getGoogleMapsLink, isWithinWorkLocation } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function AdminReports() {
  const [attendance, setAttendance] = useState<AttendanceWithEmployee[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [selectedDate, selectedEmployee, reportType]);

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

  const fetchReportData = async () => {
    setIsLoading(true);

    let startDate: Date;
    let endDate: Date;

    if (reportType === 'daily') {
      startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = startOfMonth(selectedDate);
      endDate = endOfMonth(selectedDate);
    }

    let query = supabase
      .from('attendance')
      .select('*, employees(*)')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
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

  const getStatusBadge = (record: AttendanceWithEmployee) => {
    const emp = employees.find(e => e.id === record.employee_id);
    const checkInPresent = isWithinWorkLocation(record.check_in_location, emp?.work_location || null);
    
    if (!record.check_in_time) {
      return { status: 'Absent', variant: 'secondary' };
    }
    if (!record.check_out_time) {
      return { status: 'Working', variant: 'warning' };
    }
    
    const checkOutPresent = isWithinWorkLocation(record.check_out_location, emp?.work_location || null);
    if (checkInPresent && checkOutPresent) {
      return { status: 'Present', variant: 'success' };
    }
    return { status: 'Away', variant: 'orange' };
  };

  const exportToCSV = () => {
    if (attendance.length === 0) {
      toast({
        title: 'No Data',
        description: 'No records to export',
        variant: 'destructive',
      });
      return;
    }

    const headers = [
      'Employee Name', 
      'Employee ID', 
      'Date', 
      'Check In', 
      'Check Out', 
      'Total Hours', 
      'Overtime', 
      'Status',
      'Check In Location', 
      'Check Out Location',
      'Check In Selfie URL',
      'Check Out Selfie URL'
    ];

    const rows = attendance.map((record) => {
      const status = getStatusBadge(record);
      return [
        record.employees?.name || 'Unknown',
        record.employees?.employee_id || 'Unknown',
        format(new Date(record.created_at), 'yyyy-MM-dd'),
        record.check_in_time ? format(new Date(record.check_in_time), 'HH:mm') : '-',
        record.check_out_time ? format(new Date(record.check_out_time), 'HH:mm') : '-',
        record.total_hours?.toFixed(2) || '0',
        record.overtime_hours?.toFixed(2) || '0',
        status.status,
        record.check_in_location ? `${(record.check_in_location as any).latitude},${(record.check_in_location as any).longitude}` : '-',
        record.check_out_location ? `${(record.check_out_location as any).latitude},${(record.check_out_location as any).longitude}` : '-',
        record.check_in_selfie_url || '-',
        record.check_out_selfie_url || '-',
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-report-${format(selectedDate, 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'CSV file has been downloaded',
    });
  };

  // Calculate summary stats
  const totalHours = attendance.reduce((sum, a) => sum + (a.total_hours || 0), 0);
  const totalOvertime = attendance.reduce((sum, a) => sum + (a.overtime_hours || 0), 0);
  const uniqueEmployees = new Set(attendance.map((a) => a.employee_id)).size;
  const presentCount = attendance.filter(a => {
    const status = getStatusBadge(a);
    return status.status === 'Present';
  }).length;

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-fade-in">
          <h1 className="flex items-center gap-2 text-2xl font-bold lg:text-3xl">
            <FileText className="h-6 w-6 text-primary lg:h-7 lg:w-7" />
            Reports
          </h1>
          <p className="text-muted-foreground">
            Generate and export attendance reports
          </p>
        </div>

        <Button onClick={exportToCSV} className="gradient-primary">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Report Type Tabs */}
      <Tabs
        value={reportType}
        onValueChange={(v) => setReportType(v as 'daily' | 'monthly')}
        className="animate-fade-in"
      >
        <TabsList>
          <TabsTrigger value="daily">Daily Report</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card className="animate-fade-in">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {reportType === 'daily'
                    ? format(selectedDate, 'PPP')
                    : format(selectedDate, 'MMMM yyyy')}
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

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4 animate-slide-up">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Total Records</p>
            <p className="text-3xl font-bold text-primary">{attendance.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Present</p>
            <p className="text-3xl font-bold text-success">{presentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Total Hours</p>
            <p className="text-3xl font-bold text-foreground">{totalHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Overtime</p>
            <p className="text-3xl font-bold text-warning">{totalOvertime.toFixed(1)}h</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      <Card className="animate-slide-up">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            {reportType === 'daily' ? 'Daily' : 'Monthly'} Report -{' '}
            {reportType === 'daily'
              ? format(selectedDate, 'MMMM d, yyyy')
              : format(selectedDate, 'MMMM yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {attendance.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No records found for this period
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((record) => {
                    const status = getStatusBadge(record);
                    return (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {record.employees?.name || 'Unknown'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {record.employees?.employee_id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(record.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span>
                              {record.check_in_time
                                ? format(new Date(record.check_in_time), 'hh:mm a')
                                : '--:--'}
                            </span>
                            <div className="flex items-center gap-2">
                              {record.check_in_location && (
                                <a
                                  href={getGoogleMapsLink(record.check_in_location) || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <MapPin className="h-3 w-3" /> Loc
                                </a>
                              )}
                              {record.check_in_selfie_url && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-5 px-1 text-xs">
                                      <Image className="h-3 w-3 mr-1" /> Photo
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Check-in Selfie - {record.employees?.name}</DialogTitle>
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
                          <div className="flex flex-col gap-1">
                            <span>
                              {record.check_out_time
                                ? format(new Date(record.check_out_time), 'hh:mm a')
                                : '--:--'}
                            </span>
                            <div className="flex items-center gap-2">
                              {record.check_out_location && (
                                <a
                                  href={getGoogleMapsLink(record.check_out_location) || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <MapPin className="h-3 w-3" /> Loc
                                </a>
                              )}
                              {record.check_out_selfie_url && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-5 px-1 text-xs">
                                      <Image className="h-3 w-3 mr-1" /> Photo
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Check-out Selfie - {record.employees?.name}</DialogTitle>
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
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{record.total_hours?.toFixed(1) || '0'}h</span>
                            {record.overtime_hours && record.overtime_hours > 0 && (
                              <OvertimeBadge hours={record.overtime_hours} />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={status.variant === 'secondary' ? 'secondary' : 'default'}
                            className={
                              status.variant === 'success' ? 'bg-success/10 text-success' :
                              status.variant === 'warning' ? 'bg-warning/10 text-warning' :
                              status.variant === 'orange' ? 'bg-orange-500/10 text-orange-500' : ''
                            }
                          >
                            {status.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}