import { NavLink } from 'react-router-dom';
import { Home, Clock, History, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/employee', icon: Home, label: 'Home' },
  { to: '/employee/attendance', icon: Clock, label: 'Attendance' },
  { to: '/employee/history', icon: History, label: 'History' },
  { to: '/employee/profile', icon: User, label: 'Profile' },
];

export function EmployeeBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-sm safe-bottom">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/employee'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 rounded-lg px-4 py-2 transition-all',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'rounded-full p-1.5 transition-all',
                    isActive && 'bg-accent'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
