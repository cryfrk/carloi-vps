const cors = require('cors');
const express = require('express');
const multer = require('multer');
const path = require('node:path');
const { requestAiReply } = require('./ai');
const { config } = require('./config');
const { sendEmail, sendResetPasswordEmail, sendVerificationEmail, verifyMailerConnection } = require('./mailer');
const { saveUploadedMedia } = require('./mediaStorage');
const { createRateLimiter, releaseRateLimitHit } = require('./rateLimit');
const { buildSystemReadiness } = require('./readiness');
const { assertStartupConfig } = require('./startupChecks');
const { verifySocialIdentity } = require('./socialAuth');
const { repairBrokenTurkishText } = require('./text');
const { logError, logInfo, logWarn } = require('./logger');
const {
  addCommercialAdminNote,
  applyCommercialAdminDecision,
  getCommercialReviewProfileDetail,
  getCommercialStatusSummary,
  listPendingCommercialReviews,
  queueCommercialDocument,
  resubmitCommercialOnboarding,
  saveCommercialProfile,
  submitCommercialOnboarding,
} = require('./modules/commercial/commercial.service');
const {
  getAdminBillingSettings,
  getAdminPaymentDetail,
  getBillingSnapshot,
  handleBillingProviderCallback,
  listAdminPaymentsSummary,
  listAdminSubscriptionPlans,
  listAdminSubscriptionsSummary,
  saveAdminSubscriptionPlan,
  startPaidListingFlow,
  startSubscriptionCheckout,
  updateAdminBillingSettings,
} = require('./modules/billing/subscription.service');
const { isPaymentSuccessLike } = require('./modules/billing/payment-status');
const { appendAuditLog, listAuditLogs } = require('./modules/audit-risk/audit.repository');
const {
  getRiskOverview,
  listRiskFlags,
  listOpenRiskFlags,
  reviewRiskFlag,
} = require('./modules/audit-risk/risk.service');
const {
  ADMIN_ACTION_ALIASES,
  logAdminAction,
} = require('./modules/admin/action-audit.service');
const {
  exportAdminMessageEvidence,
  getAdminDashboardSnapshot,
  getAdminUserDetail,
  listAdminListingsSummary,
  listAdminMessagesSummary,
  listAdminRoleKeysForUser,
  listAdminUsersSummary,
  updateAdminListingModeration,
} = require('./modules/admin/admin.service');
const { ADMIN_PERMISSIONS, ADMIN_ROLES } = require('./modules/admin/permissions');
const { getEffectivePermissions } = require('./modules/admin/access.service');
const {
  requireAdminRouteAccess,
  requireAnyPermission,
  requireCommercialDocumentFileAccess,
  requirePermission,
  requireMessageContentAccess,
  requirePaymentInternalAccess,
} = require('./modules/admin/middleware');
const {
  acknowledgeSafePayment,
  completeSale,
  markReadyForNotary,
  startSaleProcess,
} = require('./modules/sales/service');
const {
  addComment,
  activatePremiumMembership,
  appendAiMessage,
  bootstrapSnapshot,
  clearAiMessages,
  createInsurancePayment,
  createGroupConversation,
  createOrUpdatePost,
  deleteAiMessage,
  deleteAiMessagesAfter,
  deleteConversationMessage,
  deletePost,
  editConversationMessage,
  ensureDirectConversation,
  ensureListingConversation,
  getAiMessageRow,
  getPaymentSession,
  getPublicListingById,
  getPublicPostById,
  getPublicProfileByHandle,
  getUserFromToken,
  listAdminDeals,
  loginAccount,
  logoutAccount,
  recordInsurancePayment,
  registerAccount,
  requestPasswordReset,
  resetPasswordWithCode,
  resetPasswordWithToken,
  resendEmailVerificationCode,
  saveOnboarding,
  sendSmsVerificationCode,
  sendConversationMessage,
  sendInsurancePolicyMail,
  setInsuranceQuote,
  setListingSoldStatus,
  shareListingRegistration,
  signInWithSocialIdentity,
  startSignupVerification,
  toggleFollow,
  toggleListingAgreement,
  toggleReaction,
  toggleRepost,
  trackListing,
  updateAiMessageContent,
  updateProfileMedia,
  updateSettings,
  verifyEmailCode,
  verifySmsCode,
  verifyEmailToken,
  initializeStore,
} = require('./store');
const { buildAuthLink } = require('./notifications');
const { isFeatureEnabled } = require('./modules/feature-flags/config');

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 12,
  message: 'Çok fazla giriş veya kayıt denemesi yapıldı. Lütfen daha sonra tekrar deneyin.',
  keyFn: (request) =>
    `auth:${request.ip}:${request.body?.identifier || request.body?.destination || request.body?.email || 'anon'}`,
});

const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Çok fazla AI isteği gönderildi. Lütfen biraz bekleyin.',
  keyFn: (request) => `ai:${request.user?.id || request.ip}`,
});

const uploadLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 25,
  message: 'Çok fazla medya yükleme denemesi yapıldı. Lütfen daha sonra tekrar deneyin.',
  keyFn: (request) => `upload:${request.user?.id || request.ip}`,
});

const mailTestLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Çok fazla test mail isteği gönderildi. Lütfen daha sonra tekrar deneyin.',
  keyFn: (request) => `mail-test:${request.ip}`,
});

const verifyEmailLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Çok fazla doğrulama denemesi yapıldı. Lütfen biraz bekleyin.',
  keyFn: (request) => `verify-email:${request.ip}:${String(request.body?.email || '').trim().toLowerCase()}`,
});

const resendCodeLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Çok fazla kod yeniden gönderme isteği yapıldı. Lütfen biraz bekleyin.',
  keyFn: (request) => `resend-code:${request.ip}:${String(request.body?.email || '').trim().toLowerCase()}`,
});

function isVerificationMailDeliveryError(error) {
  return (
    error?.statusCode === 503 &&
    String(error?.message || '').includes('Dogrulama e-postasi su anda gonderilemedi')
  );
}

app.disable('x-powered-by');
if (config.trustProxy) {
  app.set('trust proxy', true);
}

app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use((request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-site');

  if (config.requireHttps) {
    const isHttps = request.secure || request.headers['x-forwarded-proto'] === 'https';
    if (!isHttps) {
      response.status(400).json({
        success: false,
        message: 'Güvenli bağlantı zorunludur.',
      });
      return;
    }
  }

  next();
});
app.use('/admin', express.static(path.join(process.cwd(), 'admin')));
if (config.storageDriver === 'local') {
  app.use(
    config.uploadsBasePath,
    express.static(config.uploadDir, {
      fallthrough: false,
      index: false,
      setHeaders: (response, filePath) => {
        if (filePath.toLowerCase().endsWith('.pdf')) {
          response.setHeader('Cache-Control', 'private, max-age=0, no-transform');
          return;
        }

        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    }),
  );
}

function getBearerToken(request) {
  const authorization = request.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) {
    return '';
  }

  return authorization.slice('Bearer '.length).trim();
}

async function sendSnapshot(response, userId, token, extra = {}) {
  response.json({
    success: true,
    ...extra,
    snapshot: await bootstrapSnapshot(userId, token),
  });
}

async function requireAuth(request, response, next) {
  const token = getBearerToken(request);
  const user = await getUserFromToken(token);

  if (!user) {
    response.status(401).json({
      success: false,
      message: 'Oturum bulunamadı veya süresi doldu.',
    });
    return;
  }

  request.authToken = token;
  request.user = user;
  next();
}

