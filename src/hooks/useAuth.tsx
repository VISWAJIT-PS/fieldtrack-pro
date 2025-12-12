import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Employee } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  employee: Employee | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  employeeLogin: (employeeId: string, dob: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchEmployeeData(session.user.id);
            checkAdminRole(session.user.id);
          }, 0);
        } else {
          setEmployee(null);
          setIsAdmin(false);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchEmployeeData(session.user.id);
        checkAdminRole(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchEmployeeData = async (userId: string) => {
    const { data, error } = await supabase
      .from('employees')
      .select('*, work_stations(*)')
      .eq('user_id', userId)
      .maybeSingle();

    if (data && !error) {
      setEmployee(data as unknown as Employee);
    }
    setIsLoading(false);
  };

  const checkAdminRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (data && !error) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setEmployee(null);
    setIsAdmin(false);
  };

  const employeeLogin = async (employeeId: string, dob: string) => {
    // First, find the employee by employee_id and dob
    const { data: emp, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('dob', dob)
      .maybeSingle();

    if (empError || !emp) {
      return { error: new Error('Invalid employee ID or date of birth') };
    }

    // If employee has a user_id, sign them in with their email
    if (emp.user_id) {
      // For demo purposes, we'll use a generated email based on employee_id
      const email = `${employeeId.toLowerCase()}@attendance.local`;
      const password = dob.replace(/-/g, '');
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { error: new Error('Login failed. Please contact admin.') };
      }
    } else {
      // Create a new auth user for this employee
      const email = `${employeeId.toLowerCase()}@attendance.local`;
      const password = dob.replace(/-/g, '');

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) {
        // If user already exists, try to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) {
          return { error: new Error('Login failed. Please contact admin.') };
        }
      } else if (authData.user) {
        // Update the employee with the new user_id
        await supabase
          .from('employees')
          .update({ user_id: authData.user.id })
          .eq('id', emp.id);

        // Add employee role
        await supabase
          .from('user_roles')
          .insert({ user_id: authData.user.id, role: 'employee' });
      }
    }

    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        employee,
        isAdmin,
        isLoading,
        signIn,
        signUp,
        signOut,
        employeeLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
