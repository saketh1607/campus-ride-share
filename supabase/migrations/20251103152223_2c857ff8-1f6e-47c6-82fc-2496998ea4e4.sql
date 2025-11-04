-- Add user type enum
CREATE TYPE public.user_type AS ENUM ('student', 'faculty');

-- Add vehicle type enum
CREATE TYPE public.vehicle_type AS ENUM ('two_wheeler', 'four_wheeler');

-- Add new fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN user_type user_type DEFAULT 'student',
ADD COLUMN current_year integer CHECK (current_year >= 1 AND current_year <= 4);

-- Add vehicle type to driver_details
ALTER TABLE public.driver_details
ADD COLUMN vehicle_type vehicle_type DEFAULT 'four_wheeler';

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.current_year IS 'Academic year for students (1-4), NULL for faculty';