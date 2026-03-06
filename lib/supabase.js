import { createClient } from "@supabase/supabase-js";

// These come from your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Lead operations ──────────────────────────────────────────────────────────

export async function getLeads() {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("lead_score", { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertLead(lead) {
  const { data, error } = await supabase
    .from("leads")
    .upsert(lead, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertLead(lead) {
  // Remove id so Supabase auto-generates it
  const { id, ...rest } = lead;
  const { data, error } = await supabase
    .from("leads")
    .insert(rest)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLead(id) {
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw error;
}

// ── Real-time subscription ───────────────────────────────────────────────────
// This lets all team members see changes instantly without refreshing

export function subscribeToLeads(callback) {
  const channel = supabase
    .channel("leads-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "leads" },
      (payload) => callback(payload)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
