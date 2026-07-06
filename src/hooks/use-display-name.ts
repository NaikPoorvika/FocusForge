import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "./use-current-user";

/**
 * Returns the user's display name.
 * Priority:
 *   1. user.user_metadata.full_name (or .name)
 *   2. profiles.full_name (fetched on sign-in / refresh)
 *   3. email prefix
 *   4. fallback
 * Refreshes automatically on auth state changes because useCurrentUser
 * subscribes to onAuthStateChange.
 */
export function useDisplayName(fallback = "there") {
  const { user } = useCurrentUser();
  const [profileName, setProfileName] = useState<string | null>(null);

  const metaName = (() => {
    const meta = user?.user_metadata as { full_name?: string; name?: string } | null;
    const v = meta?.full_name || meta?.name;
    return v && v.trim() ? v.trim() : null;
  })();

  useEffect(() => {
    let cancelled = false;
    setProfileName(null);
    if (!user?.id || metaName) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const v = data?.full_name?.trim();
        if (v) setProfileName(v);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, metaName]);

  if (!user) return fallback;
  if (metaName) return metaName;
  if (profileName) return profileName;
  if (user.email) return user.email.split("@")[0];
  return fallback;
}

export function firstName(name: string) {
  return name.split(" ")[0] || name;
}
