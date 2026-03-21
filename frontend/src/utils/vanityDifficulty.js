const BASE58_CHARS = 58;

export function validatePattern(pattern, type) {
  if (!pattern || !pattern.trim()) {
    return 'empty';
  }

  const trimmed = pattern.trim();

  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(trimmed)) {
    return 'invalidChar';
  }

  if (type === 'prefix' || type === 'suffix') {
    if (trimmed.length > 6) {
      return 'tooLongPrefix';
    }
  } else if (type === 'contains') {
    if (trimmed.length > 5) {
      return 'tooLongContains';
    }
  }

  return null;
}

export function estimateDifficulty(pattern) {
  if (!pattern || !pattern.trim()) {
    return { attempts: 0, seconds: 0, level: 'easy' };
  }

  const len = pattern.trim().length;
  const attempts = Math.pow(BASE58_CHARS, len);
  const seconds = attempts / 3000;

  let level;
  if (attempts < 1_000_000) {
    level = 'easy';
  } else if (attempts < 100_000_000) {
    level = 'medium';
  } else {
    level = 'hard';
  }

  return { attempts, seconds, level };
}

const DEFAULT_DURATION_STRINGS = {
  instant: 'instant',
  subSecond: '< 1 second',
  second: 's',
  minute: 'min',
  hour: 'h',
  minuteShort: 'm',
  day: 'days',
  week: 'weeks',
  year: 'years',
};

export function formatDuration(seconds, strings = {}) {
  const s = { ...DEFAULT_DURATION_STRINGS, ...strings };
  if (!seconds || seconds <= 0) return s.instant;
  if (seconds < 1) return s.subSecond;
  if (seconds < 60) return `~${Math.ceil(seconds)}${s.second}`;

  const minutes = seconds / 60;
  if (minutes < 60) return `~${Math.round(minutes)} ${s.minute}`;

  const hours = minutes / 60;
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `~${h}${s.hour} ${m}${s.minuteShort}` : `~${h}${s.hour}`;
  }

  const days = hours / 24;
  if (days < 30) return `~${Math.round(days)} ${s.day}`;
  if (days < 365) return `~${Math.round(days / 7)} ${s.week}`;
  return `~${Math.round(days / 365)} ${s.year}`;
}

export function formatAttempts(attempts) {
  if (attempts < 1000) return String(attempts);
  if (attempts < 1_000_000) return `~${(attempts / 1000).toFixed(1)}K`;
  if (attempts < 1_000_000_000) return `~${(attempts / 1_000_000).toFixed(1)}M`;
  return `~${(attempts / 1_000_000_000).toFixed(1)}B`;
}

export function estimateCostGAS(seconds) {
  return seconds / 7200;
}

export function formatHashrate(attempts, elapsedMs) {
  if (!elapsedMs || elapsedMs <= 0) return '0';
  const rate = (attempts / elapsedMs) * 1000;
  if (rate >= 1000) return `${(rate / 1000).toFixed(1)}K`;
  return Math.round(rate).toString();
}

export function formatNumber(n) {
  return n.toLocaleString();
}
