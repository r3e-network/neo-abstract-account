function trim(value) {
  return String(value || '').trim();
}

function resolveWebhookConfig(channel) {
  if (channel === 'email') {
    return {
      url: trim(process.env.DID_EMAIL_WEBHOOK_URL),
      token: trim(process.env.DID_EMAIL_WEBHOOK_TOKEN),
    };
  }
  if (channel === 'sms') {
    return {
      url: trim(process.env.DID_SMS_WEBHOOK_URL),
      token: trim(process.env.DID_SMS_WEBHOOK_TOKEN),
    };
  }
  return { url: '', token: '' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { channel, did, to, template, payload } = req.body || {};
  const normalizedChannel = trim(channel).toLowerCase();
  if (normalizedChannel !== 'email' && normalizedChannel !== 'sms') {
    return res.status(400).json({ error: 'Unsupported notification channel' });
  }

  if (!trim(to)) {
    return res.status(400).json({ error: 'Notification target is required' });
  }

  const config = resolveWebhookConfig(normalizedChannel);
  if (!config.url) {
    return res.status(501).json({ error: `${normalizedChannel.toUpperCase()} webhook is not configured` });
  }

  const headers = { 'content-type': 'application/json' };
  if (config.token) {
    headers.authorization = `Bearer ${config.token}`;
    headers['x-notification-token'] = config.token;
  }

  const response = await fetch(config.url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      channel: normalizedChannel,
      did: trim(did),
      to: trim(to),
      template: trim(template) || 'aa_recovery',
      payload: payload && typeof payload === 'object' ? payload : {},
    }),
  });

  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    return res.status(response.status).json({
      error: body?.error || body?.message || `${normalizedChannel.toUpperCase()} notification failed`,
    });
  }

  return res.status(200).json({
    ok: true,
    channel: normalizedChannel,
    response: body,
  });
}
