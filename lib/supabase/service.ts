// Service-role Supabase client. Bypasses RLS — only use from
// trusted server contexts (webhooks, background jobs).
import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // Trim stray whitespace/newlines that often sneak in when pasting into
  // dashboards (Vercel, etc.).
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Supabase service client requires SUPABASE_SERVICE_ROLE_KEY");

  // The key is sent as an HTTP header, which must be Latin-1 (ByteString).
  // A masked value (e.g. copied as "••••") contains non-ASCII characters and
  // produces a cryptic "Cannot convert argument to a ByteString" error deep in
  // fetch. Catch it here with an actionable message instead.
  const badChar = [...key].find((c) => c.charCodeAt(0) > 255);
  if (badChar) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY contains invalid characters — it looks like a masked value was " +
        "pasted. Re-copy the full service_role key from Supabase (Project Settings → API) and " +
        "paste the plain JWT (starts with \"eyJ\")."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
