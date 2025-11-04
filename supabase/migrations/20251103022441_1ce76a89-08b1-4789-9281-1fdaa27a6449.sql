-- Add parent_phone_number to profiles table for all users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS parent_phone_number text;

-- Add otp field to ride_requests table
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS otp text;