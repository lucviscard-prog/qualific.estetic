import {createClient} from "@supabase/supabase-js";

// Only the public project URL and publishable key belong in the browser.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zyekgimmyosbxawvllvs.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_QFMzIAr9q6jeM8o0yDKr7A_A5KZU9Pd",
);
