export type CollabStatus =
  | "lead"
  | "contacted"
  | "negotiating"
  | "booked"
  | "filming"
  | "published"
  | "paid"
  | "archived";

export const COLLAB_STATUSES: CollabStatus[] = [
  "lead",
  "contacted",
  "negotiating",
  "booked",
  "filming",
  "published",
  "paid",
  "archived",
];

export const STATUS_LABELS: Record<CollabStatus, string> = {
  lead: "Lead",
  contacted: "Contacted",
  negotiating: "Negotiating",
  booked: "Booked",
  filming: "Filming",
  published: "Published",
  paid: "Paid",
  archived: "Archived",
};

// Tailwind classes per status for badges.
export const STATUS_COLORS: Record<CollabStatus, string> = {
  lead: "bg-neutral-100 text-neutral-700",
  contacted: "bg-blue-100 text-blue-700",
  negotiating: "bg-amber-100 text-amber-800",
  booked: "bg-violet-100 text-violet-700",
  filming: "bg-cyan-100 text-cyan-700",
  published: "bg-green-100 text-green-700",
  paid: "bg-emerald-100 text-emerald-800",
  archived: "bg-neutral-100 text-neutral-400",
};

export type Collaboration = {
  id: string;
  name: string;
  property_name: string | null;
  property_url: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  status: CollabStatus;
  deal_value: number | null;
  currency: string;
  rate_type: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityKind = "note" | "email" | "call" | "meeting" | "status";

export type Activity = {
  id: string;
  collaboration_id: string;
  kind: ActivityKind;
  body: string | null;
  created_at: string;
};

export type DocType = "contract" | "invoice";
export type DocStatus = "draft" | "sent" | "signed" | "paid" | "void";

export type InvoiceLineItem = { description: string; quantity: number; rate: number };

// Stored in crm_documents.content; shape depends on type.
export type DocumentContent = {
  // shared
  from?: { name?: string; email?: string; business?: string };
  to?: { name?: string; email?: string; property?: string; location?: string };
  notes?: string;
  // invoice
  line_items?: InvoiceLineItem[];
  currency?: string;
  issued_on?: string;
  due_on?: string;
  // contract
  body?: string; // markdown / plain text of the agreement
  effective_date?: string;
};

export type BusinessDocument = {
  id: string;
  collaboration_id: string | null;
  type: DocType;
  number: string | null;
  title: string;
  content: DocumentContent;
  total: number | null;
  status: DocStatus;
  created_at: string;
  updated_at: string;
};

export type CollaborationInput = {
  id?: string | null;
  name: string;
  property_name: string | null;
  property_url: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  status: CollabStatus;
  deal_value: number | null;
  currency: string;
  rate_type: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
};

// ----- AI content studio ----------------------------------------------
export type VideoPlatform = "youtube" | "reels" | "tiktok";

export type VideoContent = {
  hooks: string[];
  ideas: { title: string; angle: string }[];
  script: { section: string; text: string }[];
  caption: string;
  hashtags: string[];
};
