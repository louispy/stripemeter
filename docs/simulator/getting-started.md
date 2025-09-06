# Simulator — Getting Started (v0.2.0)

Use the Simulator CLI to validate scenarios, run them with the pricing engine, and report diffs.

Prereqs
- pnpm install
- pnpm build

Commands
```bash
# Validate all scenarios under examples/
pnpm run sim validate --dir examples

# Run scenarios and write results to results/
pnpm run sim run --dir examples --out results --seed 42

# Record the current results as expected artifacts next to scenarios
pnpm run sim run --dir examples --out results --record

# Diff actual results vs expected and fail on differences
pnpm run sim report --dir examples --results results --fail-on-diff
```

Notes
- Scenario files use .sim.json and live wherever you choose (see examples/).
- Per-scenario tolerances via tolerances.absolute and tolerances.relative.
- Powered by @stripemeter/simulator-cli (`root package.json` exposes `pnpm run sim`).
