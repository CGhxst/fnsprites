# Fortnite Sprites Tracker

A client-side Fortnite Sprites collection tracker. Collection state stays in the
browser unless the user downloads a backup or creates a share link.

## Development

```sh
npm install
npm run dev
```

The local server runs at `http://127.0.0.1:4173/`.

```sh
npm run validate
npm run test:unit
npm run test:e2e
npm run check
```

## Architecture

- `app.js` owns DOM rendering and browser interaction.
- `src/` contains catalog, storage, sharing, backup, and export modules.
- `src/data/sprites.js` and `src/data/codes.js` contain the synchronized datasets.
- `scripts/` contains the data synchronization, validation, and local server tooling.
- `test/` and `e2e/` cover pure logic and real browser workflows.

`npm run sync` fetches live datasets from rickventure.com, downloads missing
sprite images, and validates data and image integrity.

The bundled Oswald font is distributed under the SIL Open Font License in
`fonts/OFL.txt`.
