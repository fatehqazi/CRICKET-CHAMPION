# Phaser browser distribution

`phaser-3.90.0.min.js` is the unmodified Phaser 3.90.0 browser build copied from
`node_modules/phaser/dist/phaser.min.js` after installing the integrity-pinned
npm lockfile. Its MIT license is preserved in `PHASER-LICENSE.md`.

The browser loads this committed asset so GitHub Pages does not need Node.js,
`npm install`, a bundler, or access to a CDN. To update Phaser, update the exact
package/lockfile version, replace this file and the license from the installed
package, then run the engine, browser, and Pages tests.
