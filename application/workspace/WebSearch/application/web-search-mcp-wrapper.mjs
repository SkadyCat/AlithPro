const originalLog = console.log.bind(console);
console.log = (...args) => console.error(...args);
console.info = (...args) => console.error(...args);
await import('./web-search-mcp/dist/index.js');
