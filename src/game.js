import { Match, FIELD, MAX_BALLS, TARGET, clamp } from './engine.js';
const $ = id => document.getElementById(id);
const match = new Match();
let scene;
let accumulator = 0;
let lastEvent = 0;
let overlayMode = 'start';
const keys = new Set();
const FIXED = 1 / 120;

function person(sc, x, y, shirt, scale = 1, bat = false) {
  const c = sc.add.container(x, y);
  const shadow = sc.add.ellipse(0, 7, 20, 8, 0x072d25, 0.35);
  const leftLeg = sc.add.rectangle(-4, 2, 5, 15, 0xe4e7d8).setOrigin(0.5, 0);
  const rightLeg = sc.add.rectangle(4, 2, 5, 15, 0xe4e7d8).setOrigin(0.5, 0);
  const body = sc.add.rectangle(0, -6, 16, 21, shirt).setStrokeStyle(1, 0xffffff, 0.14);
  const arm1 = sc.add.rectangle(-10, -12, 5, 17, shirt).setOrigin(0.5, 0);
  const arm2 = sc.add.rectangle(10, -12, 5, 17, shirt).setOrigin(0.5, 0);
  const head = sc.add.circle(0, -23, 6, 0xd9a578);
  const cap = sc.add.ellipse(0, -26, 13, 7, shirt);
  c.add([shadow, leftLeg, rightLeg, body, arm1, arm2, head, cap]);
  let blade;
  if (bat) {
    blade = sc.add.container(11, -5);
    blade.add([sc.add.rectangle(0, 4, 3, 11, 0x463222), sc.add.rectangle(0, 19, 7, 23, 0xf4d795).setStrokeStyle(1, 0xc2a46b)]);
    c.add(blade);
    c.add(sc.add.ellipse(0, -26, 14, 9, 0x143961));
  }
  c.setScale(scale);
  return { c, leftLeg, rightLeg, arm1, arm2, blade };
}
function animatePerson(p, time, running = false) {
  const gait = running ? Math.sin(time * 15) * 0.6 : Math.sin(time * 2) * 0.04;
  p.leftLeg.rotation = gait; p.rightLeg.rotation = -gait;
  p.arm1.rotation = -gait; p.arm2.rotation = gait;
}
class CricketScene extends Phaser.Scene {
  constructor() { super('cricket'); }
  create() {
    scene = this;
    this.drawGround();
    this.aimGraphics = this.add.graphics().setDepth(4);
    this.contact = this.add.ellipse(480, 424, 54, 24, 0xf9cc69, 0.10).setStrokeStyle(2, 0xf9cc69, 0.65).setDepth(3);
    this.fielders = match.fielders.map(f => person(this, f.x, f.y, 0xee6b55, 0.8));
    this.bowler = person(this, 480, 193, 0xee6b55, 0.87);
    this.umpire = person(this, 509, 240, 0xece7ce, 0.85);
    this.batter = person(this, 464, 425, 0x51b5ea, 1, true);
    this.partner = person(this, 505, 278, 0x51b5ea, 0.86, true);
    this.keeper = person(this, 482, 475, 0xee6b55, 0.85);
    this.ballShadow = this.add.ellipse(480, 263, 9, 5, 0x062b22, 0.5).setDepth(20);
    this.trail = this.add.graphics().setDepth(21);
    this.ballView = this.add.circle(480, 263, 4.5, 0xffffff).setStrokeStyle(1, 0xde7267).setDepth(25);
    this.trailPoints = [];
    this.stumpPieces = [];
    for (const x of [475, 480, 485]) {
      this.stumpPieces.push(this.add.rectangle(x, 444, 2, 18, 0xf1e5bd).setDepth(12));
    }
    this.bails = this.add.rectangle(480, 435, 14, 2, 0xf9cc69).setDepth(13);
    this.add.text(480, 590, 'CHAMPIONS  /  THE HOME OF BIG HITS', { fontFamily: 'Arial', fontSize: '9px', color: '#adc8b2', letterSpacing: 3 }).setOrigin(0.5).setAlpha(0.7);
    updateUI();
  }
  drawGround() {
    const g = this.add.graphics();
    g.fillStyle(0x142b36).fillRect(0, 0, 960, 610);
    // Stadium tiers, crowd, and advertising are drawn once with no image assets.
    for (let i = 0; i < 5; i++) {
      g.lineStyle(11, i % 2 ? 0x344b56 : 0x263f4a).strokeEllipse(480, 320, 922 - i * 19, 620 - i * 17);
    }
    for (let i = 0; i < 310; i++) {
      const a = i * 2.39996;
      const r = (i % 4) * 7;
      const x = 480 + Math.cos(a) * (441 - r), y = 320 + Math.sin(a) * (293 - r);
      g.fillStyle([0xd9c48a, 0x7395ad, 0xbec7b7, 0xc76f65][i % 4], 0.8).fillCircle(x, y, 1.6);
    }
    g.fillStyle(0x24664c).fillEllipse(480, 322, 814, 516, 128);
    // Alternating mowing rings suit the fixed overhead view and draw cheaply.
    for (let i = 9; i >= 1; i--) {
      g.fillStyle(i % 2 ? 0x307b53 : 0x368557).fillEllipse(480, 322, i * 84, i * 51, 128);
    }
    g.lineStyle(3, 0xe8e5cf, 0.85).strokeEllipse(FIELD.cx, FIELD.cy, FIELD.rx * 2, FIELD.ry * 2, 128);
    g.lineStyle(1, 0xd7e8ca, 0.18).strokeEllipse(480, 322, 430, 285, 128);
    g.fillStyle(0xb6a374).fillRoundedRect(449, 251, 62, 202, 7);
    g.fillStyle(0xcab98b).fillRect(458, 263, 44, 173);
    g.fillStyle(0xb9a576, 0.7);
    for (let i = 0; i < 60; i++) g.fillRect(460 + (i * 17 % 40), 268 + (i * 37 % 162), 2, 3);
    g.lineStyle(2, 0xf4edcf, 0.95);
    for (const y of [278, 424]) {
      g.lineBetween(444, y, 516, y); g.lineBetween(451, y - 12, 509, y - 12);
      g.lineBetween(451, y - 12, 451, y + 11); g.lineBetween(509, y - 12, 509, y + 11);
    }
    for (const x of [475, 480, 485]) g.fillStyle(0xf1e5bd).fillRect(x - 1, 258, 2, 17);
    g.fillStyle(0xf9cc69).fillRect(473, 258, 14, 2);
    const ad = (x, y, text) => {
      this.add.rectangle(x, y, 116, 18, 0x133a37).setStrokeStyle(1, 0x638879, 0.6);
      this.add.text(x, y, text, { fontFamily: 'Arial', fontSize: '8px', color: '#eddbab', fontStyle: 'bold' }).setOrigin(0.5);
    };
    ad(480, 56, 'CRICKET CHAMPIONS'); ad(205, 98, 'MAKE IT COUNT'); ad(754, 98, 'PLAY YOUR SHOT');
    // Cache the stadium as one bitmap: no repeated vector/crowd work per frame.
    g.generateTexture('stadium', 960, 610);
    g.destroy();
    this.add.image(480, 305, 'stadium').setDepth(-1);
  }
  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    if (!match.paused && !['ready', 'over'].includes(match.state)) {
      const direction = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
      if (direction) match.setAim(match.aim + direction * dt * 75);
      accumulator += dt;
      while (accumulator >= FIXED) { match.step(FIXED); accumulator -= FIXED; }
    }
    this.renderMatch(time / 1000);
    updateUI();
    if (match.state === 'over' && overlayMode !== 'over') showOverlay('over');
  }
  renderMatch(time) {
    const m = match, active = !m.paused;
    const animTime = active ? time : this.pauseTime || time;
    if (active) this.pauseTime = time;
    const runup = m.state === 'runup';
    this.bowler.c.setPosition(480 + (runup ? Math.sin(m.clock * 15) * 2 : 0), runup ? 188 + m.clock / 1.1 * 67 : m.state === 'delivery' ? 255 : 205);
    animatePerson(this.bowler, animTime, runup);
    if (m.state === 'delivery' && m.flight < 0.18) this.bowler.arm2.rotation = -2.8;
    this.fielders.forEach((p, i) => {
      const f = m.fielders[i]; p.c.setPosition(f.x, f.y).setDepth(f.y / 100);
      animatePerson(p, animTime, m.state === 'inplay');
    });
    animatePerson(this.keeper, animTime);
    const running = m.state === 'inplay' && m.shot.elapsed > 0.35;
    const runProgress = running ? (m.shot.elapsed - 0.35) / 1.15 : 0;
    const fraction = runProgress % 2;
    const travel = fraction < 1 ? fraction : 2 - fraction;
    this.batter.c.setPosition(running ? 461 : 464, running ? 425 - travel * 144 : 425);
    this.partner.c.setPosition(505, running ? 278 + travel * 144 : 278);
    animatePerson(this.batter, animTime, running); animatePerson(this.partner, animTime, running);
    const swing = m.swung && m.swingAge < 0.38;
    this.batter.blade.rotation = swing ? -2.3 * Math.sin(m.swingAge / 0.38 * Math.PI) : -0.15;
    this.batter.arm2.rotation = swing ? -1 : 0.08;
    this.aimGraphics.clear();
    if (['waiting', 'runup', 'delivery'].includes(m.state)) {
      const a = m.aim * Math.PI / 180, length = m.loft ? 105 : 80;
      const x = 480 + Math.sin(a) * length, y = 424 - Math.cos(a) * length;
      this.aimGraphics.lineStyle(2, 0xf9cc69, 0.7).lineBetween(480, 418, x, y);
      this.aimGraphics.fillStyle(0xf9cc69, 0.9).fillTriangle(x, y, x - Math.cos(a) * 5 - Math.sin(a) * 10, y - Math.sin(a) * 5 + Math.cos(a) * 10, x + Math.cos(a) * 5 - Math.sin(a) * 10, y + Math.sin(a) * 5 + Math.cos(a) * 10);
    }
    const contactNow = m.state === 'delivery' && Math.abs(m.flight - m.contactAt) < 0.145;
    this.contact.setFillStyle(0xf9cc69, contactNow ? 0.5 : 0.08).setScale(contactNow ? 1.12 : 1);
    const wicket = m.state === 'result' && m.lastResult === 'W' && m.feedback.startsWith('BOWLED');
    this.stumpPieces.forEach((p, i) => p.setRotation(wicket ? (i - 1) * 0.4 : 0));
    this.bails.setPosition(480 + (wicket ? 17 : 0), wicket ? 449 : 435).setRotation(wicket ? 1 : 0);
    this.ballView.setVisible(Boolean(m.ball)); this.ballShadow.setVisible(Boolean(m.ball)); this.trail.clear();
    if (m.ball) {
      const b = m.ball;
      this.ballView.setPosition(b.x, b.y - b.z).setScale(1 + b.z / 300);
      this.ballShadow.setPosition(b.x, b.y).setAlpha(clamp(0.5 - b.z / 350, 0.12, 0.5)).setScale(1 + b.z / 180);
      if (active && ['delivery', 'inplay'].includes(m.state)) {
        this.trailPoints.push({ x: b.x, y: b.y - b.z });
        if (this.trailPoints.length > 7) this.trailPoints.shift();
      }
      if (['delivery', 'inplay'].includes(m.state)) {
        for (let i = 1; i < this.trailPoints.length; i++) {
          this.trail.lineStyle(2, 0xffffff, i / this.trailPoints.length * 0.35);
          this.trail.lineBetween(this.trailPoints[i - 1].x, this.trailPoints[i - 1].y, this.trailPoints[i].x, this.trailPoints[i].y);
        }
      }
    } else this.trailPoints.length = 0;
    if (m.eventId !== lastEvent) {
      lastEvent = m.eventId;
      if (m.lastResult === 4 || m.lastResult === 6) {
        const text = this.add.text(480, 310, String(m.lastResult), { fontFamily: 'Arial', fontSize: '100px', fontStyle: 'bold', color: '#ffe09a', stroke: '#163a31', strokeThickness: 5 }).setOrigin(0.5).setDepth(30);
        this.tweens.add({ targets: text, y: 260, alpha: 0, duration: 1600, onComplete: () => text.destroy() });
      }
    }
  }
}
function updateUI() {
  const scoreHTML = `${match.runs}<span>/${match.wickets}</span>`;
  if ($('score').innerHTML !== scoreHTML) $('score').innerHTML = scoreHTML;
  $('overs').textContent = `${match.over} / 2 OVERS`;
  $('rate').textContent = match.balls ? (match.runs / match.balls * 6).toFixed(1) : '0.0';
  $('needed').textContent = `${Math.max(0, TARGET - match.runs)} FROM ${MAX_BALLS - match.balls}`;
  $('feedback').textContent = match.feedback;
  const labels = { ready: 'READY TO MAKE YOUR MARK?', waiting: 'TAKE YOUR GUARD', runup: 'BOWLER RUNNING IN', delivery: 'TIME YOUR SHOT', inplay: 'BALL IN PLAY', result: `${match.balls % 6 === 0 ? 'OVER COMPLETE' : 'DELIVERY COMPLETE'}`, over: 'INNINGS COMPLETE' };
  $('phase').textContent = labels[match.state];
  $('aim-label').textContent = Math.abs(match.aim) < 12 ? 'STRAIGHT' : match.aim < 0 ? 'LEG SIDE' : 'OFF SIDE';
  $('aim-marker').style.left = `${(match.aim + 70) / 140 * 100}%`;
  $('ground').classList.toggle('selected', !match.loft); $('loft').classList.toggle('selected', match.loft);
  $('ground').setAttribute('aria-pressed', String(!match.loft)); $('loft').setAttribute('aria-pressed', String(match.loft));
  $('timing-marker').style.left = `${match.progress * 99}%`;
  $('timing-label').textContent = match.state === 'delivery' ? (Math.abs(match.flight - match.contactAt) < 0.055 ? 'NOW!' : match.flight < match.contactAt ? 'GET READY' : 'LATE') : 'WATCH THE BALL';
  $('swing').disabled = match.state !== 'delivery' || match.swung || match.paused;
  $('pause').disabled = ['ready', 'over'].includes(match.state);
  $('pause').textContent = match.paused ? '▶' : 'II';
  $('pause').setAttribute('aria-label', match.paused ? 'Resume game' : 'Pause game');
  const overIndex = Math.floor(Math.max(0, match.balls - (match.state === 'result' || match.state === 'over' ? 1 : 0)) / 6);
  const thisOver = match.history.slice(overIndex * 6, overIndex * 6 + 6);
  const stamp = `${overIndex}:${thisOver.join(',')}`;
  if ($('balls').dataset.stamp !== stamp) {
    $('balls').dataset.stamp = stamp;
    $('balls').replaceChildren(...Array.from({ length: 6 }, (_, i) => {
      const el = document.createElement('span'), v = thisOver[i];
      el.className = 'ball' + (v === undefined ? ' empty' : v === 'W' ? ' wicket' : Number(v) >= 4 ? ' boundary' : '');
      el.textContent = v === undefined ? '–' : String(v); return el;
    }));
  }
}
function showOverlay(mode) {
  overlayMode = mode; $('overlay').hidden = false;
  $('instructions').hidden = mode !== 'start'; $('overlay-restart').hidden = mode !== 'pause';
  if (mode === 'pause') {
    $('modal-kicker').textContent = 'DRINKS BREAK'; $('modal-title').innerHTML = 'Take a<br><em>breather.</em>';
    $('modal-description').textContent = `${match.runs}/${match.wickets} after ${match.over} overs. Your innings is waiting.`;
    $('primary').textContent = 'RESUME INNINGS ↗';
  } else if (mode === 'over') {
    const won = match.runs >= TARGET;
    $('modal-kicker').textContent = won ? 'TARGET CONQUERED' : 'INNINGS COMPLETE';
    $('modal-title').innerHTML = won ? 'You are a<br><em>champion.</em>' : 'Every ball.<br><em>A new chance.</em>';
    $('modal-description').textContent = `${match.runs}/${match.wickets} in ${match.over} overs. ${won ? 'A winning innings!' : `You needed ${TARGET} to win. Try a new angle and come back stronger.`}`;
    $('primary').textContent = 'PLAY AGAIN ↗';
  }
  $('primary').focus({ preventScroll: true });
}
function start() {
  match.start(); accumulator = 0; lastEvent = 0; keys.clear();
  overlayMode = null; $('overlay').hidden = true; updateUI();
  if (scene) scene.tweens.resumeAll();
}
function pause() {
  if (['ready', 'over'].includes(match.state)) return;
  match.paused = !match.paused; keys.clear(); accumulator = 0;
  if (match.paused) { scene?.tweens.pauseAll(); showOverlay('pause'); }
  else { scene?.tweens.resumeAll(); overlayMode = null; $('overlay').hidden = true; }
  updateUI();
}
$('primary').addEventListener('click', () => match.paused ? pause() : start());
$('pause').addEventListener('click', pause);
$('restart').addEventListener('click', start); $('overlay-restart').addEventListener('click', start);
$('ground').addEventListener('click', () => { match.loft = false; updateUI(); });
$('loft').addEventListener('click', () => { match.loft = true; updateUI(); });
$('aim-left').addEventListener('click', () => { match.setAim(match.aim - 14); updateUI(); });
$('aim-right').addEventListener('click', () => { match.setAim(match.aim + 14); updateUI(); });
$('swing').addEventListener('click', () => { match.swing(); updateUI(); });
window.addEventListener('keydown', event => {
  if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyP', 'Escape'].includes(event.code)) {
    // A focused button keeps its normal Space activation, including overlay actions.
    if (event.code === 'Space' && overlayMode && event.target instanceof HTMLButtonElement && !event.target.disabled) return;
    event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'KeyP' || event.code === 'Escape') pause();
    if (match.paused || overlayMode) return;
    if (event.code === 'Space') match.swing();
    if (event.code === 'ArrowUp' || event.code === 'KeyW') match.loft = true;
    if (event.code === 'ArrowDown' || event.code === 'KeyS') match.loft = false;
  }
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); if (!match.paused && !['ready', 'over'].includes(match.state)) pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && !match.paused && !['ready', 'over'].includes(match.state)) pause(); });
if (!window.Phaser) $('load-error').hidden = false;
else {
  new Phaser.Game({
    type: Phaser.CANVAS, parent: 'game', width: 960, height: 610,
    backgroundColor: '#123b34', antialias: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    fps: { target: 60, forceSetTimeOut: false }, audio: { noAudio: true },
    scene: CricketScene, banner: false
  });
}
// Opt-in automation only. Normal play exposes no mutable match/debug controls.
if (new URLSearchParams(location.search).has('test')) {
  window.__cricket = { match, start, pause, get scene() { return scene; } };
}
