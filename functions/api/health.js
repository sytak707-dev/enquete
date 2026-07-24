export function onRequestGet({ env }) {
  return Response.json({
    kvBound: Boolean(env.ENQUETE_KV),
    adminPinConfigured: Boolean(env.ADMIN_PIN)
  }, { headers: { 'Cache-Control': 'no-store' } });
}
