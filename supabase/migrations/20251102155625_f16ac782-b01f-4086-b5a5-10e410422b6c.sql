-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'student', 'staff');

-- Create enum for approval status
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for gender
CREATE TYPE public.gender AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  photo_url TEXT,
  gender gender,
  primary_location_lat DOUBLE PRECISION,
  primary_location_lng DOUBLE PRECISION,
  primary_location_address TEXT,
  is_driver BOOLEAN DEFAULT FALSE,
  approval_status approval_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create driver_details table
CREATE TABLE public.driver_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  license_number TEXT NOT NULL,
  license_photo_url TEXT NOT NULL,
  parent_phone_number TEXT NOT NULL,
  confirmation_letter_url TEXT NOT NULL,
  vehicle_model TEXT,
  vehicle_number TEXT,
  approval_status approval_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create ride_preferences table
CREATE TABLE public.ride_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  accept_opposite_gender BOOLEAN DEFAULT TRUE,
  accept_seniors BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rides table
CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  start_lat DOUBLE PRECISION NOT NULL,
  start_lng DOUBLE PRECISION NOT NULL,
  start_address TEXT NOT NULL,
  end_lat DOUBLE PRECISION NOT NULL,
  end_lng DOUBLE PRECISION NOT NULL,
  end_address TEXT NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  available_seats INTEGER NOT NULL DEFAULT 3,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_days TEXT[], -- ['monday', 'wednesday', 'friday']
  status TEXT DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  route_geometry TEXT, -- GeoJSON from OpenRouteService
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ride_requests table
CREATE TABLE public.ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE NOT NULL,
  passenger_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  pickup_address TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected, completed
  distance_km DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ride_id, passenger_id)
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create eco_impact table for tracking environmental benefits
CREATE TABLE public.eco_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE,
  distance_shared_km DOUBLE PRECISION NOT NULL,
  fuel_saved_liters DOUBLE PRECISION NOT NULL,
  carbon_reduced_kg DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eco_impact ENABLE ROW LEVEL SECURITY;

-- Create function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all approved profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (approval_status = 'approved' OR id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for driver_details
CREATE POLICY "Users can view own driver details"
  ON public.driver_details FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own driver details"
  ON public.driver_details FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all driver details"
  ON public.driver_details FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update driver details"
  ON public.driver_details FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for ride_preferences
CREATE POLICY "Users can manage own preferences"
  ON public.ride_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for rides
CREATE POLICY "Users can view all rides"
  ON public.rides FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Drivers can create rides"
  ON public.rides FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_driver = true 
    AND approval_status = 'approved'
  ));

CREATE POLICY "Drivers can update own rides"
  ON public.rides FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid());

-- RLS Policies for ride_requests
CREATE POLICY "Users can view ride requests for their rides"
  ON public.ride_requests FOR SELECT
  TO authenticated
  USING (
    passenger_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.rides WHERE rides.id = ride_requests.ride_id AND rides.driver_id = auth.uid())
  );

CREATE POLICY "Users can create ride requests"
  ON public.ride_requests FOR INSERT
  TO authenticated
  WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "Users can update own ride requests"
  ON public.ride_requests FOR UPDATE
  TO authenticated
  USING (passenger_id = auth.uid());

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their rides"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.rides 
      WHERE rides.id = chat_messages.ride_id 
      AND (rides.driver_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.ride_requests 
        WHERE ride_requests.ride_id = rides.id 
        AND ride_requests.passenger_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can send messages in their rides"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- RLS Policies for eco_impact
CREATE POLICY "Users can view own eco impact"
  ON public.eco_impact FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert eco impact"
  ON public.eco_impact FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create trigger function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_details_updated_at
  BEFORE UPDATE ON public.driver_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rides_updated_at
  BEFORE UPDATE ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ride_requests_updated_at
  BEFORE UPDATE ON public.ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;