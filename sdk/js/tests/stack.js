function decodeByteStringToHex(item) {
  if (!item || item.type !== 'ByteString' || !item.value) return '';
  return Buffer.from(item.value, 'base64').toString('hex').toLowerCase();
}

function decodeInteger(item) {
  if (!item) return 0;
  const value = Number(item.value);
  return Number.isFinite(value) ? value : 0;
}

function bindStackHelpers({ sanitizeHex, u }) {
  return {
    decodeByteStringToHex,
    decodeInteger,
    normalizeReadByteString(hex) {
      const clean = sanitizeHex(hex);
      if (!clean) return '';
      return sanitizeHex(u.reverseHex(clean));
    },
  };
}

module.exports = {
  bindStackHelpers,
  decodeByteStringToHex,
  decodeInteger,
};
