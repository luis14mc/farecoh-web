import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY environment variables are required.");
}

// Public client used in client-side components and standard server actions
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Private administrative client (runs server-side ONLY) using service role to manage staff profiles and auth
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export const SEED_EVENT = {
  id: "pink-floyd",
  name: "Tributo a Pink Floyd - Parroquia El Salvador del Mundo",
  description: "Concierto tributo a Pink Floyd por la Fundacion de Artes Institucionales. Recaudacion de fondos para obras de la parroquia.",
  date: "2026-06-27T19:00:00",
  location: "Anfiteatro del Salvador, Tegucigalpa",
  ticket_price: 500.00,
  total_tickets: 500,
  created_at: new Date().toISOString()
};

export const getEvent = async () => {
  return SEED_EVENT;
};

