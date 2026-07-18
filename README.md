# GOLDEN STATE — Governor of California Simulator

A single-file, self-contained political simulation game. You are the Governor of
California: manage the budget deficit, the Legislature, wildfires, insurance
markets, high-speed rail, and your own political capital across a full term.

## Running it

The entire game is one static file with no dependencies or build step:

- Open `index.html` directly in a browser, or
- Serve the folder with any static host.

## Testing

The engine has a headless test harness (no dependencies beyond Node 18+):

```
npm test                        # all suites
node tests/run-all.js tests15   # a single suite by name fragment
```

`tests/run-all.js` extracts the engine from `index.html`, prepends DOM stubs
(`tests/stub.js`), and runs each suite in `tests/suites/` as a plain node
script — 300+ assertions covering the fiscal engine, legislation pipeline,
ballot operations, market macro layer, plus a random-action fuzzer,
a determinism check, and save/load equivalence. CI runs the same command on
every push (`.github/workflows/tests.yml`).

Saves autosave to `localStorage` after every month and action; the title
screen offers **Resume last game** when one exists. Save format is versioned
(`SAVE_VERSION`) and cross-version loads are refused loudly rather than
desyncing silently.

## Deployment

The game is deployed on Vercel as the `golden-state_3` project:
https://golden-state3.vercel.app

`index.html` in this repository is the source of truth. The repository is
connected to the Vercel project via the Git integration: pushes to `main`
deploy to production, and pushes to other branches create preview
deployments.
