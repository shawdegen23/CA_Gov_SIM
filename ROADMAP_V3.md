# GOLDEN STATE — v3 Roadmap

**Theme: no new systems.** v2 built the machine — cabinet, legislation pipeline, ballot
operations, county homelessness, the macro market, earned action slots. v3 makes that
machine *trustworthy*: tuned numbers, hunted bugs, a UI that explains itself, and an
engineering foundation that catches regressions before players do.

Four phases, in order. Each has acceptance criteria you can check, not vibes.

---

## Phase 0 — Lock the foundation (engineering hygiene)

The 316-assertion headless test suite currently lives outside the repo. That is the
single biggest risk to everything else in this roadmap.

- [ ] **Commit the test harness.** `tests/` directory: `stub.js` (DOM stubs), the 14
      suites, an `extract.sh` that pulls the engine out of `index.html`, and a
      `run-all.js` that exits non-zero on any failure.
- [ ] **CI on every push.** GitHub Action: extract engine → run all suites → block the
      merge on red. Vercel already deploys `main`; CI becomes the gate in front of it.
- [ ] **One-command local check.** `npm test` (a five-line `package.json`, no deps —
      the game stays a single file; the harness is repo tooling, not shipped code).
- [ ] **Autosave.** The game only saves via copy-paste JSON today. Add a silent
      `localStorage` autosave every month-end + "Resume last game" on the title screen.
      Same save format, same v2 version gate — this is recovery, not a new system.
- [ ] **Error net.** `window.onerror` → toast with a copyable state dump (seed, turn,
      last action). Turns "it broke" bug reports into reproducible ones.

**Done when:** a fresh clone can run the whole suite with one command, CI is green on
`main`, and closing the tab mid-term costs nothing.

---

## Phase 1 — Logic fine-tuning (the balance pass)

Every number below exists and works; none has been *calibrated* against play patterns.
Method: build a small bot harness on top of the test rig (greedy strategies: budget-hawk,
legislator, populist, ballot-warrior, do-nothing) and run each over 100+ seeds. Tune
until the outcome distributions look right, then **pin the distributions in a
regression suite** so future changes can't silently unbalance the game.

### Fiscal engine
- [ ] Revenue elasticity is a placeholder (~$11B/yr per sustained 10% drawdown, flagged
      in MODEL NOTES). Calibrate the staged translation against the LAO's published
      scenario ranges; keep the note but shrink the "placeholder" caveat.
- [ ] Surplus behavior: the deficit clamps at −$18B but almost nothing interesting
      happens down there. Verify the good-times path (BSA fills, maintenance factor
      repays, pressure to spend) actually engages instead of flatlining.
- [ ] April window: confirm the ×1.35 fast-lag translation can't double-count against
      the incremental `revApplied` ledger across a mode change mid-quarter.

### Political economy
- [ ] PC audit: list every source and sink, verify no strategy generates PC faster than
      the intended ceiling, and that the regen clamp (1–9) never starves a quiet
      governor into unplayability.
- [ ] War chest: the ad blitz is repeatable by design — verify chest income can't be
      farmed into "buy every measure." If a rich seed trivializes elections, add
      diminishing returns per measure, not a hard cap.
- [ ] Dominant-strategy sweep: no bot strategy should win (or lose) more than ~75% of
      seeds. Anything outside that band gets a tuning ticket.

### Legislation & ballot
- [ ] Pass-rate targets by year and by verb effort (sponsor-only vs. fully whipped) —
      decide the intended curve, measure the actual one, close the gap.
- [ ] "AS AMENDED" bills apply ~60% effects — confirm every fx path (law columns,
      fiscal tags, actor moves) respects the haircut, not just the headline numbers.
- [ ] Ballot math symmetry: player spend is +0.4/point while each funded foe is a flat
      −6. Check that a maxed campaign against full opposition is winnable but expensive,
      and that hostile measures stay dangerous to ignore.

### Issues & difficulty curve
- [ ] Law columns are permanent and stack. Simulate a legislation-heavy 4-year run and
      confirm year-4 issue scores stay inside believable ranges (housing can't be
      "solved" by bill volume alone).
- [ ] Late-game slack: machine slot + veteran slot + a seated cabinet make year 4
      strictly easier. Counterweight with existing systems (scandal risk already scales
      with cabinet `risk`; verify it actually bites) rather than new mechanics.
- [ ] Market feel check: hands-off crash rate is now ~80% over 40 seeds. Confirm it
      *feels* right in play — corrections early in a term should be survivable,
      year-4 corrections should be brutal but not auto-loss.

**Done when:** the bot harness runs in CI as a slow nightly job and the pinned
distribution tests pass.

---

## Phase 2 — Debugging sweep

- [ ] **Monkey fuzzer.** A bot that takes *random legal actions* (every action, every
      verb, every menu) for full 48-turn terms across 200+ seeds. Zero uncaught
      exceptions is the bar. (The 60-seed no-action fuzz already caught the holdout
      `>>>` crash; random-action coverage is the missing half.)
