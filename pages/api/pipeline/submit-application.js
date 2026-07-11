// POST — write a lease application to lease_applications, link to pipeline record
import { createServerClient } from '../../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const isAuth = req.headers['x-briefing-secret'] === process.env.BRIEFING_SECRET;
  if (!isAuth) return res.status(401).json({ error: 'Unauthorized' });

  const body = req.body || {};
  const { pipeline_id, prop_code } = body;

  if (!pipeline_id) return res.status(400).json({ error: 'pipeline_id is required' });

  const sb = createServerClient();

  // Verify pipeline record exists and get prop_code if not supplied
  const { data: pipeline, error: pipeErr } = await sb
    .from('leasing_pipeline')
    .select('id, prop_code, stage')
    .eq('id', pipeline_id)
    .single();

  if (pipeErr || !pipeline) {
    return res.status(404).json({ error: 'Pipeline record not found' });
  }

  // Build application insert — accept all spec fields from body
  const appInsert = {
    pipeline_id,
    prop_code: prop_code || pipeline.prop_code,
    submission_date: new Date().toISOString(),
    app_source: body.app_source || 'staff_entered',
    app_status: 'Unprocessed',

    // Identity
    full_name:            body.full_name            || null,
    email:                body.email                || null,
    cell_phone:           body.cell_phone           || null,
    sms_phone:            body.sms_phone            || null,
    business_description: body.business_description || null,
    all_other_names:      body.all_other_names      || null,
    ssn:                  body.ssn                  || null,
    birth_date:           body.birth_date           || null,
    dl_number:            body.dl_number            || null,
    dl_state:             body.dl_state             || null,
    spouse_full_name:     body.spouse_full_name     || null,

    // Residence — current
    res_current_address:          body.res_current_address          || null,
    res_current_city:             body.res_current_city             || null,
    res_current_state:            body.res_current_state            || null,
    res_current_zip:              body.res_current_zip              || null,
    res_current_status:           body.res_current_status           || null,
    res_current_monthly_payment:  body.res_current_monthly_payment  || null,
    res_current_owner_manager:    body.res_current_owner_manager    || null,
    res_current_owner_phone:      body.res_current_owner_phone      || null,
    res_current_date_start:       body.res_current_date_start       || null,
    res_current_date_end:         body.res_current_date_end         || null,

    // Residence — prior
    res_prior_address:            body.res_prior_address            || null,
    res_prior_city:               body.res_prior_city               || null,
    res_prior_state:              body.res_prior_state              || null,
    res_prior_zip:                body.res_prior_zip                || null,
    res_prior_status:             body.res_prior_status             || null,
    res_prior_monthly_payment:    body.res_prior_monthly_payment    || null,
    res_prior_owner_manager:      body.res_prior_owner_manager      || null,
    res_prior_owner_phone:        body.res_prior_owner_phone        || null,
    res_prior_date_start:         body.res_prior_date_start         || null,
    res_prior_date_end:           body.res_prior_date_end           || null,
    res_prior_reason_leaving:     body.res_prior_reason_leaving     || null,

    // Employment
    emp_type:             body.emp_type             || null,
    emp_employer_name:    body.emp_employer_name    || null,
    emp_employer_address: body.emp_employer_address || null,
    emp_position:         body.emp_position         || null,
    emp_start_date:       body.emp_start_date       || null,
    emp_supervisor_name:  body.emp_supervisor_name  || null,
    emp_supervisor_phone: body.emp_supervisor_phone || null,
    emp_monthly_salary:   body.emp_monthly_salary   || null,

    // Banking
    bank_name:            body.bank_name            || null,
    bank_branch:          body.bank_branch          || null,
    bank_present_balance: body.bank_present_balance || null,

    // References
    ref1_name:             body.ref1_name             || null,
    ref1_years_acquainted: body.ref1_years_acquainted || null,
    ref1_phone:            body.ref1_phone            || null,
    ref2_name:             body.ref2_name             || null,
    ref2_years_acquainted: body.ref2_years_acquainted || null,
    ref2_phone:            body.ref2_phone            || null,

    // Assets
    asset_cash:          body.asset_cash          || null,
    asset_home:          body.asset_home          || null,
    asset_businesses:    body.asset_businesses    || null,
    asset_stocks_bonds:  body.asset_stocks_bonds  || null,
    asset_other_amount:  body.asset_other_amount  || null,
    asset_other_desc:    body.asset_other_desc    || null,

    // Liabilities
    liab_mortgages:      body.liab_mortgages      || null,
    liab_secured_loans:  body.liab_secured_loans  || null,
    liab_personal_loans: body.liab_personal_loans || null,
    liab_taxes_owed:     body.liab_taxes_owed     || null,
    liab_other_amount:   body.liab_other_amount   || null,
    liab_other_desc:     body.liab_other_desc     || null,

    // Income
    income_this_year_est:   body.income_this_year_est   || null,
    income_last_year:       body.income_last_year       || null,
    income_prior_year:      body.income_prior_year      || null,
    has_pending_suits:      body.has_pending_suits      ?? null,
    pending_suits_desc:     body.pending_suits_desc     || null,
    has_executed_will:      body.has_executed_will      ?? null,
    has_guaranteed_debt:    body.has_guaranteed_debt    ?? null,
    guaranteed_debt_desc:   body.guaranteed_debt_desc   || null,

    // Consents
    consent_accuracy:              body.consent_accuracy              ?? null,
    consent_accuracy_at:           body.consent_accuracy_at           || null,
    consent_credit_background:     body.consent_credit_background     ?? null,
    consent_credit_background_at:  body.consent_credit_background_at  || null,
    consent_info_sharing:          body.consent_info_sharing          ?? null,
    consent_info_sharing_at:       body.consent_info_sharing_at       || null,
    consent_processing_fee:        body.consent_processing_fee        ?? null,
    consent_processing_fee_at:     body.consent_processing_fee_at     || null,
    consent_dl_upload:             body.consent_dl_upload             ?? null,
    consent_dl_upload_at:          body.consent_dl_upload_at          || null,

    // Entity
    entity_dba_name:           body.entity_dba_name           || null,
    entity_legal_name:         body.entity_legal_name         || null,
    entity_state:              body.entity_state              || null,
    entity_type:               body.entity_type               || null,
    lease_start_date_proposed: body.lease_start_date_proposed || null,
    additional_comments:       body.additional_comments       || null,

    // Staff-facing
    app_fee_status:         body.app_fee_status         || 'Unpaid',
    credit_check_link:      body.credit_check_link      || null,
    assigned_to_contact_id: body.assigned_to_contact_id || null,
  };

  const { data: appRecord, error: appErr } = await sb
    .from('lease_applications')
    .insert(appInsert)
    .select()
    .single();

  if (appErr) {
    console.error('[api/pipeline/submit-application]', appErr);
    return res.status(500).json({ error: appErr.message });
  }

  // Advance pipeline: mark app_received_date + move to Qualifying if still at Application Sent
  const pipelineUpdate = { app_received_date: new Date().toISOString().slice(0, 10) };
  if (pipeline.stage === 'Application Sent') {
    pipelineUpdate.stage = 'Qualifying / Screening';
    pipelineUpdate.stage_5_state = 'complete';
  }

  await sb.from('leasing_pipeline').update(pipelineUpdate).eq('id', pipeline_id);

  return res.status(201).json(appRecord);
}
