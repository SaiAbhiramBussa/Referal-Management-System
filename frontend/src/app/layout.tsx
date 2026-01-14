import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rule Flow Builder',
  description: 'Visual rule builder for referral reward system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
