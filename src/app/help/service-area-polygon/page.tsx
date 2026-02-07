import Link from 'next/link';
import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Service area polygon and ZIP codes',
  description:
    'Add service areas by US ZIP code or draw polygons in CleanQuote. Create and upload KML from Google My Maps, or add zones from ZIP codes when drawing.',
};

export default function ServiceAreaPolygonHelpPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <BreadcrumbJsonLd items={[{ name: 'Home', path: '/' }, { name: 'Help', path: '/help' }, { name: 'Service area polygon and ZIP codes', path: '/help/service-area-polygon' }]} />
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/help" className="hover:text-primary hover:underline">
          Help
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Service area polygon and ZIP codes</span>
      </nav>

      <h1 className="text-2xl font-bold text-foreground">Service Areas: ZIP Codes and Polygons</h1>
      <p className="text-muted-foreground">
        You can add service areas in two ways: <strong className="text-foreground">Add by ZIP code</strong> (quick, uses US Census boundaries) or <strong className="text-foreground">draw/upload polygons</strong> (KML or draw on the map). You can also mix both—e.g. draw a polygon and add extra zones from ZIP codes in the same map.
      </p>

      <h2 className="text-lg font-semibold text-foreground mt-8">Quick option: Add by ZIP code</h2>
      <ol className="list-decimal list-inside space-y-2 text-foreground">
        <li>
          Go to <strong className="text-foreground">Dashboard</strong> → <strong className="text-foreground">Service areas</strong>.
        </li>
        <li>
          Click <strong className="text-foreground">Add by ZIP code</strong>.
        </li>
        <li>
          Enter a 5-digit US ZIP code. CleanQuote fetches the boundary (Census ZCTA) and creates a service area from it.
        </li>
        <li>
          You can also <strong className="text-foreground">Draw new area</strong> to sketch a polygon on the map, or open an existing area and use <strong className="text-foreground">Add zone from ZIP code</strong> inside the Draw/Edit modal to add more zones (ZIPs or drawn shapes) to the same map.
        </li>
      </ol>

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

      <h2 className="text-lg font-semibold text-foreground mt-8">4. Upload to CleanQuote (or draw on the map)</h2>
      <ol className="list-decimal list-inside space-y-2 text-foreground">
        <li>
          In CleanQuote, go to <strong className="text-foreground">Dashboard</strong> → <strong className="text-foreground">Service areas</strong>. Service areas are org-level; you assign which area(s) a tool uses in <strong className="text-foreground">Tool</strong> → <strong className="text-foreground">Settings</strong> → <strong className="text-foreground">Service Area(s)</strong>.
        </li>
        <li>
          To use a KML file: open an area (or create one with <strong className="text-foreground">Draw new area</strong>), then find the upload option to replace or add polygon data from your KML/KMZ file.
        </li>
        <li>
          Alternatively, use <strong className="text-foreground">Add by ZIP code</strong> for a single ZIP, or draw on the map and use <strong className="text-foreground">Add zone from ZIP code</strong> in the Draw/Edit modal to mix drawn polygons with ZIP-based zones.
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
