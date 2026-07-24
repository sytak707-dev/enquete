import { readState, publicState, response, error } from '../_lib/game.js';
export async function onRequestGet({ env }) { try { return response(publicState(await readState(env))); } catch { return error('게임 저장소가 아직 설정되지 않았습니다.', 503); } }
