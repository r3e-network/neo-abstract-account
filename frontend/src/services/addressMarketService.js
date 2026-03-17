import { getSupabaseClient } from '@/lib/supabaseClient.js';

const STORAGE_KEY = 'aa_address_market_listings';
const TABLE_NAME = 'aa_address_market_listings';

function nowIso() {
  return new Date().toISOString();
}

function generateListingId() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `listing-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readLocalListings() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeLocalListings(listings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
}

function normalizeListing(input = {}) {
  return {
    id: input.id || generateListingId(),
    account_address: String(input.account_address || '').trim(),
    seller_address: String(input.seller_address || '').trim(),
    buyer_address: String(input.buyer_address || '').trim(),
    title: String(input.title || '').trim(),
    price_gas: String(input.price_gas || '').trim(),
    network: String(input.network || 'neo-n3').trim(),
    verifier_profile: String(input.verifier_profile || '').trim(),
    hook_profile: String(input.hook_profile || '').trim(),
    notes: String(input.notes || '').trim(),
    status: String(input.status || 'active').trim(),
    created_at: input.created_at || nowIso(),
    updated_at: nowIso(),
  };
}

async function listFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from(TABLE_NAME)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data.map(normalizeListing) : [];
}

async function upsertToSupabase(listing) {
  const client = getSupabaseClient();
  if (!client) return false;
  const { error } = await client.from(TABLE_NAME).upsert(listing, { onConflict: 'id' });
  if (error) throw error;
  return true;
}

export async function listAddressListings() {
  try {
    const remote = await listFromSupabase();
    if (remote) {
      writeLocalListings(remote);
      return remote;
    }
  } catch {
    // fall through to local cache
  }
  return readLocalListings().map(normalizeListing).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

export async function createAddressListing(input) {
  const listing = normalizeListing(input);
  try {
    const saved = await upsertToSupabase(listing);
    if (saved) return listing;
  } catch {
    // fall through to local cache
  }
  const next = [listing, ...readLocalListings().map(normalizeListing)];
  writeLocalListings(next);
  return listing;
}

export async function buyAddressListing(id, buyerAddress) {
  const listings = readLocalListings().map(normalizeListing);
  const target = listings.find((item) => item.id === id);
  if (!target) throw new Error('Listing not found');
  const next = normalizeListing({ ...target, buyer_address: buyerAddress, status: 'reserved' });
  try {
    const saved = await upsertToSupabase(next);
    if (saved) return next;
  } catch {
    // fall through to local cache
  }
  writeLocalListings(listings.map((item) => (item.id === id ? next : item)));
  return next;
}

export async function cancelAddressListing(id) {
  const listings = readLocalListings().map(normalizeListing);
  const target = listings.find((item) => item.id === id);
  if (!target) throw new Error('Listing not found');
  const next = normalizeListing({ ...target, status: 'cancelled' });
  try {
    const saved = await upsertToSupabase(next);
    if (saved) return next;
  } catch {
    // fall through to local cache
  }
  writeLocalListings(listings.map((item) => (item.id === id ? next : item)));
  return next;
}
