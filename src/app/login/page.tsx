import { redirect } from 'next/navigation';

/**
 * CleanQuote uses GoHighLevel for sign-in. No separate Next/Supabase login.
 * Redirect to the "open from GHL" page so users open the app from their GHL dashboard.
 */
export default function LoginPage() {
  redirect('/open-from-ghl');
}
