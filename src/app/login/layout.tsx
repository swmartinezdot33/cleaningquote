import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Log in to CleanQuote.io — cleaning quote software for cleaning companies.',
  robots: { index: false, follow: true },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
