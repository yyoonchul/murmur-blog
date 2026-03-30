import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../../shared/lib/supabase";

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}

export async function signInWithGoogle() {
  const redirectTo = `${window.location.origin}/`;
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
}

export function signOut() {
  return supabase.auth.signOut();
}
