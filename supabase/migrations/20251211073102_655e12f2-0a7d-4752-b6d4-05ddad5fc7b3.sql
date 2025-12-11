-- Create app_role enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');

-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  dob DATE NOT NULL,
  phone TEXT,
  role app_role NOT NULL DEFAULT 'employee',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_in_location JSONB,
  check_in_selfie_url TEXT,
  check_out_time TIMESTAMP WITH TIME ZONE,
  check_out_location JSONB,
  check_out_selfie_url TEXT,
  total_hours FLOAT,
  overtime_hours FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for RLS
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get employee by user_id
CREATE OR REPLACE FUNCTION public.get_employee_by_user_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.employees WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies for employees
CREATE POLICY "Admins can view all employees"
ON public.employees FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE POLICY "Admins can insert employees"
ON public.employees FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update employees"
ON public.employees FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete employees"
ON public.employees FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for attendance
CREATE POLICY "Admins can view all attendance"
ON public.attendance FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  employee_id = public.get_employee_by_user_id(auth.uid())
);

CREATE POLICY "Employees can insert their own attendance"
ON public.attendance FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  employee_id = public.get_employee_by_user_id(auth.uid())
);

CREATE POLICY "Employees can update their own attendance"
ON public.attendance FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  employee_id = public.get_employee_by_user_id(auth.uid())
);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for selfies
INSERT INTO storage.buckets (id, name, public) VALUES ('selfies', 'selfies', true);

-- Storage policies for selfies bucket
CREATE POLICY "Authenticated users can upload selfies"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'selfies');

CREATE POLICY "Anyone can view selfies"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'selfies');

CREATE POLICY "Users can update their own selfies"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'selfies');

CREATE POLICY "Users can delete their own selfies"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'selfies');