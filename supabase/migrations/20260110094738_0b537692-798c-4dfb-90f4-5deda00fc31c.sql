-- Add message_type to messages for supporting different message types (text, image, location, live_location)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS location_data jsonb;

-- Create chat_presence table for online status tracking
CREATE TABLE IF NOT EXISTS public.chat_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  is_online boolean NOT NULL DEFAULT false,
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, request_id)
);

-- Create live_locations table for real-time location sharing
CREATE TABLE IF NOT EXISTS public.live_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  is_sharing boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, request_id)
);

-- Enable RLS on new tables
ALTER TABLE public.chat_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_presence
CREATE POLICY "Users can view presence in their chats" ON public.chat_presence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = chat_presence.request_id
        AND r.status = 'accepted'
        AND (r.receiver_id = auth.uid() OR item_donor_id(r.item_id) = auth.uid())
    )
  );

CREATE POLICY "Users can update their own presence" ON public.chat_presence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can modify their own presence" ON public.chat_presence
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presence" ON public.chat_presence
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for live_locations
CREATE POLICY "Users can view live locations in their chats" ON public.live_locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = live_locations.request_id
        AND r.status = 'accepted'
        AND (r.receiver_id = auth.uid() OR item_donor_id(r.item_id) = auth.uid())
    )
  );

CREATE POLICY "Users can share their own location" ON public.live_locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own location" ON public.live_locations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can stop sharing their location" ON public.live_locations
  FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for chat media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat-media bucket
CREATE POLICY "Authenticated users can upload chat media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "Anyone can view chat media" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-media');

CREATE POLICY "Users can delete their own chat media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger for updated_at on new tables
CREATE TRIGGER update_chat_presence_updated_at
  BEFORE UPDATE ON public.chat_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_live_locations_updated_at
  BEFORE UPDATE ON public.live_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();