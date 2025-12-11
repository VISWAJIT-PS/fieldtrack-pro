import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Clock, User, Shield, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, employeeLogin } = useAuth();
  
  // Employee login state
  const [employeeId, setEmployeeId] = useState('');
  const [dob, setDob] = useState('');
  const [employeeLoading, setEmployeeLoading] = useState(false);
  
  // Admin login state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !dob) {
      toast({
        title: 'Missing Information',
        description: 'Please enter your Employee ID and Date of Birth',
        variant: 'destructive',
      });
      return;
    }

    setEmployeeLoading(true);
    const { error } = await employeeLogin(employeeId, dob);
    setEmployeeLoading(false);

    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome!',
        description: 'You have successfully logged in.',
      });
      navigate('/employee');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword) {
      toast({
        title: 'Missing Information',
        description: 'Please enter your email and password',
        variant: 'destructive',
      });
      return;
    }

    setAdminLoading(true);
    const { error } = await signIn(adminEmail, adminPassword);
    setAdminLoading(false);

    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome Admin!',
        description: 'You have successfully logged in.',
      });
      navigate('/admin');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-accent/30 to-background p-4">
      <div className="mb-8 flex flex-col items-center animate-fade-in">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-soft">
          <Clock className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">AttendEase</h1>
        <p className="mt-1 text-muted-foreground">Field Staff Attendance System</p>
      </div>

      <Card className="w-full max-w-md animate-slide-up shadow-card">
        <CardHeader className="text-center">
          <CardTitle>Sign In</CardTitle>
          <CardDescription>Choose your login method below</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="employee" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="employee" className="gap-2">
                <User className="h-4 w-4" />
                Employee
              </TabsTrigger>
              <TabsTrigger value="admin" className="gap-2">
                <Shield className="h-4 w-4" />
                Admin
              </TabsTrigger>
            </TabsList>

            <TabsContent value="employee" className="mt-6">
              <form onSubmit={handleEmployeeLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input
                    id="employeeId"
                    placeholder="Enter your employee ID"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="h-11"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 gradient-primary"
                  disabled={employeeLoading}
                >
                  {employeeLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In as Employee'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin" className="mt-6">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@company.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="h-11"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 gradient-primary"
                  disabled={adminLoading}
                >
                  {adminLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In as Admin'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        © 2024 AttendEase. All rights reserved.
      </p>
    </div>
  );
}
