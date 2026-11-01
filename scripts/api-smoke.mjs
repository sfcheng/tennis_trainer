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
  const description = 'Track the ball from the bounce.\nKeep your head still through contact.';
  data = await request({ action: 'addTip', skillId, title: 'Watch the ball', description });
  const tipId = data.skills.find(s => s.id === skillId).tips[0].id;
  assert.equal(data.skills.find(s => s.id === skillId).tips[0].description, description);
  for (let i = 0; i < 3; i++) await request({ action: 'vote', skillId, tipId });
  data = await request({ action: 'editTip', skillId, tipId, title: 'Keep watching through contact' });
  assert.deepEqual(data.skills.find(s => s.id === skillId).tips[0], { id: tipId, title: 'Keep watching through contact', description, count: 3 });
  const updatedDescription = 'Watch contact.\nFinish the swing before looking up.';
  data = await request({ action: 'editTip', skillId, tipId, title: 'Watch contact', description: updatedDescription });
  assert.equal(data.skills.find(s => s.id === skillId).tips[0].description, updatedDescription);
  data = await request({ action: 'editSkill', skillId, title: `${name} edited` });
  assert.equal(data.skills.find(s => s.id === skillId).title, `${name} edited`);
  data = await request();
  assert.equal(data.skills.find(s => s.id === skillId).tips[0].count, 3);
  assert.equal(data.skills.find(s => s.id === skillId).tips[0].description, updatedDescription);
  data = await request({ action: 'editTip', skillId, tipId, title: 'Watch contact', description: '' });
  assert.equal(data.skills.find(s => s.id === skillId).tips[0].description, '');
  data = await request({ action: 'deleteTip', skillId, tipId });
  assert.equal(data.skills.find(s => s.id === skillId).tips.length, 0);
  const invalid = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addTip', skillId, title: '   ' }) });
  assert.equal(invalid.status, 422);
  const tooLong = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addTip', skillId, title: 'Invalid tip', description: 'x'.repeat(20001) }) });
  assert.equal(tooLong.status, 422);
  data = await request({ action: 'addTip', skillId, title: 'Title-only tip' });
  assert.equal(data.skills.find(s => s.id === skillId).tips[0].description, '');
  console.log('Passed: skill and tip CRUD, description edits and clearing, title-only compatibility, repeat votes, persistence, and validation.');
} finally {
  if (skillId) {
    const data = await request({ action: 'deleteSkill', skillId });
    assert.ok(!data.skills.some(s => s.id === skillId));
    console.log('Test skill removed.');
  }
}
