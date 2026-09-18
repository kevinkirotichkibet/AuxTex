'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { api, clearToken } from '@/lib/api';
import { useLoggedIn } from '@/lib/useAuth';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const loggedIn = useLoggedIn();
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Close the mobile menu automatically whenever navigation happens.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function handleLogout() {
    clearToken();
    router.push('/');
    router.refresh();
  }

  return (
    <header className="site-header">
      <div className="site-header-row">
        <Link href="/" className="brand">
          AuxTex Fit
        </Link>
        <button
          className="menu-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        <nav className="desktop-nav">
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
      </div>

      {menuOpen && (
        <nav className="mobile-nav">
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
      )}
    </header>
  );
}
