# CRICKET CHAMPIONS 2D

A complete, lightweight two-over batting challenge built with **Phaser 3**, plain JavaScript, HTML and CSS. Score **24 runs in 12 legal balls**, with **3 wickets** available. Play the entire innings even if you reach the target early, and try to improve your score.

## Play online with GitHub Pages

The game is ready for static GitHub Pages hosting. No Node.js process, npm
installation, CDN, or backend is needed on the hosting server. Phaser 3.90.0
and its MIT license are committed under `vendor/`. CSS, scripts, module imports
and the home link use relative paths, so the game works under
`/CRICKET-CHAMPION/` as well as at a domain root. `.nojekyll` disables Jekyll.

The prepared `gh-pages` branch contains only the static game files. In the
repository's **Settings → Pages**, choose **Deploy from a branch**, select
**gh-pages** and **/(root)**, then **Save**. Once GitHub's Pages deployment
finishes, the public game address will be:

**https://fatehqazi.github.io/CRICKET-CHAMPION/**

That address becomes live only after Pages is enabled and deployment succeeds.
Check the Pages settings/deployment status before sharing it. Public repositories
can use GitHub Pages for free; private repository availability depends on the
GitHub plan. The development branch retains the source, server and tests.

For another static host, run `npm run build:pages` and upload the **contents** of
`dist/CRICKET-CHAMPION/`. The export contains only HTML, CSS, JavaScript and the
vendored library/license. The export itself can be served by any static HTTP
server. `npm run test:pages` verifies it with Python and Chromium under the exact
project subpath, without Node serving the site or any `node_modules` requests.
The Python test server requires Python 3; hosted gameplay does not.

## Cloud preview and localhost

`npm start` listens on **0.0.0.0:8080**, including interfaces needed by a preview
forwarder. A forwarding service must still supply a public HTTPS URL; binding to
all interfaces alone does not expose a cloud machine to the Internet. This cloud
onboarding environment has no supported public preview-forwarding tool.

Opening `localhost:8080` on a Windows PC connects to that Windows PC, not this
cloud machine. Use the published GitHub Pages address for remote play. A local
address is appropriate only when you start the server on the same PC. A cloud
server process can also stop when its environment is suspended; static Pages
hosting does not depend on that process staying alive.

## Run on Windows / Chrome

Install **Node.js 20 or newer** (includes npm), then open a terminal in the repository:

```sh
npm ci
npm start
```

Open **http://localhost:8080** in Chrome. Click **Take the crease** to begin. Keep the server terminal open; stop it with Ctrl+C. To use a different port in PowerShell, run `$env:PORT=8090; npm start`.

`index.html` is the entry point. Serve it through the included server rather than double-clicking the file, because the game uses JavaScript modules. Phaser is bundled as a committed static asset; playing makes no CDN requests and requires no external images, fonts, audio, accounts, or credentials. Internet is needed only for the initial npm installation.

## Play

| Control | Action |
| --- | --- |
| Left / Right or A / D | Hold to aim, up to 70° on either side |
| Up or W | Select a lofted shot |
| Down or S | Select a ground shot |
| Space | Swing once per delivery |
| P or Escape | Pause / resume |
| On-screen buttons | Aim, select shot, swing, pause, restart |

Watch the bowler's run-up and the ball's bounce. Swing **when the ball enters the gold ring at the batter**, or when the timing marker reaches the gold zone. The middle of that zone gives maximum power. Early and late contact reduce power and accuracy; swinging completely outside the contact window misses. Holding Space cannot produce extra swings.

Aim between the orange fielders. Ground shots are safer; lofts can clear the rope but can be caught. Running is automatic: 0–3 runs are awarded for completed runs before the ball is collected. A bouncing ball crossing the boundary scores **4**; a loft clearing it before its first bounce scores **6**. A missed ball bowls you; a descending airborne loft can be caught. Every delivery is legal, so six balls make an over. The scoreboard shows runs/wickets, overs, target, run rate, runs needed, and each ball in the current over.

The challenge ends after 2 overs or 3 wickets. The results screen offers another innings. Pause and restart are also available during play. Switching away from the window pauses automatically, so you do not lose deliveries in the background.

## Included in this version

- Illustrated oval with boundary rope, mown outfield, pitch, creases, wickets, stands and crowd.
- Animated bowler run-up, delivery bounce, batting swing, runners, fielders, broken stumps and boundary celebrations.
- Fixed-step ball movement, gravity, bounce, rolling friction, timing-based contact and directional shot velocity.
- Fielders visibly pursue and collect the ball; catches use proximity and ball height rather than random dismissal rolls.
- Start, pause, restart, victory and innings-complete screens; keyboard and button controls.
- Responsive scoreboard and interface. Fixed 960 × 610 Canvas rendering; stadium cached as a bitmap. No WebGL requirement or costly effects during play.

This is an arcade batting challenge, not a full cricket simulator. There are no wides, no-balls, LBW, manual running, run-outs, bowling controls, multiplayer or advanced field placement. Those can be added later without complicating the first playable version.

## Test

```sh
npm test
npm run test:browser
npm run test:pages
```

The first command runs 14 deterministic Node tests covering bounce/contact, timing, direction and power, ground boundaries, sixes, fielding, catches, pause, wickets, restart and full innings/over counting.

Browser tests use Playwright to launch a real Chromium browser, render the Phaser Canvas, exercise keyboard/button input, score runs, pause/resume, finish an innings and restart. Screenshots go to ignored `test-results/`. The cloud uses `/usr/bin/chromium`. On another machine, set `CHROMIUM_PATH` to an installed Chrome/Chromium executable, e.g. in PowerShell:

```powershell
$env:CHROMIUM_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run test:browser
npm run test:pages
```

Only Phaser ships with the game. Playwright is a development-only dependency. No bundler or build step is required. Browser validation uses Linux Chromium; physical Windows/older integrated GPU performance still needs testing on that hardware.

## Project layout

- `index.html`, `style.css`: scoreboard, controls, overlays and responsive presentation.
- `src/engine.js`: match rules and renderer-independent fixed-step physics.
- `src/game.js`: Phaser scene, procedural art, animation, controls and UI binding.
- `server.mjs`: dependency-free local HTTP server.
- `vendor/`: committed Phaser browser distribution and MIT license.
- `scripts/build-pages.mjs`: exports the standalone static site.
- `tests/pages/`: static hosting, relative asset paths and browser gameplay smoke test.
- `tests/`: match rules and Chromium integration tests.

For browser automation only, `/?test` opts into a `window.__cricket` inspection hook. It is absent during normal play.
