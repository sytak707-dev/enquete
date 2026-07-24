import { readState, saveState, clearVotes, response, error, body, isAdmin } from '../_lib/game.js';
export async function onRequestPost({ request, env }) {
  const payload = await body(request);
  if (!env.ADMIN_PIN) return error('Cloudflare Production 환경에 ADMIN_PIN이 적용되지 않았습니다.', 503);
  if (!isAdmin(payload.pin, env)) return error('관리자 비밀번호가 맞지 않습니다.', 401);
  try { const state = await readState(env); const { action, value } = payload;
    if (action === 'addQuestion') { const text = String(value || '').trim().slice(0, 120); if (text) state.questions.push({ id: crypto.randomUUID(), text, active: false }); }
    if (action === 'deleteQuestion') { state.questions = state.questions.filter(q => q.id !== value); if (state.currentQuestionId === value) { state.currentQuestionId = null; state.phase = 'lobby'; } }
    if (action === 'selectQuestion' && state.questions.some(q => q.id === value)) { state.currentQuestionId = value; state.questions.forEach(q => q.active = q.id === value); state.phase = 'lobby'; }
    if (action === 'setPhase' && ['lobby', 'voting', 'results'].includes(value)) state.phase = value;
    if (action === 'resetVotes') await clearVotes(env, state.currentQuestionId);
    if (action === 'resetParticipants') { await Promise.all(state.questions.map(question => clearVotes(env, question.id))); state.participants = []; state.votes = {}; }
    await saveState(env, state); return response({ ok: true });
  } catch { return error('게임 저장소가 아직 설정되지 않았습니다.', 503); }
}
