export interface Promoter {
  id: string;
  user_id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  description?: string | null;
  event_types?: string[] | null;
  is_public?: boolean | null;
  show_past_events?: boolean | null;
  created_at: Date;
}
