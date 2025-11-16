import { useEffect, useState, useCallback } from "react";
import { fetchMe, logout as apiLogout } from "../api/auth";

const AUTH_EVENT = "rs3qb:auth-changed";

export function useAuth() {
  const [isAuthed, setAuthed] = useState<boolean>(false);
  const [email, setEmail] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    const me = await fetchMe();
    setAuthed(me.ok);
    setEmail(me.email);
    window.dispatchEvent(
      new CustomEvent(AUTH_EVENT, { detail: { ok: me.ok, email: me.email } })
    );
    return me.ok;
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    const onAuthChanged = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener(AUTH_EVENT, onAuthChanged as EventListener);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(AUTH_EVENT, onAuthChanged as EventListener);
    };
  }, [refresh]);

  const signOut = useCallback(async () => {
    await apiLogout();
    setAuthed(false);
    setEmail(undefined);
    window.dispatchEvent(
      new CustomEvent(AUTH_EVENT, { detail: { ok: false, email: undefined } })
    );
    void refresh();
  }, [refresh]);

  return { isAuthed, email, refresh, signOut };
}
