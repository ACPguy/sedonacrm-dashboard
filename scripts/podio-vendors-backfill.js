#!/usr/bin/env node
/**
 * Podio → Supabase vendors.podio_id backfill
 *
 * Dry run (default):  node scripts/podio-vendors-backfill.js
 * Write mode:         node scripts/podio-vendors-backfill.js --write
 *
 * Requires in .env.local: PODIO_CLIENT_ID, PODIO_CLIENT_SECRET, PODIO_APP_ID, PODIO_APP_TOKEN
 * Also reads: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const path = require('path');
const fs = require('fs');

// Parse .env.local manually (dotenv not installed)
const envPath = path.join(__dirname, '../.env.local');
const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const k = trimmed.slice(0, eq);
  const v = trimmed.slice(eq + 1).replace(/^["']|["']$/g, '');
  if (!(k in process.env)) process.env[k] = v;
}

const { createClient } = require(path.join(__dirname, '../node_modules/@supabase/supabase-js'));

const WRITE_MODE = process.argv.includes('--write');

const {
  PODIO_CLIENT_ID, PODIO_CLIENT_SECRET, PODIO_APP_ID, PODIO_APP_TOKEN,
  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

for (const [k, v] of Object.entries({ PODIO_CLIENT_ID, PODIO_CLIENT_SECRET, PODIO_APP_ID, PODIO_APP_TOKEN, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY })) {
  if (!v) { console.error(`Missing env var: ${k}`); process.exit(1); }
}

// ── Podio auth (app authentication) ─────────────────────────────────────────

async function getPodioToken() {
  const body = new URLSearchParams({
    grant_type: 'app',
    client_id: PODIO_CLIENT_ID,
    client_secret: PODIO_CLIENT_SECRET,
    app_id: PODIO_APP_ID,
    app_token: PODIO_APP_TOKEN,
  });

  const res = await fetch('https://podio.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Podio auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

// ── Fetch all Podio vendor items (paginated) ──────────────────────────────────

async function fetchAllPodioVendors(token) {
  const items = [];
  const limit = 500;
  let offset = 0;

  while (true) {
    const url = `https://api.podio.com/item/app/${PODIO_APP_ID}/?limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { Authorization: `OAuth2 ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Podio items fetch failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    const batch = data.items || [];
    items.push(...batch);

    console.log(`  Fetched ${items.length} Podio items so far (offset ${offset}, got ${batch.length})…`);

    if (batch.length < limit) break;
    offset += limit;
  }

  return items;
}

// ── Extract company_dba from a Podio item ─────────────────────────────────────
// item.title is a calculated field with extra suffix — not usable for matching.
// The real "Company DBA" field has external_id "company-name" (field_id 78007515).

function extractCompanyDba(item) {
  const field = (item.fields || []).find(f => f.external_id === 'company-name');
  if (field && field.values && field.values.length > 0) {
    return String(field.values[0].value || '').trim();
  }
  return '';
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== Podio → Supabase vendors.podio_id backfill ===`);
  console.log(`Mode: ${WRITE_MODE ? '⚠️  WRITE' : 'DRY RUN (read-only)'}\n`);

  // 1. Auth
  console.log('Authenticating with Podio…');
  const token = await getPodioToken();
  console.log('  ✓ Token obtained\n');

  // 2. Fetch all Podio vendor items
  console.log(`Fetching all items from Podio app ${PODIO_APP_ID}…`);
  const podioItems = await fetchAllPodioVendors(token);
  console.log(`  ✓ ${podioItems.length} total Podio vendor items\n`);

  // Build Podio lookup: normalised name → { item_id, title }
  const podioByName = new Map();
  for (const item of podioItems) {
    const raw = extractCompanyDba(item);
    const key = raw.toLowerCase();
    if (podioByName.has(key)) {
      podioByName.get(key).duplicates = (podioByName.get(key).duplicates || 0) + 1;
    } else {
      podioByName.set(key, { item_id: item.item_id, title: raw });
    }
  }

  // 3. Fetch all Supabase vendors
  console.log('Fetching all Supabase vendors…');
  const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: sbVendors, error } = await supabase
    .from('vendors')
    .select('id, company_dba, podio_id')
    .order('company_dba');

  if (error) throw new Error(`Supabase fetch failed: ${error.message}`);
  console.log(`  ✓ ${sbVendors.length} Supabase vendor rows\n`);

  // 4. Match
  const matched = [];
  const alreadySet = [];
  const sbUnmatched = [];

  for (const row of sbVendors) {
    const key = (row.company_dba || '').trim().toLowerCase();
    const podio = podioByName.get(key);

    if (row.podio_id) {
      alreadySet.push({ id: row.id, company_dba: row.company_dba, podio_id: row.podio_id });
    } else if (podio) {
      matched.push({ id: row.id, company_dba: row.company_dba, podio_id: podio.item_id });
      podio.matched = true;
    } else {
      sbUnmatched.push(row.company_dba || '(blank)');
    }
  }

  const podioUnmatched = [];
  for (const [, v] of podioByName) {
    if (!v.matched) podioUnmatched.push(v.title);
  }

  // 5. Report
  console.log('══════════════════════════════════════════════════');
  console.log('MATCH REPORT');
  console.log('══════════════════════════════════════════════════');
  console.log(`Podio items total:         ${podioItems.length}`);
  console.log(`Supabase vendors total:    ${sbVendors.length}`);
  console.log(`Already have podio_id:     ${alreadySet.length}`);
  console.log(`Matched (will update):     ${matched.length}`);
  console.log(`Supabase no match:         ${sbUnmatched.length}`);
  console.log(`Podio no match:            ${podioUnmatched.length}`);
  console.log('');

  if (matched.length > 0) {
    console.log(`── MATCHED (${matched.length}) ─────────────────────────────────`);
    for (const m of matched) {
      console.log(`  ${String(m.podio_id).padEnd(12)} → ${m.company_dba}`);
    }
    console.log('');
  }

  if (sbUnmatched.length > 0) {
    console.log(`── SUPABASE VENDORS WITH NO PODIO MATCH (${sbUnmatched.length}) ───`);
    for (const name of sbUnmatched) console.log(`  ${name}`);
    console.log('');
  }

  if (podioUnmatched.length > 0) {
    console.log(`── PODIO ITEMS WITH NO SUPABASE MATCH (${podioUnmatched.length}) ───`);
    for (const name of podioUnmatched) console.log(`  ${name}`);
    console.log('');
  }

  if (alreadySet.length > 0) {
    console.log(`── ALREADY HAD podio_id (${alreadySet.length}) ────────────────`);
    for (const r of alreadySet) console.log(`  ${String(r.podio_id).padEnd(12)} → ${r.company_dba}`);
    console.log('');
  }

  // 6. Write (only with --write flag)
  if (!WRITE_MODE) {
    console.log('══════════════════════════════════════════════════');
    console.log('DRY RUN COMPLETE — no writes made.');
    console.log('Run with --write to apply matched podio_ids.');
    console.log('══════════════════════════════════════════════════\n');
    return;
  }

  console.log('══════════════════════════════════════════════════');
  console.log(`WRITING ${matched.length} rows…`);
  let writeOk = 0;
  let writeFail = 0;
  for (const m of matched) {
    const { error: upErr } = await supabase
      .from('vendors')
      .update({ podio_id: String(m.podio_id) })
      .eq('id', m.id);
    if (upErr) {
      console.error(`  FAIL ${m.company_dba}: ${upErr.message}`);
      writeFail++;
    } else {
      writeOk++;
    }
  }
  console.log(`\n  ✓ ${writeOk} updated, ${writeFail} failed`);

  // Verify
  const { data: verify } = await supabase
    .from('vendors')
    .select('id', { count: 'exact', head: true })
    .not('podio_id', 'is', null);
  console.log(`  Verification: ${verify?.length ?? '?'} vendors now have podio_id`);

  // Count via count query
  const { count } = await supabase
    .from('vendors')
    .select('*', { count: 'exact', head: true })
    .not('podio_id', 'is', null);
  console.log(`  Total vendors with podio_id populated: ${count}`);
  console.log('══════════════════════════════════════════════════\n');
}

main().catch(err => { console.error('\n❌', err.message); process.exit(1); });
