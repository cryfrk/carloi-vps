const { db } = require('./database');

function getWindowStart(windowMs) {
  const current = Date.now();
  return new Date(Math.floor(current / windowMs) * windowMs).toISOString();
}

function getWindowCutoff(windowMs) {
  return new Date(Date.now() - windowMs * 4).toISOString();
}

async function releaseRateLimitHit(state) {
  if (!state?.limiterKey || !state?.windowStartedAt) {
    return;
  }

  const row = await db
    .prepare(
      `SELECT count
       FROM rate_limit_hits
       WHERE limiter_key = ? AND window_started_at = ?`,
    )
    .get(state.limiterKey, state.windowStartedAt);

  if (!row) {
    return;
  }

  if ((row.count ?? 0) <= 1) {
    await db
      .prepare('DELETE FROM rate_limit_hits WHERE limiter_key = ? AND window_started_at = ?')
      .run(state.limiterKey, state.windowStartedAt);
    return;
  }

  await db
    .prepare(
      `UPDATE rate_limit_hits
       SET count = count - 1, updated_at = ?
       WHERE limiter_key = ? AND window_started_at = ?`,
    )
    .run(new Date().toISOString(), state.limiterKey, state.windowStartedAt);
}

function createRateLimiter({ windowMs, max, message, keyFn }) {
  return async function rateLimiter(request, response, next) {
    try {
      const key = String(keyFn ? keyFn(request) : request.ip || 'anon');
      const windowStartedAt = getWindowStart(windowMs);
      const now = new Date().toISOString();
      request.rateLimitState = {
        limiterKey: key,
        windowStartedAt,
      };

      await db.prepare(
        `INSERT INTO rate_limit_hits (limiter_key, window_started_at, count, updated_at)
         VALUES (?, ?, 1, ?)
         ON CONFLICT (limiter_key, window_started_at)
         DO UPDATE SET count = rate_limit_hits.count + 1, updated_at = EXCLUDED.updated_at`,
      ).run(key, windowStartedAt, now);

      const row = await db
        .prepare(
          `SELECT count
           FROM rate_limit_hits
           WHERE limiter_key = ? AND window_started_at = ?`,
        )
        .get(key, windowStartedAt);

      if (Math.random() < 0.05) {
        await db
          .prepare('DELETE FROM rate_limit_hits WHERE updated_at < ?')
          .run(getWindowCutoff(windowMs));
      }

      if ((row?.count ?? 0) > max) {
        response.status(429).json({
          success: false,
          message,
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  createRateLimiter,
  releaseRateLimitHit,
};
