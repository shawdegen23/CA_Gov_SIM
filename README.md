# GOLDEN STATE — Governor of California Simulator

A single-file, self-contained political simulation game. You are the Governor of
California: manage the budget deficit, the Legislature, wildfires, insurance
markets, high-speed rail, and your own political capital across a full term.

## Running it

The entire game is one static file with no dependencies or build step:

- Open `index.html` directly in a browser, or
- Serve the folder with any static host.

## Deployment

The game is deployed on Vercel as the `golden-state_3` project:
https://golden-state3.vercel.app

`index.html` in this repository is the source of truth. The repository is
connected to the Vercel project via the Git integration: pushes to `main`
deploy to production, and pushes to other branches create preview
deployments.
