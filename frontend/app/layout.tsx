import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'AuxTex Fit',
  description: 'Made-to-measure garments, tailored to you.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            AuxTex Fit
          </Link>
          <nav>
            <Link href="/">Catalog</Link>
            <Link href="/measurements">My Measurements</Link>
            <Link href="/login">Login</Link>
          </nav>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <p style={{ margin: 0 }}>AuxTex Fit — made-to-measure garments, cut to your exact shape.</p>
        </footer>
      </body>
    </html>
  );
}
