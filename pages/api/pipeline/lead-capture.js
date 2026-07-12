// POST — create a new leasing_pipeline record at stage "New Inquiry"
import { createServerClient } from '../../../lib/supabaseServer';

const VALID_PROP_CODES = new Set([
  '1McC','777','ACP','ART','ARVS','ATS','CDY','CHQ','COB','CPP','CR1','CRMS','CVP',
  'DCC','DCM','DCP','DEM','DON','FOX','KOD','KTA','LAP','LASO','LEEN','LPP','MILL',
  'MYN','OLY','OMP','PLZ','PW213','PWP','RHS','RR','SAC','SEP','SS','SSB','STP',
  'SUNT','SWV','SYC','VDN','VVP','WAL','WNT','WSP','YAV',
]);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Accept BRIEFING_SECRET (server/agent calls) or NEXT_PUBLIC_BRIEFING_SECRET (client-side calls)
  const secret = req.headers['x-briefing-secret'];
  const isAuth = secret === process.env.BRIEFING_SECRET ||
                 (process.env.NEXT_PUBLIC_BRIEFING_SECRET && secret === process.env.NEXT_PUBLIC_BRIEFING_SECRET);
  if (!isAuth) return res.status(401).json({ error: 'Unauthorized' });

  const {
    prop_code,
    suite_id,
    suite_num,
    sqft,
    prospect_name,
    prospect_phone,
    prospect_email,
    initial_message,
    source,
    space_type_interest,
    size_sqft_interest,
    need_when,
    ls_length_interest,
    other_needs,
    proposed_use,
    contact_id,
    thread_id,
  } = req.body || {};

  if (prop_code && !VALID_PROP_CODES.has(prop_code)) return res.status(400).json({ error: 'Invalid prop_code' });

  const sb = createServerClient();

  const insert = {
    stage: 'New Inquiry',
    status: 'Active',
    pipeline_source: 'inbound',
    stage_5_state: 'pending',
    stage_7_state: 'pending',
  };
  if (prop_code) insert.prop_code = prop_code;

  if (suite_id)            insert.suite_id            = suite_id;
  if (suite_num)           insert.suite_num           = suite_num;
  if (sqft)                insert.sqft                = sqft;
  if (prospect_name)       insert.prospect_name       = prospect_name;
  if (prospect_phone)      insert.prospect_phone      = prospect_phone;
  if (prospect_email)      insert.prospect_email      = prospect_email;
  if (initial_message)     insert.initial_message     = initial_message;
  if (source)              insert.source              = source;
  if (space_type_interest) insert.space_type_interest = space_type_interest;
  if (size_sqft_interest)  insert.size_sqft_interest  = size_sqft_interest;
  if (need_when)           insert.need_when           = need_when;
  if (ls_length_interest)  insert.ls_length_interest  = ls_length_interest;
  if (other_needs)         insert.other_needs         = other_needs;
  if (proposed_use)        insert.proposed_use        = proposed_use;
  if (contact_id)          insert.contact_id          = contact_id;

  const { data, error } = await sb
    .from('leasing_pipeline')
    .insert(insert)
    .select()
    .single();

  if (error) {
    console.error('[api/pipeline/lead-capture]', error);
    return res.status(500).json({ error: error.message });
  }

  // If a thread_id was provided, link it to the new pipeline record
  if (thread_id) {
    await sb
      .from('email_threads')
      .update({
        linked_record_type: 'leasing_pipeline',
        linked_record_id: data.id,
        link_status: 'manual_linked',
        updated_at: new Date().toISOString(),
      })
      .eq('id', thread_id);
  }

  return res.status(201).json(data);
}
