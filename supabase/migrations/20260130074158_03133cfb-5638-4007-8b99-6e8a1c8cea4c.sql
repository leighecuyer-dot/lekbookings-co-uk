-- Add revenue tracking fields to staff table
ALTER TABLE public.staff 
ADD COLUMN revenue_tracking_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN commission_percentage numeric(5,2) NOT NULL DEFAULT 100.00;

-- Add constraint to ensure commission_percentage is between 0 and 100
ALTER TABLE public.staff 
ADD CONSTRAINT staff_commission_percentage_range 
CHECK (commission_percentage >= 0 AND commission_percentage <= 100);

-- Add comment explaining the fields
COMMENT ON COLUMN public.staff.revenue_tracking_enabled IS 'Whether to include this staff member in revenue calculations. Set to false for staff paid directly by customers.';
COMMENT ON COLUMN public.staff.commission_percentage IS 'Percentage of booking revenue attributed to this staff member (0-100).';