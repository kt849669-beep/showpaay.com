// user-app/js/config/supabase.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm";

const SUPABASE_URL = "https://ujzupmmvfrhpwziudydr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zqGOuDGYCAin5goXvlM5-Q_pliMNwlj";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
