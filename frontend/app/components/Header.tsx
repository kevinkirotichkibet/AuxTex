'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, clearToken } from '@/lib/api';
import { useLoggedIn } from '@/lib/useAuth';

export default function Header() {
  const router = useRouter();
  const loggedIn = useLoggedIn();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (loggedIn) {
      api
        .me()
        .then((me) => setIsAdmin(me.roles?.includes('admin') ?? false))
        .catch(() => setIsAdmin(false));
    } else {
      setIsAdmin(false);
    }
  }, [loggedIn]);

  function handleLogout() {
    clearToken();
    router.push('/');
    router.refresh();
  }

  return (
    <header className="site-header">
      <Link href="/" className="brand">
        AuxTex Fit
      </Link>
      <nav>
        <Link href="/">Catalog</Link>
        <Link href="/measurements">My Measurements</Link>
        {loggedIn && <Link href="/orders">My Orders</Link>}
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
