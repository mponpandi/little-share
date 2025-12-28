import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell, BellOff, Loader2 } from 'lucide-react';

const categories = [
  { key: 'clothing', label: 'Clothing' },
  { key: 'school_supplies', label: 'School Supplies' },
  { key: 'electronics', label: 'Electronics' },
  { key: 'other', label: 'Other' },
];

export function NotificationSettings() {
  const {
    isSupported,
    isSubscribed,
    isLoading: pushLoading,
    permission,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const {
    preferences,
    isLoading: prefsLoading,
    updatePreferences,
  } = useNotificationPreferences();

  const handleCategoryChange = (category: string, checked: boolean) => {
    const newCategories = checked
      ? [...preferences.preferred_categories, category]
      : preferences.preferred_categories.filter(c => c !== category);
    updatePreferences({ preferred_categories: newCategories });
  };

  return (
    <div className="space-y-4">
      {/* Push Notification Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {isSubscribed ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            Push Notifications
          </CardTitle>
          <CardDescription className="text-sm">
            Get notified even when the app is closed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSupported ? (
            <p className="text-sm text-muted-foreground">
              Push notifications are not supported in this browser.
            </p>
          ) : permission === 'denied' ? (
            <p className="text-sm text-destructive">
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          ) : (
            <Button
              variant={isSubscribed ? "outline" : "default"}
              size="sm"
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={pushLoading}
            >
              {pushLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isSubscribed ? 'Disable Notifications' : 'Enable Notifications'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notification Types</CardTitle>
          <CardDescription className="text-sm">
            Choose what you want to be notified about
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="new-requests" className="text-sm">
              New donation requests
            </Label>
            <Switch
              id="new-requests"
              checked={preferences.new_requests}
              onCheckedChange={(checked) => updatePreferences({ new_requests: checked })}
              disabled={prefsLoading}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="request-updates" className="text-sm">
              Request status updates
            </Label>
            <Switch
              id="request-updates"
              checked={preferences.request_updates}
              onCheckedChange={(checked) => updatePreferences({ request_updates: checked })}
              disabled={prefsLoading}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="new-items" className="text-sm">
              New items in my categories
            </Label>
            <Switch
              id="new-items"
              checked={preferences.new_items}
              onCheckedChange={(checked) => updatePreferences({ new_items: checked })}
              disabled={prefsLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Preferences */}
      {preferences.new_items && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Preferred Categories</CardTitle>
            <CardDescription className="text-sm">
              Get notified when new items are posted in these categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <div key={category.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cat-${category.key}`}
                    checked={preferences.preferred_categories.includes(category.key)}
                    onCheckedChange={(checked) => 
                      handleCategoryChange(category.key, checked as boolean)
                    }
                    disabled={prefsLoading}
                  />
                  <Label
                    htmlFor={`cat-${category.key}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {category.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
