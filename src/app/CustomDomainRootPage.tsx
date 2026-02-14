/**
 * Shown when a visitor lands on a client's custom domain at the root path (e.g. https://quote.client.com/)
 * with no slug. Intentionally unbranded so the client's customers don't discover CleanQuote.
 */

export default function CustomDomainRootPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <main className="text-center max-w-md">
        <h1 className="text-xl font-semibold text-foreground mb-2">
          This page is not available
        </h1>
        <p className="text-muted-foreground text-sm">
          The link you used may be invalid or expired. Please use the link you received to get your quote.
        </p>
      </main>
    </div>
  );
}
