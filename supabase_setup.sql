-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  privacy_likes TEXT DEFAULT 'friends',
  privacy_playlists TEXT DEFAULT 'friends',
  privacy_artists TEXT DEFAULT 'friends',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrations (if columns do not already exist)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_likes TEXT DEFAULT 'friends';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_playlists TEXT DEFAULT 'friends';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_artists TEXT DEFAULT 'friends';

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create shared_tracks table
CREATE TABLE IF NOT EXISTS public.shared_tracks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id TEXT,
    title TEXT,
    artist TEXT,
    thumbnail TEXT,
    message TEXT,
    is_liked BOOLEAN DEFAULT false,
    reply_to_id UUID REFERENCES public.shared_tracks(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.shared_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert shared tracks they send" ON public.shared_tracks
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view shared tracks they sent or received" ON public.shared_tracks
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can update shared tracks they sent or received" ON public.shared_tracks
    FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can delete shared tracks they sent" ON public.shared_tracks
    FOR DELETE USING (auth.uid() = sender_id);
