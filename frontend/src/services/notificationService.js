import { RUNTIME_CONFIG } from '@/config/runtimeConfig';
import { EC } from '../config/errorCodes.js';

function trim(value) {
  return String(value || '').trim();
}

async function postNotification(body) {
  const endpoint = trim(RUNTIME_CONFIG.didNotificationEndpoint);
  if (!endpoint) {
    throw new Error(EC.didEndpointMissing);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.error) {
    const err = new Error(EC.notificationRequestFailed);
    err.rpcDetail = payload?.error || payload?.message || null;
    throw err;
  }
  return payload;
}

class NotificationService {
  get canEmail() {
    return Boolean(RUNTIME_CONFIG.didNotificationEmailEnabled && trim(RUNTIME_CONFIG.didNotificationEndpoint));
  }

  get canSms() {
    return Boolean(RUNTIME_CONFIG.didNotificationSmsEnabled && trim(RUNTIME_CONFIG.didNotificationEndpoint));
  }

  async sendRecoveryEmail({ did, email, template = 'aa_recovery', payload = {} } = {}) {
    if (!this.canEmail) throw new Error(EC.emailNotificationsDisabled);
    if (!trim(email)) throw new Error(EC.emailTargetRequired);
    return postNotification({
      channel: 'email',
      did,
      to: trim(email),
      template,
      payload,
    });
  }

  async sendRecoverySms({ did, phone, template = 'aa_recovery', payload = {} } = {}) {
    if (!this.canSms) throw new Error(EC.smsNotificationsDisabled);
    if (!trim(phone)) throw new Error(EC.phoneTargetRequired);
    return postNotification({
      channel: 'sms',
      did,
      to: trim(phone),
      template,
      payload,
    });
  }
}

export const notificationService = new NotificationService();
