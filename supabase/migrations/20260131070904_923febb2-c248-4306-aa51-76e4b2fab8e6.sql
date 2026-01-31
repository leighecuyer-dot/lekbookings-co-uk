-- Create dashboard_settings table for cross-device sync
CREATE TABLE public.dashboard_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  widget_order TEXT[] DEFAULT ARRAY['availability', 'performance', 'revenue', 'revenueBreakdown', 'trends'],
  widget_visibility JSONB DEFAULT '{"showPerformanceTile": true, "showRevenueTile": true, "showRevenueBreakdownTile": true, "showTrendsChart": true, "showAvailabilityTile": true}',
  widget_sizes JSONB DEFAULT '{"availability": 1, "performance": 1, "revenue": 1, "revenueBreakdown": 2, "trends": 3}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, user_id)
);

-- Enable RLS
ALTER TABLE public.dashboard_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
CREATE POLICY "Users can view their own dashboard settings"
ON public.dashboard_settings
FOR SELECT
USING (auth.uid() = user_id AND public.can_access_business(business_id));

-- Users can insert their own settings
CREATE POLICY "Users can insert their own dashboard settings"
ON public.dashboard_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.can_access_business(business_id));

-- Users can update their own settings
CREATE POLICY "Users can update their own dashboard settings"
ON public.dashboard_settings
FOR UPDATE
USING (auth.uid() = user_id AND public.can_access_business(business_id));

-- Create trigger for updated_at
CREATE TRIGGER update_dashboard_settings_updated_at
BEFORE UPDATE ON public.dashboard_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();