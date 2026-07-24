import { readState, saveState, response, error, body, isAdmin } from '../_lib/game.js';
export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return error('관리자 비밀번호가 맞지 않습니다.', 401);
  try { const state = await readState(env); const { action, value } = await body(request);
    if (action === 'addQuestion') { const text = String(value || '').trim().slice(0, 120); if (text) state.questions.push({ id: crypto.randomUUID(), text, active: false }); }
    if (action === 'deleteQuestion') { state.questions = state.questions.filter(q => q.id !== value); if (state.currentQuestionId === value) { state.currentQuestionId = null; state.phase = 'lobby'; } }
    if (action === 'selectQuestion' && state.questions.some(q => q.id === value)) { state.currentQuestionId = value; state.questions.forEach(q => q.active = q.id === value); state.phase = 'lobby'; }
    if (action === 'setPhase' && ['lobby', 'voting', 'results'].includes(value)) state.phase = value;
    if (action === 'resetVotes') state.votes = {};
    await saveState(env, state); return response({ ok: true });
  } catch { return error('게임 저장소가 아직 설정되지 않았습니다.', 503); }
}
