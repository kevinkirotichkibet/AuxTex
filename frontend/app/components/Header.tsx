'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api, isLoggedIn, clearToken } from '@/lib/api';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Re-checks on every route change, since Next's client-side navigation
  // doesn't remount this component — without this, the header would freeze
  // at whatever login state was true when it first mounted.
  useEffect(() => {
    const loggedInNow = isLoggedIn();
    setLoggedIn(loggedInNow);
    if (loggedInNow) {
      api
        .me()
        .then((me) => setIsAdmin(me.roles?.includes('admin') ?? false))
        .catch(() => setIsAdmin(false));
    } else {
      setIsAdmin(false);
    }
  }, [pathname]);

  function handleLogout() {
    clearToken();
    setLoggedIn(false);
    setIsAdmin(false);
    router.push('/');
  }

  return (
    <header className="site-header">
      <Link href="/" className="brand">
        AuxTex Fit
      </Link>
      <nav>
        <Link href="/">Catalog</Link>
        <Link href="/measurements">My Measurements</Link>
        {isAdmin && <Link href="/admin">Admin</Link>}
        {loggedIn ? (
          <button className="nav-logout" onClick={handleLogout}>
            Logout
          </button>
        ) : (
          <Link href="/login">Login</Link>
        )}
      </nav>
    </header>
  );
}
