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

export interface EventData {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  ticket_price: number;
  total_tickets: number;
  created_at: string;
}

export const SEED_EVENT: EventData = {
  id: "pink-floyd",
  name: "Tributo a Pink Floyd - Escuela Nacional de Música",
  description: "Concierto tributo a Pink Floyd por la Fundacion de Artes Institucionales.",
  date: "2026-08-29T20:00:00",
  time: "8:00 p. m.",
  venue: "Escuela Nacional de Música, Tegucigalpa",
  city: "Tegucigalpa",
  ticket_price: 500.00,
  total_tickets: 500,
  created_at: new Date().toISOString()
};

export const getEvent = async (): Promise<EventData> => {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", "pink-floyd")
    .single();

  if (error || !data) {
    console.warn("Event not found in DB, using seed data:", error?.message);
    return SEED_EVENT;
  }

  return {
    id: data.id,
    name: data.title,
    description: data.description || "",
    date: data.event_date,
    time: data.event_time,
    venue: data.location,
    city: data.city,
    ticket_price: data.ticket_price,
    total_tickets: data.capacity,
    created_at: data.created_at,
  };
};
