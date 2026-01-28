-- 1. Create reseller_audit_logs table
CREATE TABLE IF NOT EXISTS public.reseller_audit_logs (
  id bigserial PRIMARY KEY,
  reseller_user_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on reseller_audit_logs
ALTER TABLE public.reseller_audit_logs ENABLE ROW LEVEL SECURITY;

-- Resellers can only read their own audit logs
CREATE POLICY "reseller_reads_own_logs"
ON public.reseller_audit_logs
FOR SELECT
USING (reseller_user_id = auth.uid());

-- Create indexes for efficient querying
CREATE INDEX idx_reseller_audit_logs_reseller_user ON public.reseller_audit_logs(reseller_user_id);
CREATE INDEX idx_reseller_audit_logs_business ON public.reseller_audit_logs(business_id);
CREATE INDEX idx_reseller_audit_logs_created_at ON public.reseller_audit_logs(created_at DESC);

-- 2. Create helper function to check business access (user_roles OR reseller linkage)
CREATE OR REPLACE FUNCTION public.can_access_business(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND business_id = p_business_id
  )
  OR EXISTS (
    SELECT 1 FROM public.reseller_clients rc
    JOIN public.resellers r ON r.id = rc.reseller_id
    WHERE rc.business_id = p_business_id
      AND r.user_id = auth.uid()
      AND r.is_active = true
  );
$$;

-- 3. SECURITY DEFINER RPC: reseller_create_customer
CREATE OR REPLACE FUNCTION public.reseller_create_customer(
  p_business_id uuid,
  p_name text,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reseller_id uuid;
  v_customer_id uuid;
BEGIN
  -- Get reseller ID and verify linkage
  SELECT r.id INTO v_reseller_id
  FROM public.resellers r
  JOIN public.reseller_clients rc ON rc.reseller_id = r.id
  WHERE r.user_id = auth.uid()
    AND r.is_active = true
    AND rc.business_id = p_business_id;

  IF v_reseller_id IS NULL THEN
    RAISE EXCEPTION 'reseller_not_linked_to_business';
  END IF;

  -- Insert the customer
  INSERT INTO public.customers (business_id, name, phone, email, notes)
  VALUES (p_business_id, p_name, NULLIF(p_phone, ''), NULLIF(p_email, ''), NULLIF(p_notes, ''))
  RETURNING id INTO v_customer_id;

  -- Insert audit log
  INSERT INTO public.reseller_audit_logs (reseller_user_id, business_id, action, entity, entity_id, payload)
  VALUES (
    auth.uid(),
    p_business_id,
    'create',
    'customer',
    v_customer_id,
    jsonb_build_object('name', p_name, 'phone', p_phone, 'email', p_email)
  );

  RETURN v_customer_id;
END;
$$;

-- 4. SECURITY DEFINER RPC: reseller_create_booking
CREATE OR REPLACE FUNCTION public.reseller_create_booking(
  p_business_id uuid,
  p_customer_name text,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_customer_id uuid DEFAULT NULL,
  p_customer_email text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_service_id uuid DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_status text DEFAULT 'confirmed'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reseller_id uuid;
  v_booking_id uuid;
BEGIN
  -- Get reseller ID and verify linkage
  SELECT r.id INTO v_reseller_id
  FROM public.resellers r
  JOIN public.reseller_clients rc ON rc.reseller_id = r.id
  WHERE r.user_id = auth.uid()
    AND r.is_active = true
    AND rc.business_id = p_business_id;

  IF v_reseller_id IS NULL THEN
    RAISE EXCEPTION 'reseller_not_linked_to_business';
  END IF;

  -- Insert the booking
  INSERT INTO public.bookings (
    business_id, customer_id, customer_name, customer_email, customer_phone,
    service_id, staff_id, start_time, end_time, notes, status
  )
  VALUES (
    p_business_id, p_customer_id, p_customer_name, NULLIF(p_customer_email, ''),
    NULLIF(p_customer_phone, ''), p_service_id, p_staff_id, p_start_time, p_end_time,
    NULLIF(p_notes, ''), COALESCE(p_status, 'confirmed')
  )
  RETURNING id INTO v_booking_id;

  -- Insert audit log
  INSERT INTO public.reseller_audit_logs (reseller_user_id, business_id, action, entity, entity_id, payload)
  VALUES (
    auth.uid(),
    p_business_id,
    'create',
    'booking',
    v_booking_id,
    jsonb_build_object(
      'customer_name', p_customer_name,
      'start_time', p_start_time,
      'end_time', p_end_time,
      'status', p_status
    )
  );

  RETURN v_booking_id;
END;
$$;

-- 5. SECURITY DEFINER RPC: reseller_update_booking_status
CREATE OR REPLACE FUNCTION public.reseller_update_booking_status(
  p_booking_id uuid,
  p_new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_old_status text;
BEGIN
  -- Get the booking's business_id and verify reseller linkage
  SELECT b.business_id, b.status INTO v_business_id, v_old_status
  FROM public.bookings b
  JOIN public.reseller_clients rc ON rc.business_id = b.business_id
  JOIN public.resellers r ON r.id = rc.reseller_id
  WHERE b.id = p_booking_id
    AND r.user_id = auth.uid()
    AND r.is_active = true;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'reseller_not_linked_to_business';
  END IF;

  -- Update the booking status
  UPDATE public.bookings
  SET status = p_new_status, updated_at = now()
  WHERE id = p_booking_id;

  -- Insert audit log
  INSERT INTO public.reseller_audit_logs (reseller_user_id, business_id, action, entity, entity_id, payload)
  VALUES (
    auth.uid(),
    v_business_id,
    'update_status',
    'booking',
    p_booking_id,
    jsonb_build_object('old_status', v_old_status, 'new_status', p_new_status)
  );
END;
$$;

-- 6. SECURITY DEFINER RPC: reseller_update_customer
CREATE OR REPLACE FUNCTION public.reseller_update_customer(
  p_customer_id uuid,
  p_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
BEGIN
  -- Get the customer's business_id and verify reseller linkage
  SELECT c.business_id INTO v_business_id
  FROM public.customers c
  JOIN public.reseller_clients rc ON rc.business_id = c.business_id
  JOIN public.resellers r ON r.id = rc.reseller_id
  WHERE c.id = p_customer_id
    AND r.user_id = auth.uid()
    AND r.is_active = true;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'reseller_not_linked_to_business';
  END IF;

  -- Update the customer (only non-null values)
  UPDATE public.customers
  SET 
    name = COALESCE(p_name, name),
    phone = CASE WHEN p_phone IS NOT NULL THEN NULLIF(p_phone, '') ELSE phone END,
    email = CASE WHEN p_email IS NOT NULL THEN NULLIF(p_email, '') ELSE email END,
    notes = CASE WHEN p_notes IS NOT NULL THEN NULLIF(p_notes, '') ELSE notes END,
    updated_at = now()
  WHERE id = p_customer_id;

  -- Insert audit log
  INSERT INTO public.reseller_audit_logs (reseller_user_id, business_id, action, entity, entity_id, payload)
  VALUES (
    auth.uid(),
    v_business_id,
    'update',
    'customer',
    p_customer_id,
    jsonb_build_object('name', p_name, 'phone', p_phone, 'email', p_email)
  );
END;
$$;

-- 7. Get reseller audit logs for diagnostics
CREATE OR REPLACE FUNCTION public.get_reseller_audit_logs(
  p_business_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  business_id uuid,
  action text,
  entity text,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.business_id,
    l.action,
    l.entity,
    l.entity_id,
    l.payload,
    l.created_at
  FROM public.reseller_audit_logs l
  WHERE l.reseller_user_id = auth.uid()
    AND (p_business_id IS NULL OR l.business_id = p_business_id)
  ORDER BY l.created_at DESC
  LIMIT p_limit;
END;
$$;