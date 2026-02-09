import { redirect } from 'next/navigation';

/**
 * CleanQuote uses GoHighLevel for access. No separate sign-up; open the app from GHL.
 */
export default function SignupPage() {
  redirect('/open-from-ghl');
}
