-- Create work_stations table
CREATE TABLE public.work_stations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.work_stations ENABLE ROW LEVEL SECURITY;

-- Admins can manage work stations
CREATE POLICY "Admins can view work stations"
ON public.work_stations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert work stations"
ON public.work_stations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update work stations"
ON public.work_stations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete work stations"
ON public.work_stations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Employees can view work stations (needed for display)
CREATE POLICY "Employees can view work stations"
ON public.work_stations
FOR SELECT
USING (has_role(auth.uid(), 'employee'::app_role));