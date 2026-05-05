import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuthStore } from "../../stores/authStore";

export function useBootstrapSession() {
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session?.user) {
        const u = data.session.user;
        setUser({
          id: u.id,
          email: u.email ?? "",
          fullName: (u.user_metadata?.full_name as string | undefined) ?? u.email ?? "",
          photoUrl: u.user_metadata?.avatar_url as string | undefined,
          role: ((u.app_metadata?.role as string | undefined) ?? "AGENT") as never,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        return;
      }
      const u = session.user;
      setUser({
        id: u.id,
        email: u.email ?? "",
        fullName: (u.user_metadata?.full_name as string | undefined) ?? u.email ?? "",
        photoUrl: u.user_metadata?.avatar_url as string | undefined,
        role: ((u.app_metadata?.role as string | undefined) ?? "AGENT") as never,
      });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [setUser]);

  return { loading };
}
