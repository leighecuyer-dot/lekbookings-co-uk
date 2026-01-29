-- Add columns for AI context to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS website_urls text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_context text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.businesses.website_urls IS 'Array of website URLs the AI can reference for business context';
COMMENT ON COLUMN public.businesses.ai_context IS 'User-provided description of their business for AI personalization';