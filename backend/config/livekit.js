const livekitConfig = {
  apiKey: process.env.LIVEKIT_API_KEY,
  apiSecret: process.env.LIVEKIT_API_SECRET,
  wsUrl: process.env.LIVEKIT_URL,
};

export function validateLiveKitConfig() {
  const { apiKey, apiSecret, wsUrl } = livekitConfig;
  if (!apiKey || !apiSecret || !wsUrl) {
    console.warn('[LiveKit] Missing credentials — voice chat will be unavailable.');
    return false;
  }
  console.log('[LiveKit] Configuration loaded successfully.');
  return true;
}

export default livekitConfig;
