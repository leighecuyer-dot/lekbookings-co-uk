-- Create service_categories table
CREATE TABLE public.service_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add category_id to services table
ALTER TABLE public.services ADD COLUMN category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for service_categories
CREATE POLICY "Anyone can view active categories"
ON public.service_categories
FOR SELECT
USING (is_active = true);

CREATE POLICY "Users can view their categories"
ON public.service_categories
FOR SELECT
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

CREATE POLICY "Owners and admins can manage categories"
ON public.service_categories
FOR ALL
USING (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role]))
WITH CHECK (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role]));

-- Create trigger for updated_at
CREATE TRIGGER update_service_categories_updated_at
BEFORE UPDATE ON public.service_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();