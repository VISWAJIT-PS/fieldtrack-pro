-- Add work_location column to employees table
ALTER TABLE public.employees 
ADD COLUMN work_location jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.employees.work_location IS 'Work location coordinates: {latitude: number, longitude: number}';