function writeAdminAuthAudit(
  request,
  action,
  metadata = {},
  { actorId = null, actorType = 'admin' } = {},
) {
  void appendAuditLog({
    actorType,
    actorId,
    targetType: 'admin_auth',
    targetId: request.originalUrl || request.path || null,
    action,
    metadata: {
      method: request.method,
      routePath: request.route?.path || request.path || null,
      ...metadata,
    },
    ipAddress: request.ip,
    userAgent: request.get('user-agent'),
  }).catch(() => undefined);
}

function requireAdmin(request, response, next) {
  void (async () => {
    const bearerToken = getBearerToken(request);
    const authenticatedUser = bearerToken ? await getUserFromToken(bearerToken) : null;

    if (bearerToken) {
      if (!authenticatedUser) {
        writeAdminAuthAudit(
          request,
          'admin.access.denied',
          {
            authMode: 'session',
            outcome: 'denied',
            reason: 'invalid_session',
          },
          { actorType: 'user' },
        );
        response.status(401).json({
          success: false,
          message: 'Oturum bulunamadi veya suresi doldu.',
        });
        return;
      }

      request.authToken = bearerToken;
      request.user = authenticatedUser;
      try {
        const roleKeys = await resolveAdminRoleKeys(request, authenticatedUser.id);
        request.adminActorId = authenticatedUser.id;
        request.adminRoleKeys = roleKeys;
        request.adminPermissionKeys = getEffectivePermissions(roleKeys);
        writeAdminAuthAudit(
          request,
          'admin.authenticated',
          {
            authMode: 'session',
            outcome: 'allowed',
            roleKeys,
            permissionKeys: request.adminPermissionKeys,
          },
          { actorId: authenticatedUser.id },
        );
        next();
        return;
      } catch (error) {
        writeAdminAuthAudit(
          request,
          'admin.access.denied',
          {
            authMode: 'session',
            outcome: 'denied',
            reason: error.message || 'admin_role_resolution_failed',
          },
          { actorId: authenticatedUser.id, actorType: 'user' },
        );
        next(error);
        return;
      }
    }

    const legacyToken =
      String(request.headers['x-admin-token'] || '').trim() ||
      String(request.query.token || '').trim();

    const legacyTokenAllowed =
      config.nodeEnv !== 'production' || config.allowLegacyAdminTokenInProduction;

    if (legacyToken && !legacyTokenAllowed) {
      writeAdminAuthAudit(
        request,
        'admin.access.denied',
        {
          authMode: 'legacy_token',
          outcome: 'denied',
          reason: 'legacy_token_disabled_in_production',
        },
        { actorType: 'system' },
      );
      logWarn('admin.legacy_token.denied', {
        path: request.originalUrl || request.path,
        ipAddress: request.ip,
      });
      response.status(401).json({
        success: false,
        message: 'Admin oturumunu mevcut kullanici oturumu ile acin.',
      });
      return;
    }

    if (!config.adminToken || legacyToken !== config.adminToken) {
      writeAdminAuthAudit(
        request,
        'admin.access.denied',
        {
          authMode: 'legacy_token',
          outcome: 'denied',
          reason: 'invalid_legacy_token',
        },
        { actorType: 'system' },
      );
      response.status(401).json({
        success: false,
        message: 'Admin yetkisi bulunamadi.',
      });
      return;
    }

    const actorId = getAdminActorId(request);
    try {
      const roleKeys = await resolveAdminRoleKeys(request, actorId);
      request.adminActorId = actorId;
      request.adminRoleKeys = roleKeys;
      request.adminPermissionKeys = getEffectivePermissions(roleKeys);
      writeAdminAuthAudit(
        request,
        'admin.authenticated',
        {
          authMode: 'legacy_token',
          outcome: 'allowed',
          roleKeys,
          permissionKeys: request.adminPermissionKeys,
        },
        { actorId: actorId || null, actorType: actorId ? 'admin' : 'system' },
      );
      if (config.nodeEnv === 'production') {
        logWarn('admin.legacy_token.used', {
          actorId: actorId || null,
          path: request.originalUrl || request.path,
          ipAddress: request.ip,
          roleKeys,
        });
      }
      next();
    } catch (error) {
      writeAdminAuthAudit(
        request,
        'admin.access.denied',
        {
          authMode: 'legacy_token',
          outcome: 'denied',
          reason: error.message || 'admin_role_resolution_failed',
        },
        { actorId: actorId || null, actorType: actorId ? 'admin' : 'system' },
      );
      next(error);
    }
  })().catch((error) => {
    writeAdminAuthAudit(
      request,
      'admin.access.denied',
      {
        authMode: getBearerToken(request) ? 'session' : 'legacy_token',
        outcome: 'denied',
        reason: error.message || 'unexpected_admin_auth_error',
      },
      {
        actorId: String(request.user?.id || request.adminActorId || '').trim() || null,
        actorType: request.user ? 'user' : 'system',
      },
    );
    next(error);
  });
}

function getAdminActorId(request) {
  return (
    String(
      request.adminActorId ||
        request.user?.id ||
      request.headers['x-admin-user-id'] ||
        request.headers['x-admin-id'] ||
        request.body?.adminUserId ||
        request.body?.adminId ||
        '',
    ).trim() || ''
  );
}

