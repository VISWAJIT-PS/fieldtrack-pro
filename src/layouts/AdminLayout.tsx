import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminMobileNav } from '@/components/layout/AdminMobileNav';
import { Loader2 } from 'lucide-react';

export default function AdminLayout() {
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

  if (!isAdmin) {
    return <Navigate to="/employee" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar className="hidden lg:flex" />
      <div className="flex flex-1 flex-col">
        <AdminMobileNav />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
