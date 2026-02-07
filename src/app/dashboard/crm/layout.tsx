import Link from 'next/link';

export default function CRMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <nav className="flex gap-4 border-b border-border pb-2">
        <Link
          href="/dashboard/crm"
          className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
        >
          Pipeline
        </Link>
        <Link
          href="/dashboard/crm/contacts"
          className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
        >
          Contacts
        </Link>
        <Link
          href="/dashboard/crm/schedule"
          className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
        >
          Schedule
        </Link>
      </nav>
      {children}
    </div>
  );
}
