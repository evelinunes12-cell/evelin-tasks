import { useState, useEffect, useRef } from "react";
import { registerActivity } from "@/services/activity";
import { logError } from "@/lib/logger";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logXP, XP } from "@/services/scoring";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const loginXpLogged = useRef(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_IN" && session?.user && !loginXpLogged.current) {
        loginXpLogged.current = true;
        // Only grant 1 XP per day for login
        const today = new Date().toISOString().slice(0, 10);
        supabase
          .from("user_xp_logs")
          .select("id")
          .eq("user_id", session.user.id)
          .eq("action_type", "login")
          .gte("created_at", `${today}T00:00:00`)
          .lt("created_at", `${today}T23:59:59.999`)
          .limit(1)
          .then(({ data }) => {
        if (!data || data.length === 0) {
              logXP(session.user.id, "login", XP.LOGIN);
            }
            // Always register activity on login for streak
            registerActivity(session.user.id);
          });
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  interface SignUpData {
    email: string;
    password: string;
    fullName: string;
    username?: string;
    birthDate?: string;
    city?: string;
    phone?: string;
    educationLevel?: string;
    termsAccepted?: boolean;
  }

  const signUp = async (data: SignUpData) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: data.fullName,
        },
      },
    });

    // If signup succeeded and we have the user, update their profile with additional data
    if (!error && authData.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          birth_date: data.birthDate || null,
          city: data.city || null,
          phone: data.phone || null,
          education_level: data.educationLevel || null,
          terms_accepted: data.termsAccepted || false,
          username: data.username || undefined,
          last_username_update: data.username ? new Date().toISOString() : undefined,
        })
        .eq("id", authData.user.id);

      if (profileError) {
        logError("Error updating profile", profileError);
      }
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      // Avoid depending on react-router from inside the auth hook.
      window.location.replace("/auth");
    }
    return { error };
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth?mode=reset`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  };
};

