#!/usr/bin/env node
/**
 * Podio → Supabase contacts.vendor_id / contacts.tenant_id linking
 *
 * Dry run (default):  node scripts/podio-contacts-linking.js
 * Write mode:         node scripts/podio-contacts-linking.js --write
 *
 * Strategy:
 *   - contacts.podio_id = Podio app_item_id (sequential within Contacts app)
 *   - vendors.podio_id  = Podio global item_id (large 9-digit numbers)
 *   - tenants.podio_id  = Podio app_item_id (sequential within Tenants app)
 *   - Company DBA relationship fields embed both item_id and app_item_id;
 *     we use item_id for vendor matching, app_item_id for tenant matching.
 *
 * Requires in .env.local:
 *   PODIO_CLIENT_ID, PODIO_CLIENT_SECRET
 *   PODIO_CONTACTS_APP_ID, PODIO_CONTACTS_APP_TOKEN
 *   PODIO_VENDORS_APP_ID  (used to identify which app a link points to)
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const path = require('path');
const fs = require('fs');

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
  PODIO_CLIENT_ID, PODIO_CLIENT_SECRET,
  PODIO_CONTACTS_APP_ID, PODIO_CONTACTS_APP_TOKEN,
  PODIO_VENDORS_APP_ID,
  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

for (const [k, v] of Object.entries({
  PODIO_CLIENT_ID, PODIO_CLIENT_SECRET,
  PODIO_CONTACTS_APP_ID, PODIO_CONTACTS_APP_TOKEN,
  PODIO_VENDORS_APP_ID,
  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
})) {
  if (!v) { console.error(`Missing env var: ${k}`); process.exit(1); }
}

const VENDORS_APP_ID = parseInt(PODIO_VENDORS_APP_ID, 10); // 10075093

// ── Auth ──────────────────────────────────────────────────────────────────────

async function getPodioToken() {
  const body = new URLSearchParams({
    grant_type: 'app',
    client_id: PODIO_CLIENT_ID,
    client_secret: PODIO_CLIENT_SECRET,
    app_id: PODIO_CONTACTS_APP_ID,
    app_token: PODIO_CONTACTS_APP_TOKEN,
  });
  const res = await fetch('https://podio.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Podio auth failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

// ── Paginate all contacts ─────────────────────────────────────────────────────

async function fetchAllContacts(token) {
  const items = [];
  const limit = 500;
  let offset = 0;
  while (true) {
    const url = `https://api.podio.com/item/app/${PODIO_CONTACTS_APP_ID}/?limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { headers: { Authorization: `OAuth2 ${token}` } });
    if (!res.ok) throw new Error(`Podio fetch failed (${res.status}): ${await res.text()}`);
    const data = await res.json();
    const batch = data.items || [];
    items.push(...batch);
    console.log(`  Fetched ${items.length} / ${data.total} Podio contacts (offset ${offset})…`);
    if (batch.length < limit) break;
    offset += limit;
  }
  return items;
}

// ── Extract relevant fields from a Podio contact item ─────────────────────────

const APP_FIELD_EXTERNAL_IDS = ['company', 'company-link', 'company-ref', 'archived-company-dba'];

function extractContactData(item) {
  const getField = (extId) => (item.fields || []).find(f => f.external_id === extId);

  // Name
  const nameField = getField('name');
  const name = nameField?.values?.[0]?.value || '(no name)';

  // Category
  const catField = getField('category');
  const category = catField?.values?.[0]?.value?.text || null;

  // All app-relationship fields that have values
  const links = [];
  for (const extId of APP_FIELD_EXTERNAL_IDS) {
    const f = getField(extId);
    if (!f?.values?.length) continue;
    for (const v of f.values) {
      const linked = v.value;
      if (!linked) continue;
      links.push({
        fieldExtId: extId,
        linkedAppId: linked.app?.app_id || null,
        linkedAppName: linked.app?.name || '?',
        linkedItemId: linked.item_id || null,         // global item_id
        linkedAppItemId: linked.app_item_id || null,  // sequential within linked app
        linkedTitle: linked.title || '?',
      });
    }
  }

  return { app_item_id: item.app_item_id, item_id: item.item_id, name, category, links };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== Podio → Supabase contacts.vendor_id / tenant_id linking ===`);
  console.log(`Mode: ${WRITE_MODE ? '⚠️  WRITE' : 'DRY RUN (read-only)'}\n`);

  // 1. Auth + fetch all Podio contacts
  console.log('Authenticating with Podio (Contacts app)…');
  const token = await getPodioToken();
  console.log('  ✓ Token obtained\n');

  console.log(`Fetching all items from Podio Contacts app ${PODIO_CONTACTS_APP_ID}…`);
  const podioItems = await fetchAllContacts(token);
  console.log(`  ✓ ${podioItems.length} total Podio contact items\n`);

  // Build Podio map: app_item_id → extracted data
  const podioByAppItemId = new Map();
  for (const item of podioItems) {
    podioByAppItemId.set(item.app_item_id, extractContactData(item));
  }

  // 2. Fetch Supabase data
  console.log('Fetching Supabase data…');
  const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Paginate contacts — PostgREST default max-rows=1000 silently truncates without error
  const sbContacts = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, full_name, podio_id, category, vendor_id, tenant_id')
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`contacts fetch (offset ${offset}): ${error.message}`);
    sbContacts.push(...data);
    console.log(`  contacts page: fetched ${sbContacts.length} so far…`);
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  const [
    { data: sbVendors, error: vErr },
    { data: sbTenants, error: tErr },
  ] = await Promise.all([
    supabase.from('vendors').select('id, podio_id, company_dba').not('podio_id', 'is', null),
    supabase.from('tenants').select('id, podio_id, tenant_dba').not('podio_id', 'is', null),
  ]);

  if (vErr) throw new Error(`vendors fetch: ${vErr.message}`);
  if (tErr) throw new Error(`tenants fetch: ${tErr.message}`);

  console.log(`  ✓ ${sbContacts.length} contacts total, ${sbVendors.length} vendors w/podio_id, ${sbTenants.length} tenants w/podio_id\n`);

  // Lookup maps: podio_id (string) → Supabase row
  const vendorByPodioId = new Map(sbVendors.map(v => [String(v.podio_id), v]));
  const tenantByPodioId = new Map(sbTenants.map(t => [String(t.podio_id), t]));

  // 3. Process each Supabase contact
  const results = {
    vendorClean: [],        // category=Vendor, clean link → vendor UUID resolved
    tenantClean: [],        // category=Tenant, clean link → tenant UUID resolved
    noLink: [],             // no app-type field with values (skip, expected)
    alreadySet: [],         // vendor_id or tenant_id already populated
    noPodioItem: [],        // contacts.podio_id not found in Podio (deleted?)
    ambiguous: [],          // multiple links on same contact
    unresolvedVendor: [],   // link to Vendors app but item_id not in vendors.podio_id
    unresolvedTenant: [],   // link to Tenants app but app_item_id not in tenants.podio_id
    unknownAppLink: [],     // link points to an app that's neither Vendors nor Tenants
    skipCategory: [],       // category not Vendor or Tenant (Prospect, Broker, Other, etc.)
    rayValencia: null,      // special tracking
  };

  for (const contact of sbContacts) {
    const podioIdNum = contact.podio_id ? parseInt(contact.podio_id, 10) : null;

    // Already set
    if (contact.vendor_id || contact.tenant_id) {
      results.alreadySet.push({ ...contact });
      continue;
    }

    // No podio_id
    if (!podioIdNum) {
      results.noLink.push({ name: contact.full_name, reason: 'no podio_id in Supabase' });
      continue;
    }

    // Look up Podio item
    const podio = podioByAppItemId.get(podioIdNum);
    if (!podio) {
      const entry = { name: contact.full_name, podio_id: contact.podio_id, category: contact.category };
      results.noPodioItem.push(entry);
      // Special tracking for Ray Valencia
      if (contact.podio_id === '5296') results.rayValencia = { contact, podio: null, result: 'NOT FOUND IN PODIO' };
      continue;
    }

    // Special tracking for Ray Valencia
    if (contact.podio_id === '5296') {
      results.rayValencia = { contact, podio, result: 'pending' };
    }

    // No link fields at all
    if (podio.links.length === 0) {
      results.noLink.push({ name: contact.full_name, podio_id: contact.podio_id, category: podio.category });
      if (contact.podio_id === '5296') results.rayValencia.result = 'NO LINK FIELD';
      continue;
    }

    // Skip non-Vendor/Tenant categories
    const cat = podio.category;
    if (!cat || !['Vendor', 'Tenant'].includes(cat)) {
      results.skipCategory.push({ name: contact.full_name, podio_id: contact.podio_id, category: cat });
      if (contact.podio_id === '5296') results.rayValencia.result = `SKIP CATEGORY: ${cat}`;
      continue;
    }

    // Ambiguous: multiple links
    if (podio.links.length > 1) {
      results.ambiguous.push({ name: contact.full_name, podio_id: contact.podio_id, category: cat, links: podio.links });
      if (contact.podio_id === '5296') results.rayValencia.result = 'AMBIGUOUS';
      continue;
    }

    const link = podio.links[0];

    // Vendor
    if (cat === 'Vendor') {
      if (link.linkedAppId !== VENDORS_APP_ID) {
        results.unknownAppLink.push({ name: contact.full_name, podio_id: contact.podio_id, category: cat, linkedApp: link.linkedAppName, linkedAppId: link.linkedAppId });
        if (contact.podio_id === '5296') results.rayValencia.result = `UNKNOWN APP LINK: ${link.linkedAppName}`;
        continue;
      }
      const vendor = vendorByPodioId.get(String(link.linkedItemId));
      if (!vendor) {
        results.unresolvedVendor.push({ name: contact.full_name, podio_id: contact.podio_id, linkedItemId: link.linkedItemId, linkedTitle: link.linkedTitle });
        if (contact.podio_id === '5296') results.rayValencia.result = `UNRESOLVED VENDOR LINK: item_id=${link.linkedItemId}`;
        continue;
      }
      const entry = { id: contact.id, name: contact.full_name, podio_id: contact.podio_id, vendor_id: vendor.id, vendor_dba: vendor.company_dba };
      results.vendorClean.push(entry);
      if (contact.podio_id === '5296') results.rayValencia.result = `VENDOR MATCH → ${vendor.company_dba} (${vendor.id})`;
      continue;
    }

    // Tenant
    if (cat === 'Tenant') {
      const tenantLookupId = String(link.linkedAppItemId);
      const tenant = tenantByPodioId.get(tenantLookupId);
      if (!tenant) {
        results.unresolvedTenant.push({ name: contact.full_name, podio_id: contact.podio_id, linkedAppItemId: link.linkedAppItemId, linkedTitle: link.linkedTitle, linkedAppId: link.linkedAppId });
        if (contact.podio_id === '5296') results.rayValencia.result = `UNRESOLVED TENANT LINK`;
        continue;
      }
      const entry = { id: contact.id, name: contact.full_name, podio_id: contact.podio_id, tenant_id: tenant.id, tenant_dba: tenant.tenant_dba };
      results.tenantClean.push(entry);
      if (contact.podio_id === '5296') results.rayValencia.result = `TENANT MATCH → ${tenant.tenant_dba} (${tenant.id})`;
      continue;
    }
  }

  // 4. Report
  const totalClean = results.vendorClean.length + results.tenantClean.length;
  console.log('══════════════════════════════════════════════════');
  console.log('LINK REPORT');
  console.log('══════════════════════════════════════════════════');
  console.log(`Supabase contacts total:        ${sbContacts.length}`);
  console.log(`Podio contacts total:           ${podioItems.length}`);
  console.log(`Already have vendor_id/tenant_id: ${results.alreadySet.length}`);
  console.log(`Clean vendor matches:           ${results.vendorClean.length}`);
  console.log(`Clean tenant matches:           ${results.tenantClean.length}`);
  console.log(`Total clean (will update):      ${totalClean}`);
  console.log(`No link field (skip, expected): ${results.noLink.length}`);
  console.log(`Skipped category (not V/T):     ${results.skipCategory.length}`);
  console.log(`Not found in Podio (deleted?):  ${results.noPodioItem.length}`);
  console.log(`Ambiguous (multiple links):     ${results.ambiguous.length}`);
  console.log(`Unresolved vendor link:         ${results.unresolvedVendor.length}`);
  console.log(`Unresolved tenant link:         ${results.unresolvedTenant.length}`);
  console.log(`Unknown app link:               ${results.unknownAppLink.length}`);
  console.log('');

  // Ray Valencia spotlight
  console.log('── RAY VALENCIA (podio_id 5296) ─────────────────');
  if (results.rayValencia) {
    const rv = results.rayValencia;
    console.log(`  Contact: ${rv.contact.full_name} | podio_id: ${rv.contact.podio_id} | category: ${rv.contact.category}`);
    console.log(`  Result: ${rv.result}`);
    if (rv.podio) {
      console.log(`  Podio category: ${rv.podio.category}`);
      console.log(`  Podio links: ${JSON.stringify(rv.podio.links, null, 4)}`);
    }
  } else {
    console.log('  Not found in Supabase contacts.');
  }
  console.log('');

  if (results.vendorClean.length > 0) {
    console.log(`── VENDOR MATCHES (${results.vendorClean.length}) ─────────────────────────`);
    for (const m of results.vendorClean) {
      console.log(`  podio:${m.podio_id.toString().padEnd(6)} ${m.name.padEnd(35)} → ${m.vendor_dba}`);
    }
    console.log('');
  }

  if (results.tenantClean.length > 0) {
    console.log(`── TENANT MATCHES (${results.tenantClean.length}) ─────────────────────────`);
    for (const m of results.tenantClean) {
      console.log(`  podio:${m.podio_id.toString().padEnd(6)} ${m.name.padEnd(35)} → ${m.tenant_dba}`);
    }
    console.log('');
  }

  if (results.noPodioItem.length > 0) {
    console.log(`── NOT FOUND IN PODIO / DELETED (${results.noPodioItem.length}) ──────────`);
    for (const m of results.noPodioItem) {
      console.log(`  podio_id:${(m.podio_id || '?').toString().padEnd(7)} cat:${(m.category || '?').padEnd(12)} ${m.name}`);
    }
    console.log('');
  }

  if (results.unresolvedVendor.length > 0) {
    console.log(`── UNRESOLVED VENDOR LINKS (${results.unresolvedVendor.length}) ───────────`);
    for (const m of results.unresolvedVendor) {
      console.log(`  podio:${m.podio_id.toString().padEnd(6)} item_id:${String(m.linkedItemId).padEnd(14)} ${m.name} → "${m.linkedTitle}"`);
    }
    console.log('');
  }

  if (results.unresolvedTenant.length > 0) {
    console.log(`── UNRESOLVED TENANT LINKS (${results.unresolvedTenant.length}) ───────────`);
    for (const m of results.unresolvedTenant) {
      console.log(`  podio:${m.podio_id.toString().padEnd(6)} app_item_id:${String(m.linkedAppItemId).padEnd(8)} appId:${m.linkedAppId} ${m.name} → "${m.linkedTitle}"`);
    }
    console.log('');
  }

  if (results.unknownAppLink.length > 0) {
    console.log(`── UNKNOWN APP LINKS (${results.unknownAppLink.length}) ─────────────────────`);
    for (const m of results.unknownAppLink) {
      console.log(`  podio:${m.podio_id.toString().padEnd(6)} cat:${(m.category||'?').padEnd(10)} linkedApp:"${m.linkedApp}" (id:${m.linkedAppId}) ${m.name}`);
    }
    console.log('');
  }

  if (results.ambiguous.length > 0) {
    console.log(`── AMBIGUOUS / MULTIPLE LINKS (${results.ambiguous.length}) ─────────────────`);
    for (const m of results.ambiguous) {
      console.log(`  podio:${m.podio_id.toString().padEnd(6)} cat:${(m.category||'?').padEnd(10)} ${m.name} (${m.links.length} links)`);
    }
    console.log('');
  }

  if (!WRITE_MODE) {
    console.log('══════════════════════════════════════════════════');
    console.log('DRY RUN COMPLETE — no writes made.');
    console.log('Run with --write to apply clean matches.');
    console.log('══════════════════════════════════════════════════\n');
    return;
  }

  // 5. Write
  console.log('══════════════════════════════════════════════════');
  console.log(`WRITING ${totalClean} rows…`);
  let writeOk = 0, writeFail = 0;

  for (const m of results.vendorClean) {
    const { error } = await supabase.from('contacts').update({ vendor_id: m.vendor_id }).eq('id', m.id);
    if (error) { console.error(`  FAIL vendor ${m.name}: ${error.message}`); writeFail++; }
    else writeOk++;
  }

  for (const m of results.tenantClean) {
    const { error } = await supabase.from('contacts').update({ tenant_id: m.tenant_id }).eq('id', m.id);
    if (error) { console.error(`  FAIL tenant ${m.name}: ${error.message}`); writeFail++; }
    else writeOk++;
  }

  console.log(`\n  ✓ ${writeOk} updated, ${writeFail} failed`);

  const [{ count: vCount }, { count: tCount }] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }).not('vendor_id', 'is', null),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).not('tenant_id', 'is', null),
  ]);
  console.log(`  Verification: ${vCount} contacts with vendor_id, ${tCount} contacts with tenant_id`);
  console.log('══════════════════════════════════════════════════\n');
}

main().catch(err => { console.error('\n❌', err.message); process.exit(1); });
