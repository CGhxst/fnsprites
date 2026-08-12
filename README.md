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
- `src/generated/sprites.js` is generated from the synchronized data sheet.
- `scripts/` contains the safe data parser, validator, generator, and local server.
- `test/` and `e2e/` cover pure logic and real browser workflows.

The scheduled sync imports `sprites-data.js` and `sprites/` from upstream,
parses the data without executing it, regenerates the application module, and
validates data and image integrity.

The bundled Oswald font is distributed under the SIL Open Font License in
`fonts/OFL.txt`.
