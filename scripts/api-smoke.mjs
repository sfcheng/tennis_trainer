import assert from 'node:assert/strict';

const url = process.env.API_URL || 'http://127.0.0.1:5173/api.php';
async function request(payload) {
  const response = await fetch(url, payload ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : {});
  assert.equal(response.status, 200);
  return response.json();
}
const name = `Smoke test ${Date.now()}`;
let skillId;
try {
  let data = await request({ action: 'addSkill', title: name });
  skillId = data.skills.find(s => s.title === name).id;
  data = await request({ action: 'addTip', skillId, title: 'Watch the ball' });
  const tipId = data.skills.find(s => s.id === skillId).tips[0].id;
  for (let i = 0; i < 3; i++) await request({ action: 'vote', skillId, tipId });
  data = await request({ action: 'editTip', skillId, tipId, title: 'Keep watching through contact' });
  assert.deepEqual(data.skills.find(s => s.id === skillId).tips[0], { id: tipId, title: 'Keep watching through contact', count: 3 });
  data = await request({ action: 'editSkill', skillId, title: `${name} edited` });
  assert.equal(data.skills.find(s => s.id === skillId).title, `${name} edited`);
  data = await request();
  assert.equal(data.skills.find(s => s.id === skillId).tips[0].count, 3);
  data = await request({ action: 'deleteTip', skillId, tipId });
  assert.equal(data.skills.find(s => s.id === skillId).tips.length, 0);
  const invalid = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addTip', skillId, title: '   ' }) });
  assert.equal(invalid.status, 422);
  console.log('Passed: skill and tip CRUD, repeat votes, persisted reads, and blank-title validation.');
} finally {
  if (skillId) {
    const data = await request({ action: 'deleteSkill', skillId });
    assert.ok(!data.skills.some(s => s.id === skillId));
    console.log('Test skill removed.');
  }
}
