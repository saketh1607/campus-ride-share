-- Drop the existing update policy for ride_requests
DROP POLICY IF EXISTS "Users can update own ride requests" ON ride_requests;

-- Create new update policy that allows both passengers and drivers to update
CREATE POLICY "Passengers and drivers can update ride requests"
ON ride_requests
FOR UPDATE
USING (
  passenger_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM rides 
    WHERE rides.id = ride_requests.ride_id 
    AND rides.driver_id = auth.uid()
  )
);