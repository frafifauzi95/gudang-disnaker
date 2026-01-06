import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://vupoipqbvwloxdlyczfk.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cG9pcHFidndsb3hkbHljemZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwOTI3MDgsImV4cCI6MjA4MjY2ODcwOH0.L8PZ84YJr5ZadWqM-CjlUDv8XI6Z25mgcBZczZ5f-CY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const api = {
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session || null;
  },

  async getUser() {
    const { data } = await supabase.auth.getUser();
    return data.user || null;
  },

  async getProfileByUserId(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error) throw error;
    return data;
  },

  async loadStock() {
    const { data } = await supabase.from("stock").select("*").order("name");
    return data || [];
  },

  async loadHistory() {
    const { data } = await supabase
      .from("history")
      .select("*")
      .order("ts", { ascending: false })
      .limit(200);
    return data || [];
  },

  async loadEmployeesPublic() {
    const { data, error } = await supabase
      .from("profiles_public")
      .select("employee_id, name, position, is_active")
      .order("name");
    if (error) throw error;
    return data || [];
  },

  async loadEmployeeAdmin(empId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("employee_id, name, position, role, is_active, user_id")
      .eq("employee_id", empId)
      .single();
    if (error) throw error;
    return data;
  },

  async rpc(name, payload) {
    const { error } = await supabase.rpc(name, payload);
    if (error) throw error;
  },
};
