import { redirect } from 'next/navigation';

/** Legacy route: Team was renamed to Settings. */
export default function TeamPage() {
  redirect('/dashboard/settings');
}
