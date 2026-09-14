import type { Metadata } from 'next';
import './globals.css';
import Header from './components/Header';

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
        <Header />
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <p style={{ margin: 0 }}>AuxTex Fit — made-to-measure garments, cut to your exact shape.</p>
        </footer>
      </body>
    </html>
  );
}
