import test from 'node:test';
import assert from 'node:assert/strict';
import { Match, outsideBoundary, MAX_BALLS, CONTACT_WINDOW } from '../src/engine.js';
const tick = (m, until, limit = 20) => {
  for (let i = 0; i < limit * 120 && !until(); i++) m.step(1 / 120);
  assert.ok(until(), `Timed out in ${m.state}`);
};
function delivery() { const m = new Match(() => 0.5); m.start(); tick(m, () => m.state === 'delivery'); return m; }
function hit(aim = 0, loft = false, error = 0) {
  const m = delivery(); m.setAim(aim); m.loft = loft;
  tick(m, () => m.flight >= m.contactAt + error);
  assert.equal(m.swing(), true); return m;
}
test('boundary uses the field ellipse', () => {
  assert.equal(outsideBoundary(480, 322), false);
  assert.equal(outsideBoundary(480, 77), true);
  assert.equal(outsideBoundary(873, 322), true);
});
test('delivery includes run-up and visible bounce before reaching the bat', () => {
  const m = delivery();
  m.flight = m.contactAt * 0.6; m.step(1 / 120); const low = m.ball.z;
  m.flight = m.contactAt * 0.8; m.step(1 / 120);
  assert.ok(m.ball.z > low); assert.ok(m.ball.y < 424);
});
test('missing the ball is bowled, counted once, with a wicket', () => {
  const m = delivery(); tick(m, () => m.state === 'result');
  assert.equal(m.balls, 1); assert.equal(m.wickets, 1); assert.equal(m.history[0], 'W');
  m.step(0.5); assert.equal(m.balls, 1);
});
test('early swing misses and cannot be spammed into a hit', () => {
  const m = delivery(); assert.equal(m.swing(), false);
  m.flight = m.contactAt; assert.equal(m.swing(), false);
  tick(m, () => m.state === 'result'); assert.equal(m.wickets, 1);
});
test('late swing outside contact window misses', () => {
  const m = delivery(); m.flight = m.contactAt + CONTACT_WINDOW + 0.01;
  assert.equal(m.swing(), false);
});
test('perfect straight ground shot hits a four with no wicket', () => {
  const m = hit(); tick(m, () => m.state === 'result');
  assert.equal(m.runs, 4); assert.equal(m.wickets, 0); assert.equal(m.shot.bounced, true);
});
test('perfect loft clears the rope for six before bouncing', () => {
  const m = hit(0, true); tick(m, () => m.state === 'result');
  assert.equal(m.runs, 6); assert.equal(m.shot.bounced, false);
});
test('direction and timing change ball velocity and power', () => {
  const left = hit(-60), right = hit(60), weak = hit(0, false, -0.13), good = hit();
  assert.ok(left.ball.vx < 0); assert.ok(right.ball.vx > 0);
  assert.ok(Math.hypot(weak.ball.vx, weak.ball.vy) < Math.hypot(good.ball.vx, good.ball.vy));
});
test('fielder collecting a rolling ball awards completed runs', () => {
  const m = hit(); m.shot.elapsed = 2.1; m.shot.bounced = true; m.ball.z = 0; m.ball.vz = 0;
  m.fielders[0] = { x: m.ball.x, y: m.ball.y }; m.step(1 / 120);
  assert.equal(m.state, 'result'); assert.equal(m.runs, 2); assert.equal(m.wickets, 0);
});
test('a fielder can catch an airborne loft, but cannot catch a bounced ball', () => {
  const m = hit(0, true); m.shot.elapsed = 1; m.ball.z = 10; m.ball.vz = -20;
  m.fielders[0] = { x: m.ball.x, y: m.ball.y }; m.step(1 / 120);
  assert.equal(m.wickets, 1); assert.match(m.feedback, /CAUGHT/);
  const bounced = hit(0, true); bounced.shot.elapsed = 1; bounced.shot.bounced = true;
  bounced.ball.z = 10; bounced.ball.vz = -20;
  bounced.fielders[0] = { x: bounced.ball.x, y: bounced.ball.y }; bounced.step(1 / 120);
  assert.equal(bounced.wickets, 0); assert.equal(bounced.state, 'result');
});
test('pause freezes ball, clocks and score', () => {
  const m = delivery(); m.paused = true;
  const before = JSON.stringify(m); m.step(1); m.swing();
  assert.equal(JSON.stringify(m), before);
});
test('three wickets ends the challenge early', () => {
  const m = delivery(); tick(m, () => m.state === 'over');
  assert.equal(m.wickets, 3); assert.equal(m.balls, 3);
});
test('full innings has exactly twelve legal deliveries and correct overs', () => {
  const m = new Match(() => 0.5); m.start();
  for (let i = 0; i < MAX_BALLS; i++) {
    tick(m, () => m.state === 'delivery');
    tick(m, () => m.flight >= m.contactAt); m.swing();
    tick(m, () => m.state === 'result');
    assert.equal(m.balls, i + 1);
    if (i === 5) assert.equal(m.over, '1.0');
  }
  tick(m, () => m.state === 'over');
  assert.equal(m.over, '2.0'); assert.equal(m.balls, 12); assert.equal(m.history.length, 12);
  m.step(10); assert.equal(m.balls, 12);
});
test('restart resets score, delivery state, history and pause', () => {
  const m = hit(); tick(m, () => m.state === 'result'); m.paused = true; m.start();
  assert.equal(m.runs, 0); assert.equal(m.balls, 0); assert.equal(m.wickets, 0);
  assert.deepEqual(m.history, []); assert.equal(m.paused, false); assert.equal(m.state, 'waiting');
});
