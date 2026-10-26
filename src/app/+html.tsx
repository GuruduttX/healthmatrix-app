import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

import { Colors } from '@/constants/theme';

// Web only: the HTML shell around every page. Keeps the page light themed and
// stops anything wider than the viewport from making the page scroll sideways.
const css = `
html { color-scheme: light; }
body { background-color: ${Colors.background}; overflow-x: hidden; }
`;

// Since SDK 58 the page is rendered on each request: the router's own head and body additions
// (metadata, scripts) come from the server document and must be placed, or the page won't hydrate.
export default function Root({ children }: PropsWithChildren) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();
  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content={Colors.background} />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: css }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
