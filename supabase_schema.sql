-- Create likes table
CREATE TABLE IF NOT EXISTS public.likes (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    title TEXT,
    artist TEXT,
    thumbnail TEXT,
    album TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, video_id)
);

-- Create playlists table
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cover TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create playlist_tracks table
CREATE TABLE IF NOT EXISTS public.playlist_tracks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    title TEXT,
    artist TEXT,
    thumbnail TEXT,
    position INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create followed_artists table
CREATE TABLE IF NOT EXISTS public.followed_artists (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar TEXT,
    genre TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, name)
);

-- Enable RLS on all tables
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followed_artists ENABLE ROW LEVEL SECURITY;

-- Policies for likes
CREATE POLICY "Users can manage their own likes" ON public.likes
    FOR ALL USING (auth.uid() = user_id);

-- Policies for playlists
CREATE POLICY "Users can manage their own playlists" ON public.playlists
    FOR ALL USING (auth.uid() = user_id);

-- Policies for playlist_tracks
CREATE POLICY "Users can manage tracks in their playlists" ON public.playlist_tracks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.playlists 
            WHERE id = playlist_id AND user_id = auth.uid()
        )
    );

-- Policies for followed_artists
CREATE POLICY "Users can manage their own followed artists" ON public.followed_artists
    FOR ALL USING (auth.uid() = user_id);

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
