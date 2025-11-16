import { useEffect, useState, useCallback, useRef } from "react";
import { fetchMe, logout as apiLogout } from "../api/auth";

const AUTH_EVENT = "rs3qb:auth-changed";

export function useAuth() {
  const [isAuthed, setAuthed] = useState<boolean>(false);
  const [email, setEmail] = useState<string | undefined>(undefined);

  // prevent concurrent refreshes
  const inFlightRef = useRef<Promise<boolean> | null>(null);
  // cooldown for failed attempts to avoid hammering
  const nextAllowedAtRef = useRef<number>(0);
  // avoid trigger cascades (focus/event)
  const lastChangedAtRef = useRef<number>(0);

  const refresh = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    if (now < nextAllowedAtRef.current) {
      // within cooldown, return current state
      return isAuthed;
    }

    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    const p = (async () => {
      const me = await fetchMe();
      setAuthed(me.ok);
      setEmail(me.email);

      // broadcast only if state meaningfully changed
      const changed = me.ok !== isAuthed || me.email !== email;
      if (changed) {
        lastChangedAtRef.current = Date.now();
        window.dispatchEvent(
          new CustomEvent(AUTH_EVENT, {
            detail: { ok: me.ok, email: me.email },
          })
        );
      }

      // if failure, set a short cooldown (1s)
      if (!me.ok) {
        nextAllowedAtRef.current = Date.now() + 1000;
      } else {
        nextAllowedAtRef.current = 0;
      }

      return me.ok;
    })();

    inFlightRef.current = p;
    try {
      return await p;
    } finally {
      inFlightRef.current = null;
    }
  }, [isAuthed, email]);

  useEffect(() => {
    void refresh();

    const onFocus = () => {
      // avoid immediate focus storms if state just changed
      if (Date.now() - lastChangedAtRef.current < 300) return;
      void refresh();
    };

    const onAuthChanged = () => {
      if (Date.now() - lastChangedAtRef.current < 300) return;
      void refresh();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener(AUTH_EVENT, onAuthChanged as EventListener);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(AUTH_EVENT, onAuthChanged as EventListener);
    };
  }, [refresh]);

  const signOut = useCallback(async () => {
    // clear server cookie (ignore network errors)
    await apiLogout();

    // immediate local flip (hide panels now)
    setAuthed(false);
    setEmail(undefined);
    lastChangedAtRef.current = Date.now();
    window.dispatchEvent(
      new CustomEvent(AUTH_EVENT, { detail: { ok: false, email: undefined } })
    );

    // clear any in-flight and set a short cooldown to prevent thundering herd
    inFlightRef.current = null;
    nextAllowedAtRef.current = Date.now() + 500;

    // revalidate once after a tick (in case proxy/cookie timing)
    setTimeout(() => {
      void refresh();
    }, 200);
  }, [refresh]);

  return { isAuthed, email, refresh, signOut };
}