function parseAdminRolesFromHeader(rawValue) {
  const normalized = String(rawValue || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const knownRoles = new Set(Object.values(ADMIN_ROLES));
  return Array.from(new Set(normalized.filter((roleKey) => knownRoles.has(roleKey))));
}

async function resolveAdminRoleKeys(request, actorId) {
  const headerRoles = parseAdminRolesFromHeader(
    request.headers['x-admin-roles'] || request.headers['x-admin-role'],
  );
  if (headerRoles.length) {
    return headerRoles;
  }

  if (actorId) {
    const roleKeys = await listAdminRoleKeysForUser(actorId);
    if (roleKeys.length) {
      return roleKeys;
    }

    const error = new Error('Admin rol atamasi bulunamadi.');
    error.statusCode = 403;
    throw error;
  }

  const error = new Error('Admin rol atamasi bulunamadi.');
  error.statusCode = 403;
  throw error;
}

app.get('/health', (_request, response) => {
  response.json({
    success: true,
    name: 'Carloi API',
    port: config.port,
    storageDriver: config.storageDriver,
    databaseMode: config.databaseUrl ? 'postgresql' : 'sqlite-inmemory-dev',
  });
});

app.get('/api/public/posts/:postId', async (request, response, next) => {
  try {
    const post = await getPublicPostById(request.params.postId);
    if (!post) {
      response.status(404).json({
        success: false,
        message: 'Gönderi bulunamadı.',
      });
      return;
    }

    response.json({
      success: true,
      post,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/public/listings/:postId', async (request, response, next) => {
  try {
    const listing = await getPublicListingById(request.params.postId);
    if (!listing) {
      response.status(404).json({
        success: false,
        message: 'İlan bulunamadı.',
      });
      return;
    }

    response.json({
      success: true,
      post: listing,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/public/profiles/:handle', async (request, response, next) => {
  try {
    const profilePage = await getPublicProfileByHandle(request.params.handle);
    if (!profilePage) {
      response.status(404).json({
        success: false,
        message: 'Profil bulunamadı.',
      });
      return;
    }

    response.json({
      success: true,
      ...profilePage,
    });
  } catch (error) {
    next(error);
  }
});

const handleTestEmail = async (request, response, next) => {
  try {
    const to = String(request.body?.to || '').trim();
    if (!to) {
      response.status(400).json({
        success: false,
        message: 'Test mail için alıcı adresi zorunludur.',
      });
      return;
    }

    await sendEmail(
      to,
      'Carloi SMTP test maili',
      '<p>Carloi SMTP bağlantısı başarıyla çalışıyor.</p>',
      'Carloi SMTP bağlantısı başarıyla çalışıyor.',
    );

    response.status(201).json({
      success: true,
      message: `Test maili ${to} adresine gönderildi.`,
    });
  } catch (error) {
    next(error);
  }
};

if (config.nodeEnv === 'production') {
  app.post('/api/test-email', requireAdmin, mailTestLimiter, handleTestEmail);
} else {
  app.post('/api/test-email', mailTestLimiter, handleTestEmail);
  app.post('/api/test-verification-email', mailTestLimiter, async (request, response, next) => {
    try {
      const to = String(request.body?.to || '').trim();
      if (!to) {
        response.status(400).json({
          success: false,
          message: 'Test verification maili için alıcı adresi zorunludur.',
        });
        return;
      }

      const verificationUrl = buildAuthLink('/auth/verify-email', {
        token: 'dev-verification-token',
      });

      await sendVerificationEmail(to, verificationUrl);

      response.status(201).json({
        success: true,
        message: `Verification maili ${to} adresine gönderildi.`,
        url: verificationUrl,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/test-reset-email', mailTestLimiter, async (request, response, next) => {
    try {
      const to = String(request.body?.to || '').trim();
      if (!to) {
        response.status(400).json({
          success: false,
          message: 'Test reset maili için alıcı adresi zorunludur.',
        });
        return;
      }

      const resetUrl = buildAuthLink('/reset-password', {
        token: 'dev-reset-token',
      });

      await sendResetPasswordEmail(to, resetUrl);

      response.status(201).json({
        success: true,
        message: `Reset maili ${to} adresine gönderildi.`,
        url: resetUrl,
      });
    } catch (error) {
      next(error);
    }
  });
}

app.post('/api/media/upload', requireAuth, uploadLimiter, upload.single('file'), (request, response, next) => {
  (async () => {
    if (!request.file) {
      response.status(400).json({
        success: false,
        message: 'Yüklenecek dosya bulunamadı.',
      });
      return;
    }

    const url = await saveUploadedMedia(request.file);

    response.status(201).json({
      success: true,
      url,
    });
  })().catch((error) => {
    next(error);
  });
});

app.post('/api/auth/verification/start', authLimiter, async (request, response, next) => {
  try {
    const result = await startSignupVerification(
      request.body?.channel === 'phone' ? 'phone' : 'email',
      request.body?.destination,
    );
    response.status(201).json({
      success: true,
      verificationId: result.verificationId,
      expiresAt: result.expiresAt,
      maskedDestination: result.maskedDestination,
      message: 'Doğrulama kodu gönderildi.',
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/send-sms-code', requireAuth, async (request, response, next) => {
  try {
    const result = await sendSmsVerificationCode(request.user.id, request.body?.phone);
    response.status(201).json({
      success: true,
      message: 'SMS dogrulama kodu gonderildi.',
      verificationId: result.verificationId,
      expiresAt: result.expiresAt,
      maskedDestination: result.maskedDestination,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/verify-sms-code', requireAuth, async (request, response, next) => {
  try {
    const result = await verifySmsCode(request.user.id, request.body?.code, request.body?.phone);
    response.json({
      success: true,
      message: 'SMS dogrulamasi tamamlandi.',
      maskedDestination: result.maskedDestination,
      verifiedAt: result.verifiedAt,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/register', authLimiter, async (request, response, next) => {
  try {
    logInfo('auth.register.http_requested', {
      accountType: request.body?.accountType || 'individual',
      emailProvided: Boolean(String(request.body?.email || '').trim()),
      handleProvided: Boolean(String(request.body?.handle || '').trim()),
      ipAddress: request.ip,
    });
    const result = await registerAccount(request.body || {}, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
      logInfo('auth.register.http_succeeded', {
        accountType: request.body?.accountType || 'individual',
        email: result.email || '',
        deliveryFailed: Boolean(result.deliveryFailed),
        emailDisabled: Boolean(result.emailDisabled),
        emailNotConfigured: Boolean(result.emailNotConfigured),
        ipAddress: request.ip,
      });
      response.status(201).json({
        success: true,
        message: result.message,
        email: result.email,
        expiresAt: result.expiresAt,
        maskedDestination: result.maskedDestination,
        deliveryFailed: result.deliveryFailed,
        emailDisabled: result.emailDisabled,
        emailNotConfigured: result.emailNotConfigured,
      });
  } catch (error) {
    logError('auth.register.http_failed', {
      accountType: request.body?.accountType || 'individual',
      emailProvided: Boolean(String(request.body?.email || '').trim()),
      statusCode: error?.statusCode || 500,
      errorMessage: error?.message || 'unknown',
      ipAddress: request.ip,
    });
    if (isVerificationMailDeliveryError(error)) {
      await releaseRateLimitHit(request.rateLimitState);
    }
    next(error);
  }
});

async function handleVerifyEmail(request, response, next) {
  try {
    const result = await verifyEmailCode(request.body?.email, request.body?.code);
    response.json({
      success: true,
      message: 'E-posta doğrulandı.',
      token: result.token,
      snapshot: result.snapshot,
    });
  } catch (error) {
    next(error);
  }
}

async function handleVerifyEmailToken(request, response, next) {
  try {
    const result = await verifyEmailToken(request.query?.token);
    response.json({
      success: true,
      message: result.message || 'E-posta doğrulandı.',
      token: result.token,
      snapshot: result.snapshot,
    });
  } catch (error) {
    next(error);
  }
}

async function handleResendCode(request, response, next) {
  try {
    const result = await resendEmailVerificationCode(request.body?.email);
    response.status(201).json({
      success: true,
      message:
        result.emailDisabled || result.emailNotConfigured
          ? 'E-posta servisi henüz aktif değil. Lütfen daha sonra tekrar deneyin.'
          : result.skipped
            ? 'Hesap uygun durumdaysa doğrulama e-postası yeniden gönderildi.'
            : 'Doğrulama e-postası yeniden gönderildi.',
      email: result.email,
      expiresAt: result.expiresAt,
      maskedDestination: result.maskedDestination,
      deliveryFailed: result.deliveryFailed,
      emailDisabled: result.emailDisabled,
      emailNotConfigured: result.emailNotConfigured,
    });
  } catch (error) {
    if (isVerificationMailDeliveryError(error)) {
      await releaseRateLimitHit(request.rateLimitState);
    }
    next(error);
  }
}

app.get('/auth/verify-email', handleVerifyEmailToken);
app.get('/api/auth/verify-email', handleVerifyEmailToken);
app.post('/verify-email', verifyEmailLimiter, handleVerifyEmail);
app.post('/resend-code', resendCodeLimiter, handleResendCode);
app.post('/auth/verify-email', verifyEmailLimiter, handleVerifyEmail);
app.post('/auth/resend-verification-code', resendCodeLimiter, handleResendCode);
app.post('/api/auth/verify-email', verifyEmailLimiter, handleVerifyEmail);
app.post('/api/auth/resend-code', resendCodeLimiter, handleResendCode);
app.post('/api/auth/resend-verification-code', resendCodeLimiter, handleResendCode);

async function handleForgotPassword(request, response, next) {
  try {
    const result = await requestPasswordReset(request.body?.email);
    response.status(201).json({
      success: true,
      message:
        result.emailDisabled || result.emailNotConfigured
          ? 'E-posta servisi henüz aktif değil. Lütfen daha sonra tekrar deneyin.'
          : 'Hesap uygunsa şifre sıfırlama bağlantısı e-posta adresine gönderildi.',
      deliveryFailed: result.deliveryFailed,
      emailDisabled: result.emailDisabled,
      emailNotConfigured: result.emailNotConfigured,
    });
  } catch (error) {
    next(error);
  }
}

async function handleResetPassword(request, response, next) {
  try {
    const result = request.body?.token
      ? await resetPasswordWithToken(request.body?.token, request.body?.newPassword || request.body?.password)
      : await resetPasswordWithCode(
          request.body?.email,
          request.body?.code,
          request.body?.newPassword || request.body?.password,
        );
    response.json({
      success: true,
      message: 'Şifre güncellendi.',
      token: result.token,
      snapshot: result.snapshot,
    });
  } catch (error) {
    next(error);
  }
}

app.post('/auth/forgot-password', resendCodeLimiter, handleForgotPassword);
app.post('/api/auth/forgot-password', resendCodeLimiter, handleForgotPassword);
app.post('/auth/reset-password', verifyEmailLimiter, handleResetPassword);
app.post('/api/auth/reset-password', verifyEmailLimiter, handleResetPassword);

app.post('/api/auth/login', authLimiter, async (request, response, next) => {
  try {
    const result = await loginAccount(request.body?.identifier, request.body?.password);
    response.json({
      success: true,
      token: result.token,
      snapshot: result.snapshot,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/social', authLimiter, async (request, response, next) => {
  try {
    const identity = await verifySocialIdentity(request.body || {});
    const result = await signInWithSocialIdentity({
      provider: identity.provider,
      subject: identity.subject,
      email: identity.email,
      fullName: request.body?.fullName || identity.fullName,
      avatarUri: identity.avatarUri,
    });

    response.json({
      success: true,
      token: result.token,
      snapshot: result.snapshot,
      message:
        identity.provider === 'apple'
          ? 'iCloud hesabı ile giriş yapıldı.'
          : 'Google hesabı ile giriş yapıldı.',
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', requireAuth, async (request, response, next) => {
  try {
    await logoutAccount(request.authToken);
    response.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/bootstrap', requireAuth, async (request, response, next) => {
  try {
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.put('/api/onboarding', requireAuth, async (request, response, next) => {
  try {
    await saveOnboarding(request.user.id, request.body || {});
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/profile/settings', requireAuth, async (request, response, next) => {
  try {
    await updateSettings(request.user.id, request.body || {});
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/profile/media', requireAuth, async (request, response, next) => {
  try {
    await updateProfileMedia(request.user.id, request.body || {});
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.get('/api/commercial/status', requireAuth, async (request, response, next) => {
  try {
    response.json({
      success: true,
      commercial: await getCommercialStatusSummary(request.user.id),
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/commercial/profile', requireAuth, async (request, response, next) => {
  try {
    await saveCommercialProfile(request.user.id, request.body || {}, {
      actorType: 'user',
      actorId: request.user.id,
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
    await sendSnapshot(response, request.user.id, request.authToken, {
      message: 'Ticari hesap taslagi kaydedildi.',
    });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/commercial/profile', requireAuth, async (request, response, next) => {
  try {
    await saveCommercialProfile(request.user.id, request.body || {}, {
      actorType: 'user',
      actorId: request.user.id,
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
    await sendSnapshot(response, request.user.id, request.authToken, {
      message: 'Ticari hesap bilgileri guncellendi.',
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/commercial/documents', requireAuth, async (request, response, next) => {
  try {
    await queueCommercialDocument(request.user.id, request.body || {}, {
      actorType: 'user',
      actorId: request.user.id,
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
    await sendSnapshot(response, request.user.id, request.authToken, {
      message:
        'Belge yüklendi. Platform incelemesi sirasinda ek dogrulama istenebilir.',
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/commercial/submit', requireAuth, async (request, response, next) => {
  try {
    await submitCommercialOnboarding(request.user.id, request.body || {}, {
      actorType: 'user',
      actorId: request.user.id,
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
    await sendSnapshot(response, request.user.id, request.authToken, {
      message:
        'Ticari hesap basvurusu platform incelemesine gonderildi. Gerekirse ek dogrulama istenebilir.',
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/commercial/resubmit', requireAuth, async (request, response, next) => {
  try {
    await resubmitCommercialOnboarding(request.user.id, request.body || {}, {
      actorType: 'user',
      actorId: request.user.id,
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
    await sendSnapshot(response, request.user.id, request.authToken, {
      message:
        'Ticari hesap basvurusu yeniden platform incelemesine gonderildi. Gerekirse ek dogrulama istenebilir.',
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/profile/follow', requireAuth, async (request, response, next) => {
  try {
    await toggleFollow(request.user.id, request.body?.handle);
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.post('/api/posts', requireAuth, async (request, response, next) => {
  try {
    const result = await createOrUpdatePost(request.user.id, request.body || {}, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
      await sendSnapshot(response, request.user.id, request.authToken, {
        message: result?.message,
        listingFlow: result?.listingFlow,
        url: result?.url,
      });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/posts/:postId', requireAuth, async (request, response, next) => {
  try {
    await deletePost(request.user.id, request.params.postId);
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.post('/api/posts/:postId/sold', requireAuth, async (request, response, next) => {
  try {
    await setListingSoldStatus(request.user.id, request.params.postId, Boolean(request.body?.isSold));
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.post('/api/posts/:postId/like', requireAuth, async (request, response, next) => {
  try {
    await toggleReaction(request.user.id, request.params.postId, 'like');
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.post('/api/posts/:postId/save', requireAuth, async (request, response, next) => {
  try {
    await toggleReaction(request.user.id, request.params.postId, 'save');
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.post('/api/posts/:postId/repost', requireAuth, async (request, response, next) => {
  try {
    await toggleRepost(request.user.id, request.params.postId);
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.post('/api/posts/:postId/comment', requireAuth, async (request, response, next) => {
  try {
    await addComment(request.user.id, request.params.postId, request.body?.content || '');
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.post('/api/posts/:postId/track', requireAuth, async (request, response, next) => {
  try {
    await trackListing(request.user.id, request.params.postId, request.body?.kind);
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.post('/api/sales/:listingId/start', requireAuth, async (request, response, next) => {
  try {
    response.status(201).json({
      success: true,
      message: 'Satis sureci baslatildi. Resmi guvenli odeme yonlendirmesi takip edilmelidir.',
      saleProcess: await startSaleProcess(request.params.listingId, request.user.id, {
        actorType: 'user',
        actorId: request.user.id,
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      }),
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/sales/:listingId/ack-safe-payment', requireAuth, async (request, response, next) => {
  try {
    response.json({
      success: true,
      message:
        'Guvenli odeme bilgilendirmesi kaydedildi. Platform odeme emanet kurumu degildir; resmi surec takip edilmelidir.',
      saleProcess: await acknowledgeSafePayment(
        request.params.listingId,
        request.user.id,
        request.body?.consents,
        {
          actorType: 'user',
          actorId: request.user.id,
          ipAddress: request.ip,
          userAgent: request.get('user-agent'),
        },
      ),
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/sales/:listingId/ready-for-notary', requireAuth, async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Satis sureci noter hazirlik adimina tasindi.',
      saleProcess: await markReadyForNotary(request.params.listingId, request.user.id, {
        actorType: 'user',
        actorId: request.user.id,
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      }),
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/sales/:listingId/complete', requireAuth, async (request, response, next) => {
  try {
    response.json({
      success: true,
      message: 'Satis sureci tamamlandi olarak isaretlendi.',
      saleProcess: await completeSale(request.params.listingId, request.user.id, {
        actorType: 'user',
        actorId: request.user.id,
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      }),
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/conversations/direct', requireAuth, async (request, response, next) => {
  try {
    await ensureDirectConversation(request.user.id, request.body?.handle);
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.post('/api/conversations/listing', requireAuth, async (request, response, next) => {
  try {
    await ensureListingConversation(request.user.id, request.body?.postId);
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.post('/api/conversations/group', requireAuth, async (request, response, next) => {
  try {
    await createGroupConversation(request.user.id, request.body?.handles || [], request.body?.name);
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.post('/api/conversations/:conversationId/messages', requireAuth, async (request, response, next) => {
  try {
    await sendConversationMessage(
      request.user.id,
      request.params.conversationId,
      request.body?.text || '',
      request.body?.attachments || [],
    );
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/conversations/:conversationId/messages/:messageId', requireAuth, async (request, response, next) => {
  try {
    await editConversationMessage(
      request.user.id,
      request.params.conversationId,
      request.params.messageId,
      repairBrokenTurkishText(request.body?.text || ''),
    );
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.post('/api/conversations/:conversationId/messages/:messageId/delete', requireAuth, async (request, response, next) => {
  try {
    await deleteConversationMessage(
      request.user.id,
      request.params.conversationId,
      request.params.messageId,
      request.body?.scope === 'everyone' ? 'everyone' : 'self',
    );
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.post('/api/conversations/:conversationId/agreement', requireAuth, async (request, response, next) => {
  try {
    await toggleListingAgreement(request.user.id, request.params.conversationId);
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.post('/api/conversations/:conversationId/registration/share', requireAuth, async (request, response, next) => {
  try {
    await shareListingRegistration(request.user.id, request.params.conversationId, request.body || {}, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.post('/api/conversations/:conversationId/insurance/pay', requireAuth, async (request, response, next) => {
  try {
    const payment = await createInsurancePayment(
      request.user.id,
      request.params.conversationId,
      request.body || {},
      {
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      },
    );
    await sendSnapshot(response, request.user.id, request.authToken, {
      url: payment.paymentUrl,
      payment,
      message: 'Guvenli odeme sayfasina yonlendiriliyorsunuz.',
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/payment/initiate', requireAuth, async (request, response, next) => {
  try {
    if ((request.body?.flow && request.body.flow !== 'insurance') || !request.body?.conversationId) {
      response.status(400).json({
        success: false,
        message: 'Su an yalnizca sigorta odeme akisi destekleniyor.',
      });
      return;
    }

    const payment = await createInsurancePayment(
      request.user.id,
      request.body.conversationId,
      request.body || {},
      {
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      },
    );

    response.status(201).json({
      success: true,
      message: 'Guvenli odeme sayfasina yonlendiriliyorsunuz.',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/payment/session/:paymentReference', async (request, response, next) => {
  try {
    response.json({
      success: true,
      data: await getPaymentSession(request.params.paymentReference),
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/billing/premium/activate', requireAuth, async (request, response, next) => {
  try {
    const membership = await activatePremiumMembership(request.user.id, request.body || {}, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
    await sendSnapshot(response, request.user.id, request.authToken, {
      membership,
      message: 'Premium üyelik doğrulandı ve hesabınıza tanımlandı.',
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/billing/snapshot', requireAuth, async (request, response, next) => {
  try {
    response.json({
      success: true,
      data: await getBillingSnapshot(request.user.id),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/billing/plans', requireAuth, async (request, response, next) => {
  try {
    const snapshot = await getBillingSnapshot(request.user.id);
    response.json({
      success: true,
      data: {
        plans: snapshot.plans,
        settings: snapshot.settings,
        flags: snapshot.flags,
        subscription: snapshot.subscription,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/billing/subscribe', requireAuth, async (request, response, next) => {
  try {
    const result = await startSubscriptionCheckout({
      user: request.user,
      planCode: request.body?.planCode,
      consents: request.body?.consents,
      requestMeta: {
        actorType: 'user',
        actorId: request.user.id,
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      },
    });

    await sendSnapshot(response, request.user.id, request.authToken, {
      message: result.message,
      url: result.paymentUrl,
      data: {
        paymentRecord: result.paymentRecord,
        plan: result.plan,
        subscription: result.subscription || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/billing/pay-listing', requireAuth, async (request, response, next) => {
  try {
    const result = await startPaidListingFlow({
      user: request.user,
      listingId: request.body?.listingId,
      featuredRequested: Boolean(request.body?.featuredRequested),
      consents: request.body?.consents,
      requestMeta: {
        actorType: 'user',
        actorId: request.user.id,
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      },
    });

    await sendSnapshot(response, request.user.id, request.authToken, {
      message: result.message,
      url: result.paymentUrl,
      data: {
        paymentRecord: result.paymentRecord,
        paymentRequired: result.paymentRequired,
        requirementKind: result.requirementKind,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/billing/garanti/callback', async (request, response, next) => {
  try {
    if (
      config.paymentCallbackToken &&
      request.get('x-payment-callback-token') !== config.paymentCallbackToken
    ) {
      await appendAuditLog({
        actorType: 'system',
        actorId: null,
        targetType: 'payment_callback',
        targetId: null,
        action: 'billing.provider_callback_denied',
        metadata: {
          reason: 'invalid_callback_token',
        },
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      });

      const error = new Error('Odeme callback istegi yetkisiz.');
      error.statusCode = 401;
      throw error;
    }

    const result = await handleBillingProviderCallback(request.body || {}, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
      callbackSignature:
        request.get(config.paymentCallbackSignatureHeader) ||
        request.body?.signature ||
        request.body?.paymentSignature ||
        request.body?.hashData ||
        request.body?.hashedData,
    });

    if (
      result?.paymentRecord?.type === 'insurance_related' &&
      isPaymentSuccessLike(result.paymentRecord.status) &&
      result.paymentRecord.metadata?.conversationId
    ) {
      try {
        await recordInsurancePayment(
          result.paymentRecord.metadata.conversationId,
          result.paymentRecord.externalRef || request.body?.paymentReference,
        );
      } catch (error) {
        await appendAuditLog({
          actorType: 'system',
          actorId: null,
          targetType: 'payment',
          targetId: result.paymentRecord.id,
          action: 'insurance.payment_manual_review_required',
          metadata: {
            reason: 'post_payment_insurance_processing_failed',
            conversationId: result.paymentRecord.metadata?.conversationId || null,
            errorMessage: error.message,
          },
          ipAddress: request.ip,
          userAgent: request.get('user-agent'),
        });

        response.status(202).json({
          success: true,
          data: {
            ...result,
            manualReviewRequired: true,
            message: 'Odeme onaylandi ancak sigorta islemi manuel incelemeye alindi.',
          },
        });
        return;
      }
    }

    response.status(result?.manualReviewRequired ? 202 : 200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/payments/insurance/callback', async (request, response, next) => {
  try {
    await recordInsurancePayment(request.body?.conversationId, request.body?.paymentReference);
    response.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get(
  '/api/admin/deals',
  requireAdmin,
  requireAdminRouteAccess('/admin/insurance'),
  requirePermission(ADMIN_PERMISSIONS.INSURANCE_READ),
  async (request, response, next) => {
    try {
      response.json({
        success: true,
        deals: await listAdminDeals(),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  '/api/admin/system/status',
  requireAdmin,
  requireAdminRouteAccess('/admin/settings'),
  requirePermission(ADMIN_PERMISSIONS.SETTINGS_READ),
  (_request, response, next) => {
    try {
      response.json({
        success: true,
        system: buildSystemReadiness(),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  '/api/admin/dashboard',
  requireAdmin,
  requireAdminRouteAccess('/admin/dashboard'),
  requirePermission(ADMIN_PERMISSIONS.DASHBOARD_READ),
  async (_request, response, next) => {
    try {
      response.json({
        success: true,
        dashboard: await getAdminDashboardSnapshot(),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  '/api/admin/users',
  requireAdmin,
  requireAdminRouteAccess('/admin/users'),
  requirePermission(ADMIN_PERMISSIONS.USERS_READ),
  async (request, response, next) => {
    try {
      response.json({
        success: true,
        users: await listAdminUsersSummary({
          limit: Number(request.query.limit || 100),
          query: request.query.q,
          accountType: request.query.accountType,
          commercialStatus: request.query.commercialStatus,
          riskLevel: request.query.riskLevel,
          commercialBehaviorOnly: String(request.query.commercialBehaviorOnly || '').trim() === 'true',
        }),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  '/api/admin/users/:userId',
  requireAdmin,
  requireAdminRouteAccess('/admin/users/:id'),
  requirePermission(ADMIN_PERMISSIONS.USERS_DETAIL_READ),
  async (request, response, next) => {
    try {
      const detail = await getAdminUserDetail(request.params.userId, {
        includePaymentInternals: Array.isArray(request.adminRoleKeys)
          ? request.adminRoleKeys.includes(ADMIN_ROLES.SUPER_ADMIN)
          : false,
      });

      if (!detail) {
        response.status(404).json({
          success: false,
          message: 'Kullanici bulunamadi.',
        });
        return;
      }

      response.json({
        success: true,
        user: detail,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  '/api/admin/listings',
  requireAdmin,
  requireAdminRouteAccess('/admin/listings'),
  requirePermission(ADMIN_PERMISSIONS.LISTINGS_READ),
  async (request, response, next) => {
    try {
      response.json({
        success: true,
        listings: await listAdminListingsSummary({
          limit: Number(request.query.limit || 100),
          query: request.query.q,
          status: String(request.query.status || '').trim() || undefined,
          riskLevel: String(request.query.riskLevel || '').trim() || undefined,
          suspiciousOnly: String(request.query.suspicious || '').trim() === 'true',
          duplicatePlateOnly: String(request.query.duplicatePlate || '').trim() === 'true',
          abnormalPriceOnly: String(request.query.abnormalPrice || '').trim() === 'true',
        }),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  '/api/admin/listings/:postId/suspend',
  requireAdmin,
  requireAdminRouteAccess('/admin/listings'),
  requirePermission(ADMIN_PERMISSIONS.LISTINGS_SUSPEND),
  async (request, response, next) => {
    try {
      const result = await updateAdminListingModeration(request.params.postId, 'suspend', {
        adminId: getAdminActorId(request),
        reason: request.body?.reason,
      });

      if (!result) {
        response.status(404).json({
          success: false,
          message: 'Ilan bulunamadi.',
        });
        return;
      }

      await logAdminAction({
        actorId: getAdminActorId(request),
        action: ADMIN_ACTION_ALIASES.suspendListing,
        targetType: 'listing',
        targetId: request.params.postId,
        reason: request.body?.reason,
        metadata: {
          previousStatus: result.previousStatus,
          nextStatus: result.nextStatus,
        },
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      });

      response.json({
        success: true,
        message: 'Ilan askiya alindi.',
        listing: result.listing,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  '/api/admin/listings/:postId/reject',
  requireAdmin,
  requireAdminRouteAccess('/admin/listings'),
  requirePermission(ADMIN_PERMISSIONS.LISTINGS_REJECT),
  async (request, response, next) => {
    try {
      const result = await updateAdminListingModeration(request.params.postId, 'reject', {
        adminId: getAdminActorId(request),
        reason: request.body?.reason,
      });

      if (!result) {
        response.status(404).json({
          success: false,
          message: 'Ilan bulunamadi.',
        });
        return;
      }

      await logAdminAction({
        actorId: getAdminActorId(request),
        action: ADMIN_ACTION_ALIASES.rejectListing,
        targetType: 'listing',
        targetId: request.params.postId,
        reason: request.body?.reason,
        metadata: {
          previousStatus: result.previousStatus,
          nextStatus: result.nextStatus,
        },
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      });

      response.json({
        success: true,
        message: 'Ilan reddedildi.',
        listing: result.listing,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  '/api/admin/listings/:postId/restore',
  requireAdmin,
  requireAdminRouteAccess('/admin/listings'),
  requirePermission(ADMIN_PERMISSIONS.LISTINGS_RESTORE),
  async (request, response, next) => {
    try {
      const result = await updateAdminListingModeration(request.params.postId, 'restore', {
        adminId: getAdminActorId(request),
        reason: request.body?.reason,
      });

      if (!result) {
        response.status(404).json({
          success: false,
          message: 'Ilan bulunamadi.',
        });
        return;
      }

      await logAdminAction({
        actorId: getAdminActorId(request),
        action: 'listings.restore',
        targetType: 'listing',
        targetId: request.params.postId,
        reason: request.body?.reason,
        metadata: {
          previousStatus: result.previousStatus,
          nextStatus: result.nextStatus,
        },
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      });

      response.json({
        success: true,
        message: 'Ilan tekrar aktif kuyruga alindi.',
        listing: result.listing,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  '/api/admin/messages',
  requireAdmin,
  requireAdminRouteAccess('/admin/messages'),
  requirePermission(ADMIN_PERMISSIONS.MESSAGES_METADATA_READ),
  async (request, response, next) => {
    try {
      if (String(request.query.includeContent || '').trim() === 'true') {
        response.status(400).json({
          success: false,
          message: 'Mesaj icerigi icin /api/admin/messages/content endpointini kullanin.',
        });
        return;
      }

      response.json({
        success: true,
        ...(await listAdminMessagesSummary({
          limit: Number(request.query.limit || 40),
          includeContent: false,
          roleKeys: Array.isArray(request.adminRoleKeys) ? request.adminRoleKeys : [],
        })),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  '/api/admin/messages/content',
  requireAdmin,
  requireAdminRouteAccess('/admin/messages'),
  requirePermission(ADMIN_PERMISSIONS.MESSAGES_CONTENT_READ),
  requireMessageContentAccess,
  async (request, response, next) => {
    try {
      await logAdminAction({
        actorId: getAdminActorId(request),
        action: 'messages.content.view',
        targetType: 'message_collection',
        targetId: null,
        metadata: {
          limit: Number(request.query.limit || 40),
        },
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      });

      response.json({
        success: true,
        ...(await listAdminMessagesSummary({
          limit: Number(request.query.limit || 40),
          includeContent: true,
          roleKeys: Array.isArray(request.adminRoleKeys) ? request.adminRoleKeys : [],
        })),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  '/api/admin/messages/export',
  requireAdmin,
  requireAdminRouteAccess('/admin/messages'),
  requirePermission(ADMIN_PERMISSIONS.MESSAGES_EVIDENCE_EXPORT),
  requireMessageContentAccess,
  async (request, response, next) => {
    try {
      if (!isFeatureEnabled('enableAdminEvidenceExports')) {
        const error = new Error('Legal export akisi feature flag ile kapali.');
        error.statusCode = 403;
        throw error;
      }

      const bundle = await exportAdminMessageEvidence(String(request.body?.conversationId || '').trim());
      if (!bundle) {
        response.status(404).json({
          success: false,
          message: 'Conversation bulunamadi.',
        });
        return;
      }

      await logAdminAction({
        actorId: getAdminActorId(request),
        action: ADMIN_ACTION_ALIASES.exportMessageEvidence,
        targetType: 'conversation',
        targetId: String(request.body?.conversationId || '').trim(),
        reason: request.body?.reason,
        metadata: {
          exportedAt: bundle.exportedAt,
          messageCount: bundle.conversation?.messages?.length || 0,
        },
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      });

      response.json({
        success: true,
        bundle,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  '/api/admin/risk',
  requireAdmin,
  requireAdminRouteAccess('/admin/risk'),
  requirePermission(ADMIN_PERMISSIONS.RISK_READ),
  async (request, response, next) => {
    try {
      response.json({
        success: true,
        overview: await getRiskOverview(),
        riskFlags: await listRiskFlags({
          status: String(request.query.status || '').trim() || undefined,
          limit: Number(request.query.limit || 100),
        }),
        openRiskFlags: await listOpenRiskFlags(Number(request.query.openLimit || 20)),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  '/api/admin/risk-flags/:flagId/review',
  requireAdmin,
  requireAdminRouteAccess('/admin/risk'),
  requirePermission(ADMIN_PERMISSIONS.RISK_REVIEW),
  async (request, response, next) => {
    try {
      const reviewed = await reviewRiskFlag(request.params.flagId, {
        status: request.body?.status,
        notes: request.body?.notes,
        reviewedAt: new Date().toISOString(),
        reviewedByAdminId: getAdminActorId(request),
      });

      if (!reviewed) {
        response.status(404).json({
          success: false,
          message: 'Risk flag bulunamadi.',
        });
        return;
      }

      await logAdminAction({
        actorId: getAdminActorId(request),
        action:
          request.body?.status === 'confirmed'
            ? ADMIN_ACTION_ALIASES.confirmRiskFlag
            : 'risk.review',
        targetType: 'risk_flag',
        targetId: request.params.flagId,
        reason: request.body?.reason || request.body?.notes,
        metadata: {
          status: reviewed.status,
          notes: reviewed.notes || null,
        },
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      });

      response.json({
        success: true,
        riskFlag: reviewed,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  '/api/admin/audit',
  requireAdmin,
  requireAdminRouteAccess('/admin/audit'),
  requirePermission(ADMIN_PERMISSIONS.AUDIT_READ),
  async (request, response, next) => {
    try {
      response.json({
        success: true,
        logs: await listAuditLogs(Number(request.query.limit || 100)),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  '/api/admin/commercial/reviews',
  requireAdmin,
  requireAdminRouteAccess('/admin/commercial'),
  requirePermission(ADMIN_PERMISSIONS.COMMERCIAL_READ),
  async (request, response, next) => {
    try {
      response.json({
        success: true,
        reviews: await listPendingCommercialReviews(
          String(request.query.status || 'pending_review').trim() || 'pending_review',
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  '/api/admin/commercial/:profileId',
  requireAdmin,
  requireAdminRouteAccess('/admin/commercial/:id'),
  requirePermission(ADMIN_PERMISSIONS.COMMERCIAL_REVIEW),
  requirePermission(ADMIN_PERMISSIONS.DOCUMENTS_FILE_READ),
  requireCommercialDocumentFileAccess,
  async (request, response, next) => {
    try {
      response.json({
        success: true,
        review: await getCommercialReviewProfileDetail(request.params.profileId),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  '/api/admin/commercial/:profileId/approve',
  requireAdmin,
  requireAdminRouteAccess('/admin/commercial/:id'),
  requirePermission(ADMIN_PERMISSIONS.COMMERCIAL_APPROVE),
  async (request, response, next) => {
    try {
      response.json({
        success: true,
        message: 'Ticari hesap platform incelemesiyle onaylandi.',
        review: await applyCommercialAdminDecision(request.params.profileId, 'approve', {
          adminId: getAdminActorId(request),
          auditContext: {
            ipAddress: request.ip,
            userAgent: request.get('user-agent'),
          },
        }),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  '/api/admin/commercial/:profileId/notes',
  requireAdmin,
  requireAdminRouteAccess('/admin/commercial/:id'),
  requirePermission(ADMIN_PERMISSIONS.COMMERCIAL_REVIEW),
  async (request, response, next) => {
    try {
      response.json({
        success: true,
        message: 'Admin notu kaydedildi.',
        review: await addCommercialAdminNote(request.params.profileId, {
          adminId: getAdminActorId(request),
          note: request.body?.note,
          noteType: request.body?.noteType,
          auditContext: {
            ipAddress: request.ip,
            userAgent: request.get('user-agent'),
          },
        }),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  '/api/admin/commercial/:profileId/reject',
  requireAdmin,
  requireAdminRouteAccess('/admin/commercial/:id'),
  requirePermission(ADMIN_PERMISSIONS.COMMERCIAL_REJECT),
  async (request, response, next) => {
    try {
      response.json({
        success: true,
        message: 'Ticari hesap basvurusu reddedildi.',
        review: await applyCommercialAdminDecision(request.params.profileId, 'reject', {
          adminId: getAdminActorId(request),
          reason: request.body?.reason,
          auditContext: {
            ipAddress: request.ip,
            userAgent: request.get('user-agent'),
          },
        }),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  '/api/admin/commercial/:profileId/suspend',
  requireAdmin,
  requireAdminRouteAccess('/admin/commercial/:id'),
  requirePermission(ADMIN_PERMISSIONS.COMMERCIAL_SUSPEND),
  async (request, response, next) => {
    try {
      response.json({
        success: true,
        message: 'Ticari hesap yetkileri askiya alindi.',
        review: await applyCommercialAdminDecision(request.params.profileId, 'suspend', {
          adminId: getAdminActorId(request),
          reason: request.body?.reason,
          auditContext: {
            ipAddress: request.ip,
            userAgent: request.get('user-agent'),
          },
        }),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  '/api/admin/commercial/:profileId/revoke',
  requireAdmin,
  requireAdminRouteAccess('/admin/commercial/:id'),
  requirePermission(ADMIN_PERMISSIONS.COMMERCIAL_REVOKE),
  async (request, response, next) => {
    try {
      response.json({
        success: true,
        message: 'Ticari hesap yetkileri kaldirildi.',
        review: await applyCommercialAdminDecision(request.params.profileId, 'revoke', {
          adminId: getAdminActorId(request),
          reason: request.body?.reason,
          auditContext: {
            ipAddress: request.ip,
            userAgent: request.get('user-agent'),
          },
        }),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  '/api/admin/billing/settings',
  requireAdmin,
  requireAdminRouteAccess('/admin/settings'),
  requirePermission(ADMIN_PERMISSIONS.SETTINGS_READ),
  async (_request, response, next) => {
    try {
      response.json({
        success: true,
        settings: await getAdminBillingSettings(),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  '/api/admin/billing/settings',
  requireAdmin,
  requireAdminRouteAccess('/admin/settings'),
  requirePermission(ADMIN_PERMISSIONS.BILLING_SETTINGS_WRITE),
  async (request, response, next) => {
    try {
      response.json({
        success: true,
        message: 'Billing ayarlari guncellendi.',
        settings: await updateAdminBillingSettings(request.body || {}, {
          actorId: getAdminActorId(request),
          ipAddress: request.ip,
          userAgent: request.get('user-agent'),
        }),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  '/api/admin/billing/plans',
  requireAdmin,
  requireAdminRouteAccess('/admin/subscriptions'),
  requirePermission(ADMIN_PERMISSIONS.SUBSCRIPTIONS_READ),
  async (_request, response, next) => {
    try {
      response.json({
        success: true,
        plans: await listAdminSubscriptionPlans(),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  '/api/admin/billing/plans',
  requireAdmin,
  requireAdminRouteAccess('/admin/subscriptions'),
  requirePermission(ADMIN_PERMISSIONS.SUBSCRIPTIONS_WRITE),
  async (request, response, next) => {
    try {
      response.json({
        success: true,
        message: 'Abonelik plani kaydedildi.',
        plan: await saveAdminSubscriptionPlan(request.body || {}, {
          actorId: getAdminActorId(request),
          ipAddress: request.ip,
          userAgent: request.get('user-agent'),
        }),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  '/api/admin/payments',
  requireAdmin,
  requireAdminRouteAccess('/admin/payments'),
  requireAnyPermission([
    ADMIN_PERMISSIONS.BILLING_READ,
    ADMIN_PERMISSIONS.PAYMENTS_READ,
  ]),
  async (request, response, next) => {
    try {
      response.json({
        success: true,
        payments: await listAdminPaymentsSummary(Number(request.query.limit || 100)),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  '/api/admin/payments/:paymentId',
  requireAdmin,
  requireAdminRouteAccess('/admin/payments'),
  requirePermission(ADMIN_PERMISSIONS.PAYMENTS_INTERNAL_READ),
  requirePaymentInternalAccess,
  async (request, response, next) => {
    try {
      const payment = await getAdminPaymentDetail(request.params.paymentId);
      if (!payment) {
        response.status(404).json({
          success: false,
          message: 'Odeme kaydi bulunamadi.',
        });
        return;
      }

      response.json({
        success: true,
        payment,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  '/api/admin/subscriptions',
  requireAdmin,
  requireAdminRouteAccess('/admin/subscriptions'),
  requirePermission(ADMIN_PERMISSIONS.SUBSCRIPTIONS_READ),
  async (request, response, next) => {
    try {
      response.json({
        success: true,
        subscriptions: await listAdminSubscriptionsSummary(Number(request.query.limit || 100)),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  '/api/admin/deals/:conversationId/quote',
  requireAdmin,
  requireAdminRouteAccess('/admin/insurance'),
  requirePermission(ADMIN_PERMISSIONS.INSURANCE_WRITE),
  async (request, response, next) => {
    try {
      await setInsuranceQuote(request.params.conversationId, request.body?.amount, {
        adminId: getAdminActorId(request),
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      });
      response.json({
        success: true,
        deals: await listAdminDeals(),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  '/api/admin/deals/:conversationId/policy',
  requireAdmin,
  requireAdminRouteAccess('/admin/insurance'),
  requirePermission(ADMIN_PERMISSIONS.INSURANCE_WRITE),
  async (request, response, next) => {
    try {
      await sendInsurancePolicyMail(
        request.params.conversationId,
        {
          policyUrl: request.body?.policyUrl,
          invoiceUrl: request.body?.invoiceUrl,
        },
        {
          adminId: getAdminActorId(request),
          ipAddress: request.ip,
          userAgent: request.get('user-agent'),
        },
      );
      response.json({
        success: true,
        deals: await listAdminDeals(),
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post('/api/ai/chat', requireAuth, aiLimiter, async (request, response, next) => {
  try {
    const snapshot = await bootstrapSnapshot(request.user.id, request.authToken);
    const history = Array.isArray(snapshot.aiMessages) ? snapshot.aiMessages : [];
    const message = String(request.body?.message || '').trim();

    if (!message) {
      response.status(400).json({
        success: false,
        message: 'AI mesajı boş olamaz.',
      });
      return;
    }

    await appendAiMessage(request.user.id, 'user', repairBrokenTurkishText(message));

    const result = await requestAiReply({
      history: [...history, { id: `user-${Date.now()}`, role: 'user', content: message }],
      message,
      posts: snapshot.posts,
      vehicle: snapshot.vehicle,
      location: request.body?.location,
    });

    const content = repairBrokenTurkishText(result.content);
    await appendAiMessage(request.user.id, 'assistant', content, {
      provider: result.provider,
      relatedPostIds: result.relatedPostIds,
    });
    await sendSnapshot(response, request.user.id, request.authToken, {
      provider: result.provider,
      relatedPostIds: result.relatedPostIds,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/ai/clear', requireAuth, async (request, response, next) => {
  try {
    await clearAiMessages(request.user.id);
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/ai/messages/:messageId', requireAuth, async (request, response, next) => {
  try {
    await deleteAiMessage(request.user.id, request.params.messageId);
    await sendSnapshot(response, request.user.id, request.authToken);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/ai/messages/:messageId', requireAuth, aiLimiter, async (request, response, next) => {
  try {
    const editedContent = repairBrokenTurkishText(request.body?.content || '');
    const existingMessage = await getAiMessageRow(request.user.id, request.params.messageId);
    if (!existingMessage) {
      const error = new Error('AI mesajı bulunamadı.');
      error.statusCode = 404;
      throw error;
    }

    const updatedMessage = await updateAiMessageContent(request.user.id, request.params.messageId, editedContent);
    await deleteAiMessagesAfter(request.user.id, existingMessage.created_at);

    const snapshot = await bootstrapSnapshot(request.user.id, request.authToken);
    const result = await requestAiReply({
      history: snapshot.aiMessages,
      message: updatedMessage.content,
      posts: snapshot.posts,
      vehicle: snapshot.vehicle,
      location: request.body?.location,
    });

    const content = repairBrokenTurkishText(result.content);
    await appendAiMessage(request.user.id, 'assistant', content, {
      provider: result.provider,
      relatedPostIds: result.relatedPostIds,
    });

    await sendSnapshot(response, request.user.id, request.authToken, {
      provider: result.provider,
      relatedPostIds: result.relatedPostIds,
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, request, response, _next) => {
  const multerLimitError =
    error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
  const statusCode = multerLimitError ? 413 : error.statusCode || 500;
  const allowClientMessage =
    Boolean(error?.expose) || (!multerLimitError && statusCode < 500);
  const message =
    multerLimitError
      ? 'Dosya boyutu izin verilen siniri asiyor.'
      : statusCode >= 500 && config.nodeEnv === 'production' && !allowClientMessage
        ? 'Sunucuda beklenmeyen bir hata olustu. Lutfen daha sonra tekrar deneyin.'
        : error.message || 'Sunucuda beklenmeyen bir hata olustu.';

  if (statusCode >= 500 || multerLimitError) {
    logError('http.request.failed', {
      method: request.method,
      path: request.originalUrl || request.path,
      statusCode,
      message: error.message || '',
      code: error.code || '',
      userId: request.user?.id || null,
      adminActorId: request.adminActorId || null,
      ipAddress: request.ip,
    });
  }

  response.status(statusCode).json({
    success: false,
    message,
  });
});

async function startServer() {
  const startupValidation = assertStartupConfig(config);
  await initializeStore();
  const mailerReady = await verifyMailerConnection();

  app.listen(config.port, config.host, () => {
    const readiness = buildSystemReadiness();
    logInfo('server.started', {
      host: config.host,
      port: config.port,
      database: config.databaseUrl ? 'postgresql' : 'sqlite-inmemory-dev',
      storageDriver: config.storageDriver,
      mailerReady,
      readinessWarnings: readiness.warnings.length,
      startupWarnings: startupValidation.warnings.length,
    });
    readiness.warnings.forEach((warning) => {
      logWarn('server.readiness.warning', { warning });
    });
  });
}

startServer().catch((error) => {
  logError('server.startup.failed', {
    error,
    validationErrors: error.validationErrors || [],
  });
  process.exit(1);
});

