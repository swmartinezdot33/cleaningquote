import { redirect } from 'next/navigation';

/** Legacy route: Team/Settings removed; redirect to dashboard. */
export default function TeamPage() {
  redirect('/dashboard');
}
