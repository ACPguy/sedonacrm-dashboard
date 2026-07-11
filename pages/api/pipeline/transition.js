// POST — advance or exit a leasing_pipeline record to a new stage
// Handles NA-skip for stage_5_state (Application Sent) and stage_7_state (LOI)
import { createServerClient } from '../../../lib/supabaseServer';

const ORDERED_STAGES = [
  'New Inquiry',
  'Info Sent',
  'Showing Scheduled',
  'Showing Complete',
  'Application Sent',
  'Qualifying / Screening',
  'LOI',
  'Lease Drafting',
  'Fully Executed',
  'Move-In',
];

const EXIT_STAGES = new Set(['Dead', 'On Hold', 'Landlord Declined Use']);

// Stages that can be NA-skipped and their state column
const SKIPPABLE = {
  'Application Sent': 'stage_5_state',
  'LOI': 'stage_7_state',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const isAuth = req.headers['x-briefing-secret'] === process.env.BRIEFING_SECRET;
  if (!isAuth) return res.status(401).json({ error: 'Unauthorized' });

  const {
    pipeline_id,
    to_stage,
    skip = false,           // true = mark to_stage as NA and advance past it
    dead_reason,
    dead_notes,
    landlord_declined_reason,
    landlord_declined_notes,
    on_hold_notes,
  } = req.body || {};

  if (!pipeline_id) return res.status(400).json({ error: 'pipeline_id is required' });
  if (!to_stage)    return res.status(400).json({ error: 'to_stage is required' });

  const isExit = EXIT_STAGES.has(to_stage);
  if (!isExit && !ORDERED_STAGES.includes(to_stage)) {
    return res.status(400).json({ error: `Unknown stage: ${to_stage}` });
  }

  const sb = createServerClient();

  // Fetch current record to validate the transition makes sense
  const { data: current, error: fetchErr } = await sb
    .from('leasing_pipeline')
    .select('id, stage, stage_5_state, stage_7_state, status')
    .eq('id', pipeline_id)
    .single();

  if (fetchErr || !current) {
    return res.status(404).json({ error: 'Pipeline record not found' });
  }

  const update = {};

  if (isExit) {
    update.stage  = to_stage;
    update.status = to_stage === 'On Hold' ? 'On Hold' : 'Closed';
    if (to_stage === 'Dead') {
      update.close_date = new Date().toISOString().slice(0, 10);
      if (dead_reason) update.dead_reason = dead_reason;
      if (dead_notes)  update.dead_notes  = dead_notes;
    }
    if (to_stage === 'On Hold') {
      update.on_hold_date = new Date().toISOString().slice(0, 10);
      if (on_hold_notes) update.on_hold_notes = on_hold_notes;
    }
    if (to_stage === 'Landlord Declined Use') {
      update.close_date = new Date().toISOString().slice(0, 10);
      if (landlord_declined_reason) update.landlord_declined_reason = landlord_declined_reason;
      if (landlord_declined_notes)  update.landlord_declined_notes  = landlord_declined_notes;
    }
  } else if (skip && SKIPPABLE[to_stage]) {
    // NA-skip: mark this stage as skipped, advance stage to the one after
    const stateCol = SKIPPABLE[to_stage];
    update[stateCol] = 'NA';
    const idx = ORDERED_STAGES.indexOf(to_stage);
    update.stage = ORDERED_STAGES[idx + 1] || to_stage;
  } else {
    // Normal advance
    update.stage = to_stage;
    // If completing a skippable stage, mark its state as complete
    if (SKIPPABLE[to_stage]) {
      update[SKIPPABLE[to_stage]] = 'complete';
    }
    // Track application received date when entering Qualifying
    if (to_stage === 'Qualifying / Screening') {
      update.app_received_date = new Date().toISOString().slice(0, 10);
    }
    // Track app sent date when advancing to Application Sent
    if (to_stage === 'Application Sent') {
      update.app_sent_date = new Date().toISOString().slice(0, 10);
    }
  }

  const { data, error } = await sb
    .from('leasing_pipeline')
    .update(update)
    .eq('id', pipeline_id)
    .select()
    .single();

  if (error) {
    console.error('[api/pipeline/transition]', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}
