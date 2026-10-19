export interface SupabaseConfig {
  url: string;
  key: string;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();

  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ''), key };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

export async function supabaseFetch<T>(
  endpoint: string,
  options: RequestInit & { prefer?: string } = {}
): Promise<T> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Supabase credentials are not configured.');
  }

  const { prefer, headers: customHeaders, ...rest } = options;
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${config.url}/rest/v1${cleanPath}`;

  const headers: Record<string, string> = {
    'apikey': config.key,
    'Authorization': `Bearer ${config.key}`,
    'Content-Type': 'application/json',
    ...(prefer ? { 'Prefer': prefer } : {}),
    ...(customHeaders as Record<string, string> || {}),
  };

  const response = await fetch(fullUrl, {
    ...rest,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Supabase PostgREST error (${response.status} ${response.statusText}): ${errorBody}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}
