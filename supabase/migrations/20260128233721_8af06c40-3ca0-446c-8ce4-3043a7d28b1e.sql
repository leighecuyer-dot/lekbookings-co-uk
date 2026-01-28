-- Add payment tracking columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'deposit_paid', 'paid')),
ADD COLUMN IF NOT EXISTS deposit_amount numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_price numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0;

-- Create index for payment_status queries
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);

-- Add comment for clarity
COMMENT ON COLUMN public.bookings.payment_status IS 'unpaid = no payment, deposit_paid = deposit received, paid = full payment';
COMMENT ON COLUMN public.bookings.deposit_amount IS 'Required deposit amount for this booking';
COMMENT ON COLUMN public.bookings.total_price IS 'Total price for this booking (from service)';
COMMENT ON COLUMN public.bookings.amount_paid IS 'Amount already paid by customer';