const { db } = require('../../database');

async function getListingCompliance(postId) {
  const statement = db.prepare('SELECT * FROM listing_compliance WHERE post_id = ? LIMIT 1');
  return statement.get(postId);
}

async function upsertListingCompliance(postId, payload) {
  const existing = await getListingCompliance(postId);
  const now = new Date().toISOString();

  if (existing) {
    const statement = db.prepare(`
      UPDATE listing_compliance
      SET seller_relation_type = ?,
          plate_number = ?,
          registration_owner_full_name_declared = ?,
          is_owner_same_as_account_holder = ?,
          authorization_declaration_text = ?,
          authorization_declaration_accepted = ?,
          authorization_status = ?,
          eids_status = ?,
          safe_payment_info_accepted = ?,
          safe_payment_info_accepted_at = ?,
          listing_compliance_status = ?,
          risk_score = ?,
          risk_level = ?,
          billing_required = ?,
          billing_status = ?,
          payment_record_id = ?,
          duplicate_plate_flag = ?,
          abnormal_price_flag = ?,
          spam_content_flag = ?,
          review_required_reason = ?,
          reviewed_by_admin_id = ?,
          reviewed_at = ?,
          updated_at = ?
      WHERE post_id = ?
    `);

    await statement.run(
      payload.sellerRelationType || null,
      payload.plateNumber || null,
      payload.registrationOwnerFullNameDeclared || null,
      payload.isOwnerSameAsAccountHolder ?? null,
      payload.authorizationDeclarationText || null,
      payload.authorizationDeclarationAccepted ? 1 : 0,
      payload.authorizationStatus || 'not_required',
      payload.eidsStatus || 'not_started',
      payload.safePaymentInfoAccepted ? 1 : 0,
      payload.safePaymentInfoAcceptedAt || null,
      payload.listingComplianceStatus || 'draft',
      payload.riskScore || 0,
      payload.riskLevel || 'low',
      payload.billingRequired ? 1 : 0,
      payload.billingStatus || 'not_required',
      payload.paymentRecordId || null,
      payload.duplicatePlateFlag ? 1 : 0,
      payload.abnormalPriceFlag ? 1 : 0,
      payload.spamContentFlag ? 1 : 0,
      payload.reviewRequiredReason || null,
      payload.reviewedByAdminId || null,
      payload.reviewedAt || null,
      now,
      postId,
    );

    return getListingCompliance(postId);
  }

  const statement = db.prepare(`
    INSERT INTO listing_compliance (
      post_id, seller_relation_type, plate_number, registration_owner_full_name_declared,
      is_owner_same_as_account_holder, authorization_declaration_text, authorization_declaration_accepted, authorization_status,
      eids_status, safe_payment_info_accepted, safe_payment_info_accepted_at,
      listing_compliance_status, risk_score, risk_level, billing_required, billing_status,
      payment_record_id, duplicate_plate_flag, abnormal_price_flag, spam_content_flag,
      review_required_reason, reviewed_by_admin_id, reviewed_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await statement.run(
    postId,
    payload.sellerRelationType || null,
    payload.plateNumber || null,
    payload.registrationOwnerFullNameDeclared || null,
    payload.isOwnerSameAsAccountHolder ?? null,
    payload.authorizationDeclarationText || null,
    payload.authorizationDeclarationAccepted ? 1 : 0,
    payload.authorizationStatus || 'not_required',
    payload.eidsStatus || 'not_started',
    payload.safePaymentInfoAccepted ? 1 : 0,
    payload.safePaymentInfoAcceptedAt || null,
    payload.listingComplianceStatus || 'draft',
    payload.riskScore || 0,
    payload.riskLevel || 'low',
    payload.billingRequired ? 1 : 0,
    payload.billingStatus || 'not_required',
    payload.paymentRecordId || null,
    payload.duplicatePlateFlag ? 1 : 0,
    payload.abnormalPriceFlag ? 1 : 0,
    payload.spamContentFlag ? 1 : 0,
    payload.reviewRequiredReason || null,
    payload.reviewedByAdminId || null,
    payload.reviewedAt || null,
    now,
    now,
  );

  return getListingCompliance(postId);
}

async function listFlaggableListings() {
  const statement = db.prepare(`
    SELECT p.id, p.content, p.listing_json, lc.listing_compliance_status, lc.plate_number, lc.review_required_reason,
           lc.risk_score, lc.risk_level, lc.duplicate_plate_flag, lc.abnormal_price_flag, lc.spam_content_flag
    FROM posts p
    LEFT JOIN listing_compliance lc ON lc.post_id = p.id
    WHERE p.type = 'listing'
    ORDER BY p.created_at DESC
  `);

  return statement.all();
}

module.exports = {
  getListingCompliance,
  listFlaggableListings,
  upsertListingCompliance,
};
