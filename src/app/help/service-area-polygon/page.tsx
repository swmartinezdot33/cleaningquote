import Link from 'next/link';

export default function ServiceAreaPolygonHelpPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/help" className="hover:text-primary hover:underline">
          Help
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Service area polygon in Google</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground">How to Make and Draw a Service Area Polygon in Google</h1>
      <p className="text-muted-foreground">
        Use this guide to create a service area polygon in Google My Maps, export it as KML, and upload it to CleanQuote so you can qualify leads by location before they complete the quote form.
      </p>

      <h2 className="text-lg font-semibold text-foreground mt-8">1. Create or open a map in Google My Maps</h2>
      <ol className="list-decimal list-inside space-y-2 text-foreground">
        <li>
          Go to <a href="https://mymaps.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">Google My Maps</a> and sign in with your Google account.
        </li>
        <li>
          Click <strong className="text-foreground">Create a new map</strong> or open an existing one.
        </li>
        <li>
          Give your map a title (e.g., &quot;Service Area&quot;) in the left panel.
        </li>
      </ol>

      <h2 className="text-lg font-semibold text-foreground mt-8">2. Draw the polygon (your service area)</h2>
      <ol className="list-decimal list-inside space-y-2 text-foreground">
        <li>
          Below the search bar, click <strong className="text-foreground">Draw a line</strong> (the line/shape icon) and choose <strong className="text-foreground">Add line or shape</strong>.
        </li>
        <li>
          Select the layer you want the shape on (or use the default &quot;Untitled layer&quot;).
        </li>
        <li>
          Click on the map where you want the first corner of your service area. Then click each corner or bend of your polygon.
        </li>
        <li>
          To move the map while drawing, click and hold the mouse, then drag.
        </li>
        <li>
          When you&apos;ve drawn all corners, double-click or connect back to the starting point to close the shape.
        </li>
        <li>
          Give your shape a name (e.g., &quot;Service Area&quot;) and click <strong className="text-foreground">Save</strong>.
        </li>
      </ol>

      <h2 className="text-lg font-semibold text-foreground mt-8">3. Export to KML</h2>
      <ol className="list-decimal list-inside space-y-2 text-foreground">
        <li>
          In the left panel, click the three-dot <strong className="text-foreground">Menu</strong>.
        </li>
        <li>
          Select <strong className="text-foreground">Export to KML/KMZ</strong>.
        </li>
        <li>
          Choose whether to export the whole map or specific layers, then download. CleanQuote supports both <strong className="text-foreground">.kml</strong> and <strong className="text-foreground">.kmz</strong> files.
        </li>
      </ol>

      <h2 className="text-lg font-semibold text-foreground mt-8">4. Upload to CleanQuote</h2>
      <ol className="list-decimal list-inside space-y-2 text-foreground">
        <li>
          In CleanQuote, go to <strong className="text-foreground">Admin</strong> → <strong className="text-foreground">Settings</strong>, or <strong className="text-foreground">Dashboard</strong> → <strong className="text-foreground">Tools</strong> → your tool → <strong className="text-foreground">Settings</strong>.
        </li>
        <li>
          Find the <strong className="text-foreground">Service Area Configuration</strong> card and expand it.
        </li>
        <li>
          Click to select your KML or KMZ file (or drag and drop it).
        </li>
        <li>
          Click <strong className="text-foreground">Upload Polygon</strong>.
        </li>
      </ol>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Direct KML vs NetworkLink</p>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li><strong className="text-foreground">Direct KML</strong> — Your polygon is stored once. Re-upload if you change the map.</li>
          <li><strong className="text-foreground">NetworkLink</strong> — If you export a KML that links to a remote source, CleanQuote can fetch updates automatically so you don&apos;t need to re-upload when your map changes.</li>
        </ul>
      </div>

      <p className="mt-6">
        <Link href="/help" className="text-primary underline hover:no-underline">
          ← Back to setup guides
        </Link>
      </p>
    </article>
  );
}
