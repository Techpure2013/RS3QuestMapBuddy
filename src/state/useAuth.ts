import { useEffect, useState, useCallback } from "react";
import { fetchMe, logout } from "./../api/auth";

export function useAuth() {
  const [isAuthed, setAuthed] = useState<boolean>(false);
  const [email, setEmail] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    const me = await fetchMe();
    setAuthed(me.ok);
    setEmail(me.email);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await logout();
    await refresh();
  }, [refresh]);

  return { isAuthed, email, refresh, signOut };
}
