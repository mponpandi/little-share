-- Create messages table for donor-receiver communication after request acceptance
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Only participants of accepted requests can view messages
CREATE POLICY "Participants can view messages"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = request_id
    AND r.status = 'accepted'
    AND (r.receiver_id = auth.uid() OR public.item_donor_id(r.item_id) = auth.uid())
  )
);

-- Only participants of accepted requests can send messages
CREATE POLICY "Participants can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = request_id
    AND r.status = 'accepted'
    AND (r.receiver_id = auth.uid() OR public.item_donor_id(r.item_id) = auth.uid())
  )
);

-- Users can mark their received messages as read
CREATE POLICY "Users can update read status"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = request_id
    AND r.status = 'accepted'
    AND (r.receiver_id = auth.uid() OR public.item_donor_id(r.item_id) = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = request_id
    AND r.status = 'accepted'
    AND (r.receiver_id = auth.uid() OR public.item_donor_id(r.item_id) = auth.uid())
  )
);

-- Index for faster lookups
CREATE INDEX idx_messages_request_id ON public.messages(request_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);