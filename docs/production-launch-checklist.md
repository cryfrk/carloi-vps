# Carloi Production Launch Checklist

## Pre-launch configuration

- Confirm `NODE_ENV=production`.
- Confirm `VCARX_REQUIRE_HTTPS=true` and `VCARX_TRUST_PROXY=true`.
- Confirm `VCARX_PUBLIC_BASE_URL`, `APP_BASE_URL`, `VCARX_SHARE_BASE_URL`, and `VCARX_PAYMENT_PAGE_BASE_URL` all use `https://` and do not point to localhost.
- Confirm `DATABASE_URL` points to the production database.
- Confirm `VCARX_SESSION_SECRET`, `VCARX_DATA_ENCRYPTION_SECRET`, and `VCARX_LOOKUP_SECRET` are strong unique secrets.
- Confirm `GCS_BUCKET_NAME` and storage credentials are available on the runtime.
- Confirm `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM` are valid.
- Confirm `VCARX_PAYMENT_CALLBACK_TOKEN` and `VCARX_PAYMENT_CALLBACK_SIGNATURE_SECRET` are set.
- Keep `VCARX_ENABLE_LEGACY_ADMIN_TOKEN_IN_PRODUCTION=false` unless a short migration window requires it.

## Smoke test checklist

### Signup

1. Register a new individual account.
2. Verify that email verification mail is delivered.
3. Complete verification and confirm login works.
4. Trigger forgot-password and confirm reset mail delivery and one-time reset success.

### Commercial onboarding

1. Register or upgrade a user to commercial.
2. Submit business profile and minimum document set.
3. Verify status becomes `pending_review`.
4. Reject once from admin and confirm user can resubmit.
5. Approve from admin and confirm listing publish permission opens.

### Listing publish

1. Create a listing draft as an individual user and publish it.
2. Attempt to publish as a commercial user in `pending` state and confirm publish is blocked with the expected message.
3. Create a suspicious or medium-risk listing and confirm it moves to review instead of going directly live.

### Chat and deal flow

1. Start a buyer/seller conversation on a listing.
2. Move the deal to `interest` and `negotiating`.
3. Confirm safe payment acknowledgement is required before `ready_for_notary`.
4. Share vehicle registration details and verify the info card appears in chat.

### Payment and callback

1. Create an insurance quote from admin.
2. Start insurance payment from chat.
3. Confirm the in-app transition screen appears before redirecting to the secure payment page.
4. Confirm `/pay` shows vehicle summary, amount, trust copy, and redirect CTA.
5. Execute a successful callback and verify:
   - payment record becomes `success`
   - duplicate callback does not duplicate fulfillment
   - chat receives `Sigorta isleminiz baslatildi.`
6. Execute a failed callback and verify:
   - payment record becomes `failed`
   - no insurance fulfillment starts
7. Execute an invalid signature or mismatched amount callback and verify:
   - request is rejected or moved to manual review
   - no fake success is recorded

### Insurance delivery

1. Upload policy PDF and invoice PDF from admin.
2. Confirm only HTTPS PDF URLs are accepted.
3. Confirm buyer receives the email with PDF attachments.
4. Confirm chat receives Carloi system message with policy and invoice attachments.

### Admin and monitoring

1. Confirm `/admin/users`, `/admin/listings`, `/admin/messages`, `/admin/commercial`, `/admin/insurance`, `/admin/payments`, `/admin/risk`, and `/admin/audit` load for the correct roles.
2. Confirm a non-admin user cannot access `/admin`.
3. Confirm message content is only visible to `super_admin` and `legal_export_admin`.
4. Confirm admin reject/suspend/revoke/export actions require a reason.
5. Confirm denied admin access creates audit records.

## Rollback notes

- If a deployment must be rolled back, prefer application rollback before schema rollback.
- New schema is additive; old code should continue to read existing data in most cases.
- Do not drop new tables or columns during rollback unless application rollback is impossible and a verified backup exists.
- If payment callback behavior changes unexpectedly, disable external payment entry points first, then inspect payment records marked for manual review.
- If SMTP issues appear in production, do not re-enable insecure TLS fallback silently; use explicit override and document the exception.

## Risky assumptions to verify before launch

- Production Garanti callback payload still needs final field-by-field confirmation against the live bank integration guide.
- GCS signed URL behavior for private PDF delivery should be verified with the actual storage bucket policy.
- Legacy `x-admin-token` fallback should remain disabled in production unless there is a documented temporary need.
- Any commercial or insurance document uploads should be verified against real file sizes from operations, not only sample files.
