export type NotificationPrefs = {
  email_on_trip_invite: boolean;
  email_on_connection_request: boolean;
  email_on_deal_alert: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  email_on_trip_invite: true,
  email_on_connection_request: true,
  email_on_deal_alert: false,
};
