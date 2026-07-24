const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const DATA = path.join(__dirname, 'data.json');
let clients = [];
let state = load();

function initialState() {
  return {
    questions: [
      { id: randomUUID(), text: '제일 늦잠을 잘 것 같은 사람은?', active: true },
      { id: randomUUID(), text: '무인도에서도 잘 살아남을 것 같은 사람은?', active: false },
      { id: randomUUID(), text: '가장 먼저 부자가 될 것 같은 사람은?', active: false }
    ],
    currentQuestionId: null,
    phase: 'lobby',
    participants: [],
    votes: {},
    adminPin: '1234'
  };
}
function load() { try { return JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch { return initialState(); } }
function save() { fs.writeFileSync(DATA, JSON.stringify(state, null, 2)); }
function publicState() {
  const { adminPin, ...safe } = state;
  return { ...safe, results: results() };
}
function results() {
  const votes = Object.values(state.votes).filter(v => v.questionId === state.currentQuestionId);
  const counts = {};
  votes.forEach(v => { const answer = v.answer.trim(); if (answer) counts[answer] = (counts[answer] || 0) + 1; });
  return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count-a.count || a.name.localeCompare(b.name, 'ko'));
}
function broadcast() {
  const payload = `data: ${JSON.stringify(publicState())}\n\n`;
  clients.forEach(c => c.write(payload));
}
function send(res, status, body) { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(body)); }
function readBody(req) { return new Promise((resolve,reject) => { let raw=''; req.on('data', d => raw += d); req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('bad json')); } }); }); }
function admin(req) { return req.headers['x-admin-pin'] === state.adminPin; }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/events') {
    res.writeHead(200, {'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
    res.write(`data: ${JSON.stringify(publicState())}\n\n`);
    clients.push(res); req.on('close', () => clients = clients.filter(c => c !== res)); return;
  }
  if (url.pathname === '/api/state' && req.method === 'GET') return send(res, 200, publicState());
  if (url.pathname === '/api/join' && req.method === 'POST') {
    const { name } = await readBody(req); const clean = String(name || '').trim().slice(0, 20);
    if (!clean) return send(res, 400, {error:'이름을 입력해 주세요.'});
    if (!state.participants.includes(clean)) state.participants.push(clean);
    save(); broadcast(); return send(res, 200, {name: clean});
  }
  if (url.pathname === '/api/vote' && req.method === 'POST') {
    const { voter, answer } = await readBody(req); const v = String(voter || '').trim(); const a = String(answer || '').trim().slice(0, 20);
    if (!state.participants.includes(v)) return send(res, 403, {error:'참가자 정보가 없습니다.'});
    if (state.phase !== 'voting' || !state.currentQuestionId) return send(res, 409, {error:'지금은 투표 시간이 아닙니다.'});
    if (!a) return send(res, 400, {error:'이름을 입력해 주세요.'});
    state.votes[v] = { questionId: state.currentQuestionId, answer: a };
    save(); broadcast(); return send(res, 200, {ok:true});
  }
  if (url.pathname === '/api/admin' && req.method === 'POST') {
    if (!admin(req)) return send(res, 401, {error:'관리자 비밀번호가 맞지 않습니다.'});
    const { action, value } = await readBody(req);
    if (action === 'addQuestion') { const text=String(value||'').trim().slice(0,120); if(text) state.questions.push({id:randomUUID(),text,active:false}); }
    if (action === 'deleteQuestion') { state.questions=state.questions.filter(q=>q.id!==value); if(state.currentQuestionId===value){state.currentQuestionId=null;state.phase='lobby';} }
    if (action === 'selectQuestion') { if(state.questions.some(q=>q.id===value)){state.currentQuestionId=value;state.questions.forEach(q=>q.active=q.id===value);state.phase='lobby';} }
    if (action === 'setPhase') { state.phase=value; }
    if (action === 'resetVotes') state.votes={};
    if (action === 'setPin') { const pin=String(value||''); if(pin.length>=4 && pin.length<=20) state.adminPin=pin; }
    save(); broadcast(); return send(res,200,{ok:true});
  }
  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  file = path.normalize(path.join(PUBLIC, file));
  if (!file.startsWith(PUBLIC)) return send(res, 403, {error:'Forbidden'});
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const type = file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/javascript';
    res.writeHead(200, {'Content-Type':`${type}; charset=utf-8`}); res.end(data);
  });
});
server.listen(PORT, () => console.log(`앙케이트 게임: http://localhost:${PORT}`));
