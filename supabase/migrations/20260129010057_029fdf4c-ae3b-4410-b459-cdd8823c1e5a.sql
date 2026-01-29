-- Create table for AI campaign suggestions history
CREATE TABLE public.ai_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  suggestion_text TEXT NOT NULL,
  availability_snapshot JSONB NOT NULL DEFAULT '{}',
  success_rating INTEGER CHECK (success_rating >= 1 AND success_rating <= 5),
  campaign_sent BOOLEAN DEFAULT false,
  campaign_type TEXT, -- 'sms' or 'whatsapp'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  rated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view suggestions for their businesses
CREATE POLICY "Users can view their AI suggestions"
ON public.ai_suggestions
FOR SELECT
USING (business_id IN (SELECT get_user_business_ids(auth.uid())));

-- Policy: Users can create suggestions for their businesses
CREATE POLICY "Users can create AI suggestions"
ON public.ai_suggestions
FOR INSERT
WITH CHECK (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role]));

-- Policy: Users can update their suggestions (for rating)
CREATE POLICY "Users can update their AI suggestions"
ON public.ai_suggestions
FOR UPDATE
USING (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role, 'admin'::app_role, 'staff'::app_role]));

-- Policy: Owners can delete suggestions
CREATE POLICY "Owners can delete AI suggestions"
ON public.ai_suggestions
FOR DELETE
USING (has_business_role(auth.uid(), business_id, ARRAY['owner'::app_role]));

-- Create index for faster queries
CREATE INDEX idx_ai_suggestions_business_id ON public.ai_suggestions(business_id);
CREATE INDEX idx_ai_suggestions_created_at ON public.ai_suggestions(created_at DESC);