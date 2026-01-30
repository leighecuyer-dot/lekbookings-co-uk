-- Create waitlist table for customers who want to be notified when a slot opens
CREATE TABLE public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  desired_date DATE NOT NULL,
  desired_start_time TIME NOT NULL,
  desired_end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, notified, booked, expired
  notified_at TIMESTAMP WITH TIME ZONE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL, -- if converted to booking
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can join waitlist via public page
CREATE POLICY "Anyone can join waitlist via public page"
ON public.waitlist
FOR INSERT
WITH CHECK (
  status = 'waiting' 
  AND EXISTS (SELECT 1 FROM businesses b WHERE b.id = waitlist.business_id)
);

-- Staff and above can view waitlist
CREATE POLICY "Users can view waitlist"
ON public.waitlist
FOR SELECT
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

-- Staff and above can manage waitlist
CREATE POLICY "Staff and above can manage waitlist"
ON public.waitlist
FOR ALL
USING (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role]))
WITH CHECK (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role]));

-- Create function to auto-fill from waitlist when booking is cancelled
CREATE OR REPLACE FUNCTION public.process_waitlist_on_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  waitlist_entry RECORD;
  new_booking_id UUID;
  booking_date DATE;
  booking_start TIME;
  booking_end TIME;
BEGIN
  -- Only process if status changed to cancelled
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Extract date and time from the cancelled booking
    booking_date := DATE(OLD.start_time);
    booking_start := OLD.start_time::TIME;
    booking_end := OLD.end_time::TIME;
    
    -- Find the first waiting entry that matches this slot
    SELECT * INTO waitlist_entry
    FROM public.waitlist
    WHERE business_id = OLD.business_id
      AND status = 'waiting'
      AND desired_date = booking_date
      AND desired_start_time = booking_start
      AND (service_id IS NULL OR service_id = OLD.service_id)
      AND (staff_id IS NULL OR staff_id = OLD.staff_id)
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- If we found a waitlist entry, create a new booking
    IF waitlist_entry IS NOT NULL THEN
      -- Create the new booking
      INSERT INTO public.bookings (
        business_id,
        service_id,
        staff_id,
        customer_name,
        customer_email,
        customer_phone,
        start_time,
        end_time,
        status,
        notes
      ) VALUES (
        OLD.business_id,
        COALESCE(waitlist_entry.service_id, OLD.service_id),
        COALESCE(waitlist_entry.staff_id, OLD.staff_id),
        waitlist_entry.customer_name,
        waitlist_entry.customer_email,
        waitlist_entry.customer_phone,
        OLD.start_time,
        OLD.end_time,
        'pending',
        'Auto-booked from waitlist. Original notes: ' || COALESCE(waitlist_entry.notes, '')
      )
      RETURNING id INTO new_booking_id;
      
      -- Update the waitlist entry
      UPDATE public.waitlist
      SET status = 'booked',
          booking_id = new_booking_id,
          updated_at = now()
      WHERE id = waitlist_entry.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-fill
CREATE TRIGGER trigger_process_waitlist_on_cancellation
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.process_waitlist_on_cancellation();

-- Create updated_at trigger for waitlist
CREATE TRIGGER update_waitlist_updated_at
BEFORE UPDATE ON public.waitlist
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for efficient waitlist queries
CREATE INDEX idx_waitlist_slot_lookup ON public.waitlist (business_id, desired_date, desired_start_time, status);
CREATE INDEX idx_waitlist_business_status ON public.waitlist (business_id, status);