-- Enable realtime for ride_requests table so passengers can see OTP updates immediately
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_requests;