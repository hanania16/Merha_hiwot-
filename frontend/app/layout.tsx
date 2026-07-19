import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'መርሃ ህይወት ሰ/ቤት | Sunday School Management',
  description: 'Sunday School Management System for Ethiopian Orthodox Sunday School',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
