export const config = { maxDuration: 60 };

// POST — AI-draft a Letter of Intent for a leasing deal
// Draft only — no auto-save, no auto-send. Scott approves before any action.
import { createServerClient } from '../../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const isAuth = req.headers['x-briefing-secret'] === process.env.BRIEFING_SECRET;
  if (!isAuth) return res.status(401).json({ error: 'Unauthorized' });

  const { pipeline_id } = req.body || {};
  if (!pipeline_id) return res.status(400).json({ error: 'pipeline_id is required' });

  const sb = createServerClient();

  const { data: deal, error: dealErr } = await sb
    .from('leasing_pipeline')
    .select(`
      id, prop_code, suite_num, sqft, prospect_name, prospect_email,
      tnt_dba_name, tnt_legal_entity_name, entity_type,
      company_signor, signor_title,
      ls_type, proposed_use, additional_terms,
      loi_proposed_rent, loi_proposed_term, loi_proposed_start_date,
      security_deposit_terms, rent_due_at_signing,
      internal_notes
    `)
    .eq('id', pipeline_id)
    .single();

  if (dealErr || !deal) {
    return res.status(404).json({ error: 'Pipeline record not found' });
  }

  // leasing_pipeline has no FK to properties — query separately by prop_code
  const { data: prop } = await sb
    .from('properties')
    .select('address, city, state')
    .eq('prop_code', deal.prop_code)
    .maybeSingle();

  const propAddress = prop
    ? [prop.address, prop.city, prop.state].filter(Boolean).join(', ')
    : '';

  const dealContext = [
    `Property: ${deal.prop_code}${propAddress ? ` — ${propAddress}` : ''}`,
    deal.suite_num    ? `Suite: ${deal.suite_num}` : '',
    deal.sqft         ? `Size: ${deal.sqft.toLocaleString()} SF` : '',
    deal.tnt_dba_name ? `Tenant DBA: ${deal.tnt_dba_name}` : '',
    deal.tnt_legal_entity_name ? `Legal Entity: ${deal.tnt_legal_entity_name} (${deal.entity_type || ''})` : '',
    deal.company_signor ? `Signor: ${deal.company_signor}${deal.signor_title ? `, ${deal.signor_title}` : ''}` : '',
    deal.prospect_name  ? `Contact: ${deal.prospect_name}` : '',
    deal.proposed_use   ? `Proposed Use: ${deal.proposed_use}` : '',
    deal.ls_type        ? `Lease Type: ${deal.ls_type}` : '',
    deal.loi_proposed_rent        ? `Proposed Rent: $${deal.loi_proposed_rent}/mo` : '',
    deal.loi_proposed_term        ? `Proposed Term: ${deal.loi_proposed_term}` : '',
    deal.loi_proposed_start_date  ? `Proposed Start: ${deal.loi_proposed_start_date}` : '',
    deal.security_deposit_terms   ? `Security Deposit: ${deal.security_deposit_terms}` : '',
    deal.additional_terms         ? `Additional Terms: ${deal.additional_terms}` : '',
    deal.internal_notes           ? `Internal Notes: ${deal.internal_notes}` : '',
  ].filter(Boolean).join('\n');

  const systemPrompt = `You are a commercial real estate assistant for Scott Anderson, CCIM, of Anderson Commercial Properties in Sedona, AZ.
Scott manages NNN commercial properties. Draft a professional Letter of Intent (LOI) for a commercial lease based on the deal details provided.

The LOI should include:
- Date and parties (Landlord: Anderson Commercial Properties / relevant LLC; Tenant: as specified)
- Property address and suite
- Proposed lease term and commencement date
- Base rent and any stated escalations (NNN unless otherwise specified)
- Security deposit terms
- Proposed use clause
- Any additional terms mentioned
- Standard LOI non-binding disclaimer language
- Signature blocks for both parties

Write in formal commercial real estate language. Use brackets for any information not provided that Scott will need to fill in. Do not invent specific dollar amounts, dates, or terms not stated in the deal details.`;

  const userMessage = `Please draft an LOI for the following deal:\n\n${dealContext}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-5',
        max_tokens: 2000,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[api/pipeline/loi-draft] Anthropic error:', errText);
      return res.status(500).json({ error: 'AI draft failed' });
    }

    const aiData  = await response.json();
    const draft   = aiData.content?.[0]?.text || '';

    return res.status(200).json({ draft, pipeline_id });
  } catch (err) {
    console.error('[api/pipeline/loi-draft]', err);
    return res.status(500).json({ error: err.message });
  }
}
