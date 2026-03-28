import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, sanitizeError } from './rateLimiter.js';

function getServiceSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const rate = await checkRateLimit(clientIp);
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfter || 60));
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  const supabase = getServiceSupabaseClient();
  if (!supabase) return res.status(500).json({ error: 'Service unavailable' });

  const { action } = req.body || {};

  try {
    if (action === 'get') {
      const { accountIdHash } = req.body;
      if (!accountIdHash) return res.status(400).json({ error: 'accountIdHash required' });

      const { data, error } = await supabase
        .from('aa_account_metadata')
        .select('description, logo_url, metadata_uri, updated_at')
        .eq('account_id_hash', accountIdHash)
        .maybeSingle();

      if (error) throw error;
      return res.status(200).json({ ok: true, metadata: data || { description: '', logo_url: '', metadata_uri: '', updated_at: null } });
    }

    if (action === 'getBatch') {
      const { accountIdHashes } = req.body;
      if (!Array.isArray(accountIdHashes) || accountIdHashes.length === 0) {
        return res.status(400).json({ error: 'accountIdHashes array required' });
      }
      if (accountIdHashes.length > 50) {
        return res.status(400).json({ error: 'Maximum 50 hashes per batch' });
      }

      const { data, error } = await supabase
        .from('aa_account_metadata')
        .select('account_id_hash, description, logo_url, metadata_uri')
        .in('account_id_hash', accountIdHashes);

      if (error) throw error;

      const map = {};
      for (const row of data || []) {
        map[row.account_id_hash] = { description: row.description, logo_url: row.logo_url, metadata_uri: row.metadata_uri };
      }
      return res.status(200).json({ ok: true, map });
    }

    if (action === 'upsert') {
      const { accountIdHash, description, logoUrl, metadataUri } = req.body;
      if (!accountIdHash) return res.status(400).json({ error: 'accountIdHash required' });

      const sanitized = {
        account_id_hash: accountIdHash,
        description: String(description || '').slice(0, 500),
        logo_url: String(logoUrl || '').slice(0, 500),
        metadata_uri: String(metadataUri || '').slice(0, 240),
        updated_at: new Date().toISOString(),
      };

      if (sanitized.logo_url && !sanitized.logo_url.startsWith('https://')) {
        return res.status(400).json({ error: 'logo_url must be HTTPS' });
      }

      const { error } = await supabase
        .from('aa_account_metadata')
        .upsert(sanitized, { onConflict: 'account_id_hash' });

      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('[account-metadata]', err);
    return res.status(500).json({ error: sanitizeError(err) });
  }
}
