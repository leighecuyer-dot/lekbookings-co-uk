CREATE OR REPLACE FUNCTION public.get_public_booking_availability(
  p_business_id uuid,
  p_service_id uuid,
  p_day_start timestamp with time zone,
  p_day_end timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_has_assignments boolean := false;
  v_local_date date := (p_day_start AT TIME ZONE 'Europe/London')::date;
  v_staff jsonb := '[]'::jsonb;
  v_bookings jsonb := '[]'::jsonb;
BEGIN
  IF p_business_id IS NULL OR p_service_id IS NULL OR p_day_start IS NULL OR p_day_end IS NULL THEN
    RETURN jsonb_build_object('staff', '[]'::jsonb, 'bookings', '[]'::jsonb);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.services s
    JOIN public.businesses b ON b.id = s.business_id
    WHERE s.id = p_service_id
      AND s.business_id = p_business_id
      AND s.is_active = true
  ) THEN
    RETURN jsonb_build_object('staff', '[]'::jsonb, 'bookings', '[]'::jsonb);
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.staff_services ss
    JOIN public.staff st ON st.id = ss.staff_id
    WHERE ss.service_id = p_service_id
      AND st.business_id = p_business_id
      AND st.is_active = true
  ) INTO v_has_assignments;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'working_hours', s.working_hours,
        'on_leave', EXISTS (
          SELECT 1
          FROM public.staff_leave sl
          WHERE sl.staff_id = s.id
            AND sl.business_id = p_business_id
            AND sl.start_date <= v_local_date
            AND sl.end_date >= v_local_date
        )
      )
      ORDER BY s.name
    ),
    '[]'::jsonb
  ) INTO v_staff
  FROM public.staff s
  WHERE s.business_id = p_business_id
    AND s.is_active = true
    AND (
      v_has_assignments = false
      OR EXISTS (
        SELECT 1
        FROM public.staff_services ss
        WHERE ss.staff_id = s.id
          AND ss.service_id = p_service_id
      )
    );

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'staff_id', b.staff_id,
        'start_time', b.start_time,
        'end_time', b.end_time,
        'status', b.status
      )
      ORDER BY b.start_time
    ),
    '[]'::jsonb
  ) INTO v_bookings
  FROM public.bookings b
  WHERE b.business_id = p_business_id
    AND b.status <> 'cancelled'
    AND b.start_time < p_day_end
    AND b.end_time > p_day_start
    AND (
      b.staff_id IS NULL
      OR b.staff_id IN (
        SELECT (staff_item->>'id')::uuid
        FROM jsonb_array_elements(v_staff) staff_item
      )
    );

  RETURN jsonb_build_object('staff', v_staff, 'bookings', v_bookings);
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_booking_availability(uuid, uuid, timestamp with time zone, timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_booking_availability(uuid, uuid, timestamp with time zone, timestamp with time zone) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_booking_availability(uuid, uuid, timestamp with time zone, timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_booking_availability(uuid, uuid, timestamp with time zone, timestamp with time zone) TO service_role;