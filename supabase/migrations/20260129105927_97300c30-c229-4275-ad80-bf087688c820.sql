-- Create staff_leave table for tracking holidays and leave
CREATE TABLE public.staff_leave (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL DEFAULT 'holiday', -- 'holiday', 'sick', 'personal', 'other'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  approved_by UUID, -- user who approved (optional)
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure end_date is not before start_date
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Enable RLS
ALTER TABLE public.staff_leave ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view staff leave for their businesses"
  ON public.staff_leave FOR SELECT
  USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Owners and admins can manage staff leave"
  ON public.staff_leave FOR ALL
  USING (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role]))
  WITH CHECK (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role]));

CREATE POLICY "Resellers can manage staff leave for their clients"
  ON public.staff_leave FOR ALL
  USING (is_reseller_client(get_reseller_id(auth.uid()), business_id))
  WITH CHECK (is_reseller_client(get_reseller_id(auth.uid()), business_id));

-- Create indexes for performance
CREATE INDEX idx_staff_leave_staff_id ON public.staff_leave(staff_id);
CREATE INDEX idx_staff_leave_business_id ON public.staff_leave(business_id);
CREATE INDEX idx_staff_leave_dates ON public.staff_leave(start_date, end_date);

-- Add trigger for updated_at
CREATE TRIGGER update_staff_leave_updated_at
  BEFORE UPDATE ON public.staff_leave
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();