'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isLoggedIn } from './api';

// A plain `isLoggedIn()` call in render only reflects whatever was true
// when the component first mounted. If the account changes underneath it —
// another tab logs in as someone else, since localStorage is shared across
// tabs on the same origin — a still-mounted page won't know, and can go on
// showing data fetched for the previous account. This hook re-checks on
// every navigation AND on cross-tab storage changes, so identity switches
// are always picked up before any account-scoped data is displayed.
export function useLoggedIn(): boolean {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, [pathname]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'token' || e.key === null) setLoggedIn(isLoggedIn());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return loggedIn;
}
