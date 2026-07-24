import { readState, voteKey, response, error, body } from '../_lib/game.js';
export async function onRequestPost({ request, env }) {
  try { const state = await readState(env); const { voter, answer } = await body(request); const v = String(voter || '').trim(), a = String(answer || '').trim().slice(0, 20);
    if (!state.participants.includes(v)) return error('참가자 정보가 없습니다.', 403);
    if (state.phase !== 'voting' || !state.currentQuestionId) return error('지금은 투표 시간이 아닙니다.', 409);
    if (!a) return error('이름을 입력해 주세요.', 400);
    await env.ENQUETE_KV.put(await voteKey(state.currentQuestionId, v), JSON.stringify({ voter: v, questionId: state.currentQuestionId, answer: a }));
    return response({ ok: true });
  } catch { return error('게임 저장소가 아직 설정되지 않았습니다.', 503); }
}
