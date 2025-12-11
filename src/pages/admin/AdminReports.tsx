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
import { Clock, CalendarIcon, Download, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

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
      setEmployees(data as Employee[]);
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

  const exportToCSV = () => {
    if (attendance.length === 0) {
      toast({
        title: 'No Data',
        description: 'No records to export',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Employee Name', 'Employee ID', 'Date', 'Check In', 'Check Out', 'Total Hours', 'Overtime'];
    
    const rows = attendance.map((record) => [
      record.employees?.name || 'Unknown',
      record.employees?.employee_id || 'Unknown',
      format(new Date(record.created_at), 'yyyy-MM-dd'),
      record.check_in_time ? format(new Date(record.check_in_time), 'HH:mm') : '-',
      record.check_out_time ? format(new Date(record.check_out_time), 'HH:mm') : '-',
      record.total_hours?.toFixed(2) || '0',
      record.overtime_hours?.toFixed(2) || '0',
    ]);

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
      <div className="grid gap-4 sm:grid-cols-3 animate-slide-up">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Total Records</p>
            <p className="text-3xl font-bold text-primary">{attendance.length}</p>
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
                    <TableHead>Overtime</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((record) => (
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
                        {record.check_in_time
                          ? format(new Date(record.check_in_time), 'hh:mm a')
                          : '--:--'}
                      </TableCell>
                      <TableCell>
                        {record.check_out_time
                          ? format(new Date(record.check_out_time), 'hh:mm a')
                          : '--:--'}
                      </TableCell>
                      <TableCell>{record.total_hours?.toFixed(1) || '0'}h</TableCell>
                      <TableCell>
                        {record.overtime_hours && record.overtime_hours > 0 ? (
                          <OvertimeBadge hours={record.overtime_hours} />
                        ) : (
                          '-'
                        )}
                      </TableCell>
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
