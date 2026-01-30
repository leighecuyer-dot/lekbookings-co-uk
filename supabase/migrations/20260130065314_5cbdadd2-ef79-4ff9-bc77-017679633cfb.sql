-- Add a column to track whether the business shares revenue data with their reseller
-- This is stored in the settings JSONB column as 'share_revenue_with_reseller'
-- Default is false (private) for security

COMMENT ON COLUMN public.businesses.settings IS 'Business settings including share_revenue_with_reseller (boolean, default false)';