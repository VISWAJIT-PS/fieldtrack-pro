-- Add work_station_id column to employees table
ALTER TABLE public.employees 
ADD COLUMN work_station_id UUID REFERENCES public.work_stations(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.employees.work_station_id IS 'Reference to the work station assigned to this employee';
