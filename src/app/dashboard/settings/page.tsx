import { redirect } from 'next/navigation';

/**
 * Settings page removed: org name, phone, address, and email are sourced from
 * GHL location (Business Profile) via the API. Redirect to dashboard.
 */
export default function SettingsPage() {
  redirect('/dashboard');
}
