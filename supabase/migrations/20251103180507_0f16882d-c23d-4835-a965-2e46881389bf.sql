-- Create ride_feedback table for passenger ratings and feedback
CREATE TABLE public.ride_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  report TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ride_id, passenger_id)
);

-- Enable RLS
ALTER TABLE public.ride_feedback ENABLE ROW LEVEL SECURITY;

-- Passengers can create feedback for their rides
CREATE POLICY "Passengers can create feedback"
ON public.ride_feedback
FOR INSERT
WITH CHECK (
  passenger_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM ride_requests
    WHERE ride_requests.ride_id = ride_feedback.ride_id
    AND ride_requests.passenger_id = auth.uid()
  )
);

-- Users can view feedback for rides they're involved in
CREATE POLICY "Users can view feedback for their rides"
ON public.ride_feedback
FOR SELECT
USING (
  passenger_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM rides
    WHERE rides.id = ride_feedback.ride_id
    AND rides.driver_id = auth.uid()
  )
);

-- Create a view for driver ratings
CREATE VIEW public.driver_ratings AS
SELECT 
  r.driver_id,
  COUNT(rf.id) as total_ratings,
  ROUND(AVG(rf.rating)::numeric, 1) as average_rating
FROM rides r
LEFT JOIN ride_feedback rf ON rf.ride_id = r.id
GROUP BY r.driver_id;

-- Add index for performance
CREATE INDEX idx_ride_feedback_ride_id ON public.ride_feedback(ride_id);
CREATE INDEX idx_ride_feedback_passenger_id ON public.ride_feedback(passenger_id);