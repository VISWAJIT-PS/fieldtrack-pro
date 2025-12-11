import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { EmployeeHeader } from '@/components/layout/EmployeeHeader';
import { EmployeeBottomNav } from '@/components/layout/EmployeeBottomNav';
import { Loader2 } from 'lucide-react';

export default function EmployeeLayout() {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <EmployeeHeader />
      <main className="mx-auto max-w-md">
        <Outlet />
      </main>
      <EmployeeBottomNav />
    </div>
  );
}
