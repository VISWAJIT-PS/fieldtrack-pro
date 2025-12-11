import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { DashboardStats, AttendanceWithEmployee } from '@/types';
import { AttendanceSummaryCard } from '@/components/AttendanceSummaryCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserCheck, 
  Clock, 
  AlertTriangle,
  Activity
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    missingCheckout: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState<AttendanceWithEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch total employees
      const { count: totalEmployees } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'employee');

      // Fetch today's attendance
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const { data: todayAttendance } = await supabase
        .from('attendance')
        .select('*, employees(*)')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      const presentToday = todayAttendance?.filter(a => a.check_in_time).length || 0;
      const lateToday = todayAttendance?.filter(a => {
        if (!a.check_in_time) return false;
        const checkInHour = new Date(a.check_in_time).getHours();
        return checkInHour >= 9; // Late if after 9 AM
      }).length || 0;
      const missingCheckout = todayAttendance?.filter(
        a => a.check_in_time && !a.check_out_time
      ).length || 0;

      setStats({
        totalEmployees: totalEmployees || 0,
        presentToday,
        lateToday,
        missingCheckout,
      });

      // Fetch recent attendance with employee details
      const { data: recent } = await supabase
        .from('attendance')
        .select('*, employees(*)')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentAttendance((recent as unknown as AttendanceWithEmployee[]) || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 lg:p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold lg:text-3xl">Dashboard</h1>
        <p className="text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AttendanceSummaryCard
          title="Total Employees"
          value={stats.totalEmployees}
          icon={Users}
          variant="primary"
        />
        <AttendanceSummaryCard
          title="Present Today"
          value={stats.presentToday}
          icon={UserCheck}
          variant="success"
        />
        <AttendanceSummaryCard
          title="Late Today"
          value={stats.lateToday}
          icon={Clock}
          variant="warning"
        />
        <AttendanceSummaryCard
          title="Missing Checkout"
          value={stats.missingCheckout}
          icon={AlertTriangle}
          variant="destructive"
        />
      </div>

      {/* Recent Activity */}
      <Card className="animate-slide-up">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAttendance.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No recent attendance records
            </p>
          ) : (
            <div className="space-y-4">
              {recentAttendance.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-accent text-accent-foreground">
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
                        {format(new Date(record.created_at), 'MMM d, hh:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.check_in_time && !record.check_out_time && (
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        Checked In
                      </Badge>
                    )}
                    {record.check_out_time && (
                      <Badge variant="secondary">
                        {record.total_hours?.toFixed(1)}h
                      </Badge>
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
