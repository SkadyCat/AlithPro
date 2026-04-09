import fs from 'node:fs/promises';
import path from 'node:path';
import { Client } from './web-search-mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StdioClientTransport } from './web-search-mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
import { ListToolsResultSchema, CallToolResultSchema } from './web-search-mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/types.js';

const appDir = process.cwd();
const outDir = path.join(appDir, 'test-output');
const serverPath = path.join(appDir, 'web-search-mcp-wrapper.mjs');
const transport = new StdioClientTransport({
  command: 'node',
  args: [serverPath],
  cwd: path.join(appDir, 'web-search-mcp'),
  stderr: 'pipe',
  env: {
    ...process.env,
    BROWSER_HEADLESS: 'true',
    MAX_BROWSERS: '2',
    DEFAULT_TIMEOUT: '6000',
    MAX_CONTENT_LENGTH: '12000'
  }
});
const stderrChunks = [];
transport.stderr?.on('data', chunk => stderrChunks.push(chunk.toString()));
const client = new Client({ name: 'websearch-validation-client', version: '1.0.0' });
client.onerror = (error) => console.error('CLIENT_ERROR', error);

async function run() {
  await fs.mkdir(outDir, { recursive: true });
  await client.connect(transport);

  const tools = await client.request({ method: 'tools/list', params: {} }, ListToolsResultSchema);
  const summaries = await client.request({
    method: 'tools/call',
    params: {
      name: 'get-web-search-summaries',
      arguments: { query: 'AIGC 2026 trends applications regulation', limit: 5 }
    }
  }, CallToolResultSchema);

  const full = await client.request({
    method: 'tools/call',
    params: {
      name: 'full-web-search',
      arguments: {
        query: 'AIGC latest trends applications regulation 2026',
        limit: 3,
        includeContent: true,
        maxContentLength: 3000
      }
    }
  }, CallToolResultSchema);

  const payload = {
    timestamp: new Date().toISOString(),
    tools,
    summaries,
    full,
    stderr: stderrChunks.join('')
  };

  await fs.writeFile(path.join(outDir, 'aigc-search-results.json'), JSON.stringify(payload, null, 2), 'utf8');
  const textBlocks = [];
  for (const block of summaries.content ?? []) {
    if (block.type === 'text') textBlocks.push('## Summaries\n' + block.text);
  }
  for (const block of full.content ?? []) {
    if (block.type === 'text') textBlocks.push('## Full Search\n' + block.text);
  }
  if (stderrChunks.length) {
    textBlocks.push('## Server stderr\n' + stderrChunks.join(''));
  }
  await fs.writeFile(path.join(outDir, 'aigc-search-results.txt'), textBlocks.join('\n\n'), 'utf8');
  console.log(JSON.stringify({
    toolNames: tools.tools.map(t => t.name),
    summaryPreview: (summaries.content?.find(x => x.type === 'text')?.text || '').slice(0, 800),
    fullPreview: (full.content?.find(x => x.type === 'text')?.text || '').slice(0, 1200),
    stderr: stderrChunks.join('').slice(0, 1200)
  }, null, 2));

  await transport.close();
}

run().catch(async (error) => {
  console.error(error);
  try { await transport.close(); } catch {}
  process.exit(1);
});

