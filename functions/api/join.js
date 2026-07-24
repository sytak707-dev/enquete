import { readState, saveState, response, error, body } from '../_lib/game.js';
export async function onRequestPost({ request, env }) {
  try { const state = await readState(env); const { name } = await body(request); const clean = String(name || '').trim().slice(0, 20);
    if (!clean) return error('이름을 입력해 주세요.', 400); if (!state.participants.includes(clean)) state.participants.push(clean);
    await saveState(env, state); return response({ name: clean });
  } catch { return error('게임 저장소가 아직 설정되지 않았습니다.', 503); }
}
