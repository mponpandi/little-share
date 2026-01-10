-- Create a function to notify users of new messages
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  request_record RECORD;
  recipient_id UUID;
  sender_name TEXT;
BEGIN
  -- Get the request details
  SELECT r.*, i.donor_id, i.name as item_name
  INTO request_record
  FROM requests r
  JOIN items i ON i.id = r.item_id
  WHERE r.id = NEW.request_id;

  -- Determine the recipient (the other participant in the chat)
  IF NEW.sender_id = request_record.receiver_id THEN
    recipient_id := request_record.donor_id;
  ELSE
    recipient_id := request_record.receiver_id;
  END IF;

  -- Get sender's name
  SELECT full_name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Create notification for the recipient
  INSERT INTO notifications (user_id, title, message, type, related_request_id, related_item_id)
  VALUES (
    recipient_id,
    'New Message from ' || COALESCE(sender_name, 'User'),
    LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
    'new_message',
    NEW.request_id,
    request_record.item_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to call the function on new messages
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();