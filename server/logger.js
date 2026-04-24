function sanitizeMetadata(value, depth = 0) {
  if (depth > 4) {
    return '[max-depth]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      code: value.code || undefined,
      statusCode: value.statusCode || undefined,
    };
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeMetadata(entry, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, sanitizeMetadata(entry, depth + 1)]),
    );
  }

  return value;
}

function writeLog(level, event, metadata = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitizeMetadata(metadata),
  };
  const serialized = JSON.stringify(payload);

  if (level === 'error') {
    console.error(serialized);
    return;
  }

  if (level === 'warn') {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

function logInfo(event, metadata = {}) {
  writeLog('info', event, metadata);
}

function logWarn(event, metadata = {}) {
  writeLog('warn', event, metadata);
}

function logError(event, metadata = {}) {
  writeLog('error', event, metadata);
}

module.exports = {
  logError,
  logInfo,
  logWarn,
};
