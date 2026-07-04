// Ambient declaration for the MCP tool files. These files are bundled into a
// Deno Supabase Edge Function at build time (they never ship in the browser
// bundle), so `process.env` is available at runtime. This keeps the app's
// TypeScript project happy without pulling in full @types/node.
declare const process: {
  env: Record<string, string | undefined>;
};
