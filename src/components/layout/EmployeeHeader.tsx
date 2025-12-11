import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EmployeeHeader() {
  const { employee } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-sm safe-top">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
            <Clock className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">AttendEase</h1>
            <p className="text-xs text-muted-foreground">Field Staff</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
          </Button>
          <Avatar className="h-9 w-9 border-2 border-primary/20">
            <AvatarFallback className="bg-accent text-accent-foreground text-sm font-medium">
              {employee?.name ? getInitials(employee.name) : 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
