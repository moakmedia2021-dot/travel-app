export type TripStatus = "draft" | "planned" | "active" | "completed";
export type TripVisibility = "private" | "group" | "public";
export type ItineraryType = "flight" | "hotel" | "activity" | "transport" | "note";
export type ExpenseCategory = "food" | "transport" | "accommodation" | "activities" | "misc";
export type SplitType = "equal" | "custom";

export type TripMemberRole = "owner" | "editor" | "viewer";

export type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  home_airport?: string | null;
};

export type TripMember = {
  user_id: string;
  role: TripMemberRole;
  joined_at: string;
  profile: Profile;
};

export type InviteStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "expired"
  | "cancelled";

export type TripInvite = {
  id: string;
  trip_id: string;
  invited_by: string;
  email: string;
  user_id: string | null;
  role: "editor" | "viewer";
  token: string;
  status: InviteStatus;
  created_at: string;
  expires_at: string;
};

export type InvitableUser = {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type ExpenseSplit = {
  id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number;
  settled: boolean;
};

export type Expense = {
  id: string;
  trip_id: string;
  paid_by: string;
  title: string;
  amount: number;
  currency: string;
  category: ExpenseCategory | string | null;
  split_type: SplitType;
  date: string;
  receipt_url: string | null;
  created_at: string;
  expense_splits: ExpenseSplit[];
};

export type ItineraryItem = {
  id: string;
  trip_id: string;
  day_number: number;
  position: number;
  title: string;
  type: ItineraryType;
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  price: number | null;
  currency: string | null;
  booking_ref: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type Trip = {
  id: string;
  owner_id: string;
  title: string;
  destination: string | null;
  country_code: string | null;
  cover_image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  status: TripStatus;
  visibility: TripVisibility;
  budget_total: number | null;
  currency: string | null;
  travelers: number | null;
  created_at: string;
};
