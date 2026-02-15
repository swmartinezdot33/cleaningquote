# Browser Tools MCP – connect so we can get the GHL sidebar code right

Use this to let Cursor see your GHL page and the exact DOM (sidebar, CleanQuote row, insertion point).

## 1. Connector server (already running)

The **Browser Tools Server** runs on **port 3025**. Start it if needed:

```bash
npx @agentdeskai/browser-tools-server@latest
```

You should see: `Aggregator listening on http://0.0.0.0:3025` and `http://localhost:3025`.

## 2. Chrome extension

1. Download the extension: [BrowserTools v1.2.0 (zip)](https://github.com/AgentDeskAI/browser-tools-mcp/releases/download/v1.2.0/BrowserTools-1.2.0-extension.zip)
2. Unzip, open Chrome → `chrome://extensions/` → **Developer mode** ON → **Load unpacked** → select the unzipped folder.
3. Open the extension (click its icon). It should connect to `http://localhost:3025`. If it asks for a URL, use `http://localhost:3025`.

## 3. Cursor MCP config

In Cursor: **Settings → MCP** (or Cursor Settings → **Features → MCP**). Add a server like:

```json
{
  "browser-tools": {
    "command": "npx",
    "args": ["-y", "@agentdeskai/browser-tools-mcp@latest"]
  }
}
```

Restart Cursor or reload MCPs so the tools (screenshot, getSelectedElement, etc.) show up.

## 4. Use it to get the code right

1. Keep the **connector server** running (terminal with `npx @agentdeskai/browser-tools-server@latest`).
2. In **Chrome** with the extension: go to your **GHL dashboard** (sidebar with CleanQuote.io visible).
3. **Inspect** the sidebar: right‑click the CleanQuote.io menu item or the container where it should sit → **Inspect**. Optionally use the extension’s “Select element” so the **selected element** is that node.
4. In Cursor, say you’re **ready** or **connected**. The AI can then use **takeScreenshot** and **getSelectedElement** to see the exact structure and tell you where to insert code (selectors, parent, prepend/insertBefore).

## Troubleshooting

- **“Failed to discover browser connector server”**  
  Start the server: `npx @agentdeskai/browser-tools-server@latest` and ensure the Chrome extension is connected to `http://localhost:3025`.

- **Extension won’t connect**  
  Confirm nothing else is using port 3025 and that you’re using `http://localhost:3025` in the extension.

- **MCP tools not in Cursor**  
  Check the `browser-tools` entry in MCP settings and restart Cursor.
