// Deterministic, renderer-independent match rules and fixed-step ball physics.
export const FIELD = { cx: 480, cy: 322, rx: 392, ry: 244, batX: 480, batY: 424 };
export const MAX_BALLS = 12;
export const MAX_WICKETS = 3;
export const TARGET = 24;
export const CONTACT_WINDOW = 0.145;
export const FIELDER_SPOTS = [[275, 230], [680, 235], [200, 395], [765, 390], [385, 145], [580, 140], [365, 495], [610, 495]];
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export function outsideBoundary(x, y) {
  return ((x - FIELD.cx) / FIELD.rx) ** 2 + ((y - FIELD.cy) / FIELD.ry) ** 2 >= 1;
}
export class Match {
  constructor(random = Math.random) { this.random = random; this.reset(); }
  reset() {
    this.runs = 0; this.wickets = 0; this.balls = 0; this.history = [];
    this.aim = 0; this.loft = false; this.state = 'ready'; this.clock = 0;
    this.feedback = 'Watch the bowler'; this.ball = null; this.paused = false;
    this.fielders = FIELDER_SPOTS.map(([x, y]) => ({ x, y }));
    this.shot = null; this.swung = false; this.eventId = 0; this.lastResult = null;
  }
  start() { this.reset(); this.state = 'waiting'; this.clock = 0.7; }
  get over() { return `${Math.floor(this.balls / 6)}.${this.balls % 6}`; }
  get finished() { return this.balls >= MAX_BALLS || this.wickets >= MAX_WICKETS; }
  get progress() { return this.state === 'delivery' ? clamp(0.5 + (this.flight - this.contactAt) / 0.8, 0, 1) : 0; }
  setAim(value) { this.aim = clamp(value, -70, 70); }
  beginRunup() {
    this.state = 'runup'; this.clock = 0; this.ball = null; this.shot = null; this.swung = false;
    this.fielders = FIELDER_SPOTS.map(([x, y]) => ({ x, y }));
    this.feedback = 'Bowler approaching…';
  }
  release() {
    this.state = 'delivery'; this.flight = 0;
    this.contactAt = 1.02 + this.random() * 0.22;
    this.line = (this.random() - 0.5) * 20;
    this.ball = { x: 480, y: 263, z: 32, vx: 0, vy: 0, vz: 0 };
    this.feedback = 'Watch the bounce. Swing at the gold ring!';
  }
  swing() {
    if (this.paused || this.state !== 'delivery' || this.swung) return false;
    this.swung = true; this.swingAge = 0;
    const error = this.flight - this.contactAt;
    if (Math.abs(error) > CONTACT_WINDOW) {
      this.feedback = error < 0 ? 'Too early! Bat through the ball.' : 'Too late! Watch the next one.';
      return false;
    }
    const quality = 1 - Math.abs(error) / CONTACT_WINDOW;
    const angle = (this.aim + (this.random() - 0.5) * (1 - quality) * 28) * Math.PI / 180;
    const speed = (this.loft ? 220 : 195) + quality * (this.loft ? 145 : 150);
    this.ball = { x: FIELD.batX + this.line, y: FIELD.batY, z: 5,
      vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed,
      vz: this.loft ? 115 + quality * 125 : 18 + quality * 8 };
    this.shot = { quality, loft: this.loft, bounced: false, elapsed: 0, distance: 0, startX: this.ball.x, startY: this.ball.y };
    this.state = 'inplay';
    this.feedback = `${quality > 0.8 ? 'Perfect timing!' : quality > 0.4 ? 'Good contact!' : 'An edge!'} ${this.loft ? 'Up in the air…' : 'Along the carpet.'}`;
    return true;
  }
  // Browser simulation advances at 120 Hz. Tests can use the same fixed step.
  step(dt) {
    if (this.paused || this.state === 'ready' || this.state === 'over') return;
    if (this.swingAge !== undefined) this.swingAge += dt;
    if (this.state === 'waiting' || this.state === 'result') {
      this.clock -= dt;
      if (this.clock <= 0) {
        if (this.finished) { this.state = 'over'; return; }
        this.beginRunup();
      }
    } else if (this.state === 'runup') {
      this.clock += dt;
      if (this.clock >= 1.1) this.release();
    } else if (this.state === 'delivery') {
      this.flight += dt;
      const t = this.flight / this.contactAt;
      this.ball.x = 480 + this.line * t;
      this.ball.y = 263 + (FIELD.batY - 263) * t;
      // One visible pitch bounce, then a low ball at the batter's contact zone.
      this.ball.z = t < 0.61 ? 32 * (1 - t / 0.61) : Math.sin(clamp((t - 0.61) / 0.48, 0, 1) * Math.PI) * 17;
      if (t > 1.19) this.finishBall(0, true, 'BOWLED! The stumps are down.');
    } else if (this.state === 'inplay') this.stepShot(dt);
  }
  stepShot(dt) {
    const b = this.ball, s = this.shot;
    s.elapsed += dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.z += b.vz * dt; b.vz -= 190 * dt;
    if (b.z <= 0) {
      b.z = 0;
      s.bounced = true;
      if (Math.abs(b.vz) > 22) b.vz = -b.vz * 0.3; else b.vz = 0;
      b.vx *= Math.exp(-0.62 * dt); b.vy *= Math.exp(-0.62 * dt);
    } else if (b.z < 2 && b.vz < 0) {
      b.vx *= Math.exp(-0.62 * dt); b.vy *= Math.exp(-0.62 * dt);
    }
    s.distance = Math.hypot(b.x - s.startX, b.y - s.startY);
    if (outsideBoundary(b.x, b.y)) {
      const six = s.loft && !s.bounced;
      this.finishBall(six ? 6 : 4, false, six ? 'SIX! Into the stands.' : 'FOUR! Races to the rope.');
      return;
    }
    // Fielders pursue the landing position; no invisible random dismissal rolls.
    for (const f of this.fielders) {
      const dx = b.x - f.x, dy = b.y - f.y, d = Math.hypot(dx, dy);
      const pace = 64;
      if (d > 8) { f.x += dx / d * Math.min(d, pace * dt); f.y += dy / d * Math.min(d, pace * dt); }
      if (Math.hypot(b.x - f.x, b.y - f.y) < 15 && b.z < 19 && s.elapsed > 0.24) {
        if (s.loft && !s.bounced && b.vz < 0) this.finishBall(0, true, 'CAUGHT! Straight to the fielder.');
        else this.completeRuns();
        return;
      }
    }
    if (s.elapsed >= 5.8 || (s.bounced && Math.hypot(b.vx, b.vy) < 28)) this.completeRuns();
  }
  completeRuns() {
    // Time available before collection drives automatic running. Never more than 3.
    const runs = clamp(Math.floor((this.shot.elapsed + 0.25) / 1.15), 0, 3);
    this.finishBall(runs, false, runs ? `${runs} RUN${runs > 1 ? 'S' : ''}! Good running between the wickets.` : 'DOT BALL. Pick a gap next time.');
  }
  finishBall(runs, wicket, message) {
    this.runs += runs; this.wickets += Number(wicket); this.balls++;
    this.lastResult = wicket ? 'W' : runs; this.history.push(this.lastResult);
    this.feedback = message; this.eventId++; this.state = 'result'; this.clock = 2.1;
  }
}
