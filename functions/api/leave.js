import { readState, saveState, voteKey, response, error, body } from '../_lib/game.js';

export async function onRequestPost({ request, env }) {
  try {
    const { name } = await body(request);
    const voter = String(name || '').trim();
    if (!voter) return response({ ok: true });
    const state = await readState(env);
    state.participants = state.participants.filter(person => person !== voter);
    await saveState(env, state);
    await Promise.all(state.questions.map(question => env.ENQUETE_KV.delete(await voteKey(question.id, voter))));
    return response({ ok: true });
  } catch {
    return error('게임 저장소가 아직 설정되지 않았습니다.', 503);
  }
}
