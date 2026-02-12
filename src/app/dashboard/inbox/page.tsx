'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Inbox has moved to CRM. Redirect so old links and nav work.
 */
export default function InboxRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/crm/inbox');
  }, [router]);
  return null;
}
