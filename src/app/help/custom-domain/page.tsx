import Link from 'next/link';

export default function CustomDomainHelpPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/help" className="hover:text-primary hover:underline">
          Help
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Custom domain for public links</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground">Using a Custom Domain for Your Quote Links</h1>
      <p className="text-muted-foreground">
        To use your own domain (e.g. <code className="bg-muted px-1 rounded">quote.yourcompany.com</code>) for survey links and the embed snippet, enter it in the Public link base URL field and click Save. CleanQuote adds your domain automatically and shows you the DNS records to add at your registrar.
      </p>

      <h2 className="text-lg font-semibold text-foreground mt-8">1. Set your custom domain and save</h2>
      <p className="text-foreground">
        In CleanQuote, go to <strong className="text-foreground">Dashboard</strong> → <strong className="text-foreground">Tools</strong> → your tool → <strong className="text-foreground">Overview</strong>. Enter your custom domain (e.g. <code className="bg-muted px-1 rounded">https://quote.yourcompany.com</code>) in <strong className="text-foreground">Public link base URL</strong> and click <strong className="text-foreground">Save</strong>. CleanQuote adds your domain automatically and displays the DNS records you need.
      </p>

      <h2 className="text-lg font-semibold text-foreground mt-8">2. Add DNS records at your domain registrar</h2>
      <p className="text-foreground">
        Add one of these records where you manage DNS (e.g. GoDaddy, Namecheap, Cloudflare). Use the exact values shown when you save — Vercel may provide project-specific values.
      </p>
      <p className="text-sm font-medium text-foreground mt-3">Record format:</p>
      <ul className="list-disc list-inside space-y-1 text-foreground ml-2 mt-1 space-y-1 text-sm">
        <li><strong className="text-foreground">Type:</strong> CNAME or A</li>
        <li><strong className="text-foreground">Host:</strong> Your subdomain (e.g. <code className="bg-muted px-1 rounded">main2</code> for main2.cleanquote.io)</li>
        <li><strong className="text-foreground">Value:</strong> From Vercel (e.g. <code className="bg-muted px-1 rounded">xxx.vercel-dns.com</code> for CNAME, or an IP for A)</li>
        <li><strong className="text-foreground">TTL:</strong> 60 or lowest available</li>
      </ul>
      <p className="text-sm text-muted-foreground mt-2">
        Wait for DNS propagation (usually 5–60 minutes). SSL is provisioned automatically.
      </p>
      <p className="text-sm text-amber-700 dark:text-amber-300 mt-2 p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
        <strong className="text-foreground">If Vercel shows &quot;DNS Change Recommended&quot;</strong> in your project&apos;s Domains settings (Vercel Dashboard → your project → Settings → Domains), use the <strong className="text-foreground">CNAME value shown there</strong> (e.g. <code className="bg-muted px-1 rounded">xxx.vercel-dns-016.com</code>). That value overrides the one shown in CleanQuote and is required for the link to work.
      </p>

      <h2 className="text-lg font-semibold text-foreground mt-8">3. Verify after DNS propagates</h2>
      <p className="text-foreground">
        Once DNS has propagated (usually 5–60 minutes), visit <code className="bg-muted px-1 rounded">https://quote.yourcompany.com</code> (use your actual domain). You should see the CleanQuote app. The survey link, quote result link, and embed snippet will all use your custom domain. If not, wait longer for propagation or contact support.
      </p>

      <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">Important</p>
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Add the DNS records at your registrar (step 2) and wait for propagation before your custom domain will work. The domain is added to CleanQuote automatically when you save. If you clear the field or leave it blank, links will use this site instead.
        </p>
      </div>

      <p className="mt-6">
        <Link href="/help" className="text-primary underline hover:no-underline">
          ← Back to setup guides
        </Link>
      </p>
    </article>
  );
}
