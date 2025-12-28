import { supabase } from '@/integrations/supabase/client';

interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: 'request_received' | 'request_accepted' | 'request_declined' | 'new_item';
  relatedItemId?: string;
  relatedRequestId?: string;
}

// Create in-app notification
export async function createNotification(data: NotificationData): Promise<void> {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: data.userId,
      title: data.title,
      message: data.message,
      type: data.type,
      related_item_id: data.relatedItemId,
      related_request_id: data.relatedRequestId,
    });

    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

// Send push notification via edge function
export async function sendPushNotification(
  userIds: string[],
  title: string,
  body: string,
  url?: string
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_ids: userIds,
        title,
        body,
        url,
      },
    });

    if (error) {
      console.error('Error sending push notification:', error);
    }
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
}

// Combined function to send both in-app and push notifications
export async function notifyUser(
  data: NotificationData & { sendPush?: boolean }
): Promise<void> {
  // Create in-app notification
  await createNotification(data);

  // Send push notification if requested
  if (data.sendPush !== false) {
    const url = data.relatedItemId 
      ? `/item/${data.relatedItemId}` 
      : data.relatedRequestId 
        ? '/requests' 
        : '/notifications';
    
    await sendPushNotification([data.userId], data.title, data.message, url);
  }
}

// Notify when someone requests an item
export async function notifyNewRequest(
  donorId: string,
  receiverName: string,
  itemName: string,
  itemId: string,
  requestId: string
): Promise<void> {
  await notifyUser({
    userId: donorId,
    title: 'New Request Received',
    message: `${receiverName} wants to receive your "${itemName}"`,
    type: 'request_received',
    relatedItemId: itemId,
    relatedRequestId: requestId,
  });
}

// Notify when a request is accepted
export async function notifyRequestAccepted(
  receiverId: string,
  donorName: string,
  itemName: string,
  itemId: string,
  requestId: string
): Promise<void> {
  await notifyUser({
    userId: receiverId,
    title: 'Request Accepted!',
    message: `${donorName} accepted your request for "${itemName}"`,
    type: 'request_accepted',
    relatedItemId: itemId,
    relatedRequestId: requestId,
  });
}

// Notify when a request is declined
export async function notifyRequestDeclined(
  receiverId: string,
  itemName: string,
  itemId: string,
  requestId: string
): Promise<void> {
  await notifyUser({
    userId: receiverId,
    title: 'Request Declined',
    message: `Your request for "${itemName}" was declined`,
    type: 'request_declined',
    relatedItemId: itemId,
    relatedRequestId: requestId,
  });
}

// Notify about new item in a category
export async function notifyNewItem(
  userId: string,
  itemName: string,
  category: string,
  itemId: string
): Promise<void> {
  await notifyUser({
    userId,
    title: 'New Donation Available',
    message: `A new ${category} item "${itemName}" was just posted`,
    type: 'new_item',
    relatedItemId: itemId,
  });
}