- [ ] **Month-end timing audit.** The year-2 budget lock came from a scheduled event
      firing at January's *end*. Grep every `m===` / `scheduledEvents` site and assert
      each one's intended month in a dedicated timing suite — this bug family has had
      multiple members.
- [ ] **Save/load equivalence.** Fuzzed run, serialize + thaw every month, deep-compare
      against the uninterrupted run. Any divergence is a bug (RNG state, `revApplied`,
      `macro`, lag queue — all of it rides along or the save lies).
- [ ] **Determinism hash.** Same seed + same scripted actions → identical end-state
      hash, twice. Catches any stray `Math.random()`/`Date.now()` in the engine.
- [ ] **Old-save migration.** v2 saves predating `market.macro` load via the in-engine
      guard — add a test with a real pre-macro save blob so the guard can't rot.
- [ ] **Dead weight.** Sweep TUNING for orphaned keys, `flags` for write-only flags,
      and the 131 functions for unreachable ones. Delete or wire up.
- [ ] **Bounds.** Feed caps at 200; verify `market.hist`, `eras`, `measures.resolved`,
      and the lag queue are all bounded or trivially small over a max-length game.

**Done when:** fuzzer + timing + equivalence suites are green in CI and stay there.

---

## Phase 3 — Aesthetics & UI polish

The information exists; the hierarchy doesn't always. Priorities from playtest friction:

- [ ] **The feed is a firehose.** 200 literary entries with no read-state. Add: unread
      divider per month, source filters (LAO / AP / Politico / CalMatters), and a
      collapsed-by-default mode with expand-on-click. Keep the prose — it's the
      game's voice — but let players skim.
- [ ] **"What changed this month."** A compact month-end digest (3–5 deltas with
      arrows: approval, deficit, top issue moves, market) pinned above the feed. The
      numbers already exist; this is presentation only.
- [ ] **Number & color consistency.** One formatting rule per unit ($B via `fmtB`
      everywhere, % one decimal, PC integer) and one semantic per color (red = bad
      for *you*, not merely "down"). Audit every tile, pill, and panel against it.
- [ ] **Tooltips for the invisible.** Hazard, PC regen, slot count, Prop 98 share,
      pension rate — each gets a hover/tap explainer sourced from the mechanic itself.
      No new screens; annotate what's already shown.
- [ ] **Mobile pass.** Breakpoints exist (1100/900/760px) but the cockpit hasn't been
      driven at 375px. Fix touch targets (<44px pills), sticky topbar height, and the
      bill tracker's horizontal squeeze. Playwright viewport screenshots at 375/768/1280
      become part of the release checklist.
- [ ] **Modal & keyboard ergonomics.** Esc closes, Enter confirms, focus is trapped and
      restored. Confirm-step on the three irreversible actions (veto, emergency
      declaration, Test the Limits).
- [ ] **Accessibility floor.** Contrast-check the palette (the `subtle` gray on dark is
      the likely offender), focus outlines on all interactive elements, `aria-label`s
      on icon-only buttons. `prefers-reduced-motion` is already respected — keep it.
- [ ] **Render performance.** `render()` rebuilds the whole page's innerHTML; audit for
      focus/scroll loss (the API-key input, feed scroll position) and either preserve
      state across renders or scope the rebuild. No framework — just discipline.

**Done when:** a phone playthrough is comfortable, a first-time player can learn the
rules from tooltips alone, and no interaction loses scroll or focus.

---

## Phase 4 — Release polish

- [ ] In-game version stamp + changelog modal (pull from a `CHANGELOG.md` at build…
      no build exists — inline a short array; update it with each release commit).
- [ ] MODEL NOTES drawer audit: every placeholder/assumption in the engine has a note;
      every note still matches the code it describes.
- [ ] README: what the game is, how to play, how to run tests, save format caveats.
- [ ] The LLM flavor layer (BYO API key) is optional and off by default — verify the
      whole game is 100% playable and *silent about it* when no key is set, and that
      a key failure degrades gracefully mid-game.
- [ ] Final calibration freeze: re-run the Phase 1 distribution suite, screenshot the
      three viewports, tag `v3.0`.

---

## Sequencing & effort

| Phase | Size | Depends on |
|-------|------|-----------|
| 0 — Foundation | Small | — |
| 1 — Balance | Large | 0 (bots ride the test rig) |
| 2 — Debug sweep | Medium | 0 (fuzzer rides CI) |
| 3 — UI polish | Medium | none (parallel-safe with 1–2) |
| 4 — Release | Small | all |

Phases 1 and 2 share tooling and can interleave; Phase 3 is independent and can start
any time. Nothing in this roadmap adds a mechanic — if a balance fix seems to demand a
new system, it goes to the v4 idea list instead.
