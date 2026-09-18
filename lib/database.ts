// Vercel-compatible ephemeral store for the prototype. For durable production data,
// connect a Postgres/KV provider through Vercel Storage and replace this adapter.
type Store = { jobs: Map<string,string>; favorites: Map<string,Set<string>> };
const globalStore = globalThis as typeof globalThis & { __boravaga?: Store };
export function database():Store { return globalStore.__boravaga ??= {jobs:new Map(),favorites:new Map()}; }
