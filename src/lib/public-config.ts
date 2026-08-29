import 'server-only';

// Explicit allowlist: never serialize the server environment into the page.
export function publicSupabaseConfig(env: Record<string, string | undefined> = process.env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  try {
    if (new URL(url).protocol !== 'https:') return null;
    const publishable = anonKey.startsWith('sb_publishable_');
    const anon = !publishable && JSON.parse(Buffer.from(anonKey.split('.')[1], 'base64url').toString()).role === 'anon';
    if (!publishable && !anon) return null;
    return { url, anonKey };
  } catch {
    return null;
  }
}
