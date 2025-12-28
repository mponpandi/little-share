import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  new_requests: boolean;
  request_updates: boolean;
  new_items: boolean;
  preferred_categories: string[];
}

const defaultPreferences: NotificationPreferences = {
  new_requests: true,
  request_updates: true,
  new_items: true,
  preferred_categories: ['clothing', 'school_supplies', 'electronics', 'other'],
};

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPreferences = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          new_requests: data.new_requests ?? true,
          request_updates: data.request_updates ?? true,
          new_items: data.new_items ?? true,
          preferred_categories: data.preferred_categories ?? defaultPreferences.preferred_categories,
        });
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const updatedPrefs = { ...preferences, ...newPreferences };

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...updatedPrefs,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setPreferences(updatedPrefs);
      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved.",
      });
      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update notification preferences.",
        variant: "destructive",
      });
      return false;
    }
  }, [preferences, toast]);

  return {
    preferences,
    isLoading,
    updatePreferences,
    refetch: fetchPreferences,
  };
}
