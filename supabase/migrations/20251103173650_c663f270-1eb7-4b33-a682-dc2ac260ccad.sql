-- Add payment fields to ride_requests table
ALTER TABLE ride_requests 
ADD COLUMN fare_amount numeric,
ADD COLUMN payment_status text DEFAULT 'pending',
ADD COLUMN payment_intent_id text;

-- Add comment to explain the fare calculation
COMMENT ON COLUMN ride_requests.fare_amount IS 'Calculated as 8 rupees per kilometer';
