import { Html, Head, Main, NextScript } from 'next/document';

/**
 * Required by Next.js build when pages directory exists.
 * This app uses App Router (src/app); _document here satisfies the build loader.
 */
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
