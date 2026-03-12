import { RUNTIME_CONFIG } from '@/config/runtimeConfig';

function trim(value) {
  return String(value || '').trim();
}

async function postNotification(body) {
  const endpoint = trim(RUNTIME_CONFIG.didNotificationEndpoint);
  if (!endpoint) {
    throw new Error('DID notification endpoint is not configured.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error || payload?.message || 'Notification request failed.');
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
    if (!this.canEmail) throw new Error('Email notifications are not enabled.');
    if (!trim(email)) throw new Error('Email target is required.');
    return postNotification({
      channel: 'email',
      did,
      to: trim(email),
      template,
      payload,
    });
  }

  async sendRecoverySms({ did, phone, template = 'aa_recovery', payload = {} } = {}) {
    if (!this.canSms) throw new Error('SMS notifications are not enabled.');
    if (!trim(phone)) throw new Error('Phone target is required.');
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
