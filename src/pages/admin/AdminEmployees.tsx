import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase, supabaseAdmin } from '@/integrations/supabase/client';
import { Employee, GPSLocation } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Users, Plus, Search, Pencil, Trash2, Loader2, Mail, Lock, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getGoogleMapsLink } from '@/lib/utils';

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<(Employee & { email?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    dob: '',
    phone: '',
    email: '',
    password: '',
    work_lat: '',
    work_lng: '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('role', 'employee')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const employeesData = data as unknown as Employee[];

      try {
        const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

        if (!usersError && usersData) {
          const usersArray = (usersData as any).users ?? usersData;
          const emailMap = new Map<string, string>();
          (usersArray as any[]).forEach((u) => {
            if (u?.id && u?.email) emailMap.set(u.id, u.email);
          });

          const employeesWithEmail = employeesData.map((e) => ({
            ...e,
            email: e.user_id ? emailMap.get(e.user_id) ?? '' : '',
          }));

          setEmployees(employeesWithEmail);
        } else {
          setEmployees(employeesData as any);
        }
      } catch (err) {
        setEmployees(employeesData as any);
      }
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const workLocation: GPSLocation | null = formData.work_lat && formData.work_lng
        ? { latitude: parseFloat(formData.work_lat), longitude: parseFloat(formData.work_lng) }
        : null;

      if (editingEmployee) {
        const { error } = await supabase
          .from('employees')
          .update({
            employee_id: formData.employee_id,
            name: formData.name,
            dob: formData.dob,
            phone: formData.phone,
            work_location: workLocation as any,
          })
          .eq('id', editingEmployee.id);

        if (error) throw error;

        toast({
          title: 'Employee Updated',
          description: 'Employee information has been updated.',
        });
      } else {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: formData.email,
          password: formData.password,
          email_confirm: true,
        });

        if (authError) throw authError;

        if (!authData.user) {
          throw new Error('Failed to create user account');
        }

        const userId = authData.user.id;

        const { error: roleError } = await supabase.from('user_roles').insert({
          user_id: userId,
          role: 'employee',
        });

        if (roleError) throw roleError;

        const { error: employeeError } = await supabase.from('employees').insert({
          employee_id: formData.employee_id,
          name: formData.name,
          dob: formData.dob,
          phone: formData.phone,
          role: 'employee',
          user_id: userId,
          work_location: workLocation as any,
        });

        if (employeeError) throw employeeError;

        toast({
          title: 'Employee Added',
          description: 'New employee has been added successfully with login credentials.',
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchEmployees();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    }

    setIsSubmitting(false);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      employee_id: employee.employee_id,
      name: employee.name,
      dob: employee.dob,
      phone: employee.phone || '',
      email: '',
      password: '',
      work_lat: employee.work_location?.latitude?.toString() || '',
      work_lng: employee.work_location?.longitude?.toString() || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('employees').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Employee Deleted',
        description: 'Employee has been removed.',
      });

      fetchEmployees();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete employee',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setFormData({
      employee_id: '',
      name: '',
      dob: '',
      phone: '',
      email: '',
      password: '',
      work_lat: '',
      work_lng: '',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <Users className="h-6 w-6 text-primary lg:h-7 lg:w-7" />
            Employees
          </h1>
          <p className="text-muted-foreground">
            Manage your team members
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employee_id">Employee ID</Label>
                <Input
                  id="employee_id"
                  placeholder="EMP001"
                  value={formData.employee_id}
                  onChange={(e) =>
                    setFormData({ ...formData, employee_id: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob}
                  onChange={(e) =>
                    setFormData({ ...formData, dob: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>

              {/* Work Location */}
              <div className="space-y-2 border-t pt-4">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Work Location (GPS Coordinates)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="work_lat" className="text-xs text-muted-foreground">Latitude</Label>
                    <Input
                      id="work_lat"
                      type="number"
                      step="any"
                      placeholder="e.g. 28.6139"
                      value={formData.work_lat}
                      onChange={(e) =>
                        setFormData({ ...formData, work_lat: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="work_lng" className="text-xs text-muted-foreground">Longitude</Label>
                    <Input
                      id="work_lng"
                      type="number"
                      step="any"
                      placeholder="e.g. 77.2090"
                      value={formData.work_lng}
                      onChange={(e) =>
                        setFormData({ ...formData, work_lng: e.target.value })
                      }
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Employee check-in within 1km of this location will be marked as present
                </p>
              </div>

              {/* Email and Password - Only for new employees */}
              {!editingEmployee && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Login)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="employee@example.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Minimum 6 characters"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className="pl-10"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {editingEmployee ? 'Update' : 'Add'} Employee
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm animate-fade-in">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Employees Table */}
      <Card className="animate-slide-up">
        <CardContent className="p-0">
          {filteredEmployees.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {searchQuery ? 'No employees found' : 'No employees added yet'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="hidden sm:table-cell">ID</TableHead>
                    <TableHead className="hidden md:table-cell">DOB</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Work Location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-accent text-accent-foreground text-sm">
                              {getInitials(employee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-sm text-muted-foreground sm:hidden">
                              {employee.employee_id}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary">{employee.employee_id}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {format(new Date(employee.dob), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {employee.email || '-'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {employee.work_location ? (
                          <a
                            href={getGoogleMapsLink(employee.work_location) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <MapPin className="h-3 w-3" />
                            View
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(employee)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete {employee.name} and all their attendance records. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDelete(employee.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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