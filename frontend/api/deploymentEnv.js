function trim(value) {
  return String(value || '').trim();
}

// No repo-wide production detector existed before AA-07/AA-08. Vercel sets
// VERCEL_ENV=production on production deployments, and NODE_ENV=production is the generic
// convention — either one marks a production deployment. Security-sensitive overrides must
// fail closed under it.
export function isProductionDeployment() {
  return trim(process.env.NODE_ENV).toLowerCase() === 'production'
    || trim(process.env.VERCEL_ENV).toLowerCase() === 'production';
}

export function envFlagEnabled(value) {
  return /^(1|true|yes|on)$/i.test(trim(value || ''));
}
