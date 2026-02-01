#!/usr/bin/env node
// DEPRECATED WRAPPER
// Render still calls server-new.cjs; delegate to server.cjs so we keep one
// authoritative Express app with all routes registered.

console.warn('⚠️  server-new.cjs is deprecated. Forwarding to server.cjs.');

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('./server.cjs');