const KEY = 'enquete:state';

export function initialState() {
  return {
    questions: [
      { id: crypto.randomUUID(), text: '제일 늦잠을 잘 것 같은 사람은?', active: true },
      { id: crypto.randomUUID(), text: '무인도에서도 잘 살아남을 것 같은 사람은?', active: false },
      { id: crypto.randomUUID(), text: '가장 먼저 부자가 될 것 같은 사람은?', active: false }
    ], currentQuestionId: null, phase: 'lobby', participants: [], votes: {}
  };
}
export async function readState(env) {
  if (!env.ENQUETE_KV) throw new Error('ENQUETE_KV binding is missing');
  return (await env.ENQUETE_KV.get(KEY, 'json')) || initialState();
}
export async function saveState(env, state) { await env.ENQUETE_KV.put(KEY, JSON.stringify(state)); }
export function response(data, status = 200) { return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } }); }
export function error(message, status) { return response({ error: message }, status); }
export async function body(request) { try { return await request.json(); } catch { return {}; } }
export function results(state) {
  const counts = {};
  Object.values(state.votes).filter(v => v.questionId === state.currentQuestionId).forEach(v => {
    const answer = v.answer.trim(); if (answer) counts[answer] = (counts[answer] || 0) + 1;
  });
  return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
}
export function publicState(state) { return { ...state, results: results(state) }; }
export function isAdmin(pin, env) { return Boolean(env.ADMIN_PIN) && pin === env.ADMIN_PIN; }
