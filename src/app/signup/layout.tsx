import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign up',
  description: 'Sign up for CleanQuote.io — cleaning quote software. Start your 14-day free trial.',
  robots: { index: false, follow: true },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
