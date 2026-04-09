# WebSearch Tool Usage Guide

## Overview

This workspace deploys the upstream `mrkrsl/web-search-mcp` server locally and provides a small validation client for practical use.

Relevant local paths:
- `application\web-search-mcp`: upstream server source and build output
- `application\web-search-mcp-wrapper.mjs`: local wrapper that redirects startup logs to `stderr`
- `application\run-aigc-search.mjs`: example stdio client used for validation
- `application\test-output\aigc-search-results.json`: structured validation result
- `application\test-output\aigc-search-results.txt`: human-readable validation result

## Requirements

- Node.js 18+
- npm 8+
- Playwright browsers installed locally

## Deployment steps

Open PowerShell in `application\web-search-mcp` and run:

```powershell
npm install
npx playwright install chromium firefox
npm run build
```

## Why the local wrapper is needed

The upstream server writes startup logs to `stdout`. Strict MCP stdio clients expect protocol JSON on `stdout`, so ordinary logs can break the connection.

Use `application\web-search-mcp-wrapper.mjs` as the launched entrypoint when you need a reliable stdio MCP session. The wrapper redirects ordinary logs to `stderr` and then loads `application\web-search-mcp\dist\index.js`.

## Available tools

### `get-web-search-summaries`
Use this for fast result collection.

Recommended when:
- you want candidate sources quickly
- you are collecting links or market reports
- full-page extraction is not required

Example query used in this workspace:
- `AIGC 2026 trends applications regulation`

Validated result:
- returned 5 results, including Springer and market-report pages related to AIGC

### `full-web-search`
Use this when you want the server to follow result links and extract full page content.

Recommended when:
- you need article body text
- you want consolidated content from top results
- the search engine response is stable enough for extraction

Observed limitation in this workspace:
- the query `AIGC latest trends applications regulation 2026` returned `0` results during validation because Bing parsing and fallback engines were unstable for that run

### `get-single-web-page-content`
Use this when you already have a URL and only need the content of that page.

Recommended when:
- summaries already gave you a good source URL
- you want to avoid a second search step

## Running the validated local client

From `application\` run:

```powershell
node .\run-aigc-search.mjs
```

This client will:
- connect to the local MCP server over stdio
- list available tools
- call `get-web-search-summaries`
- call `full-web-search`
- save outputs into `application\test-output\`

## Practical usage suggestions

1. Start with `get-web-search-summaries`.
2. Review the returned URLs and titles.
3. If one source is clearly useful, call `get-single-web-page-content` on that URL.
4. Use `full-web-search` only when you really want multi-page extraction in one run.
5. If `full-web-search` returns no results, inspect `application\test-output\aigc-search-results.txt` or the JSON file for stderr diagnostics.

## Example AIGC sources found during validation

- Springer article on AIGC in biomedical research, healthcare delivery, and clinical practice
- Global Market Insights AIGC market report
- Springer article on AIGC-driven human-machine intelligence in ITS
- 360iResearch AIGC applications market page
- Data Insights Market AIGC large model report

## Known issues

- Upstream startup logging must be redirected away from `stdout` for reliable stdio MCP use.
- Search engine page structure can change, which may cause parsing gaps.
- Brave and DuckDuckGo fallback requests may time out depending on network conditions.
- Summary search is currently more reliable than full-content extraction for this workspace.
