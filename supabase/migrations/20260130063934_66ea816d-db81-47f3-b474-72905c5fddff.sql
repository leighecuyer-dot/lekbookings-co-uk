-- Add display_order column to services table for drag-and-drop reordering
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Update existing services to have sequential display_order based on name
WITH ordered_services AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY business_id ORDER BY name) as rn
  FROM public.services
)
UPDATE public.services s
SET display_order = os.rn
FROM ordered_services os
WHERE s.id = os.id;