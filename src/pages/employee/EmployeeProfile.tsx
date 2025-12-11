import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Phone, 
  Calendar, 
  IdCard, 
  LogOut,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

export default function EmployeeProfile() {
  const { employee, signOut, user } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6 p-4 pb-24">
      <div className="animate-fade-in">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <User className="h-6 w-6 text-primary" />
          My Profile
        </h1>
        <p className="text-muted-foreground">
          View and manage your profile
        </p>
      </div>

      {/* Profile Card */}
      <Card className="animate-slide-up overflow-hidden">
        <div className="h-24 gradient-primary" />
        <CardContent className="-mt-12 pb-6">
          <div className="flex flex-col items-center">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarFallback className="bg-accent text-accent-foreground text-2xl font-bold">
                {employee?.name ? getInitials(employee.name) : 'U'}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-4 text-xl font-bold">{employee?.name}</h2>
            <Badge variant="secondary" className="mt-2">
              {employee?.role === 'admin' ? 'Administrator' : 'Field Staff'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <Card className="animate-slide-up">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 rounded-lg border p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
              <IdCard className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Employee ID</p>
              <p className="font-medium">{employee?.employee_id}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-lg border p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
              <Calendar className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="font-medium">
                {employee?.dob
                  ? format(new Date(employee.dob), 'MMMM d, yyyy')
                  : 'Not set'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-lg border p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
              <Phone className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{employee?.phone || 'Not set'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-lg border p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
              <Clock className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="font-medium">
                {employee?.created_at
                  ? format(new Date(employee.created_at), 'MMMM yyyy')
                  : 'Unknown'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card className="animate-slide-up">
        <CardContent className="p-4">
          <Button
            variant="destructive"
            className="w-full"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
