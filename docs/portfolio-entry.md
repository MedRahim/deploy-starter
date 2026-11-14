# Portfolio entry — copy/paste into Upwork or LinkedIn

**Title:** Dockerized Express API with tests, CI and a real health check

**Link:** https://github.com/MedRahim/deploy-starter

**Image to upload:** `docs/architecture.png`

**Description (about 120 words):**

A small public API built the way I deploy client projects: a multi-stage Docker image running as a non-root user on a read-only filesystem, a `/health` endpoint wired into Docker's health check, graceful shutdown on redeploy, and GitHub Actions that install, test, audit, build the image and smoke-test the running container before anything ships. The API itself is deliberately simple — task CRUD with a JSON error contract, request ids, security headers and rate limiting — because the point is the delivery chain around it, not the feature list. The README documents the trade-offs, including what the repo is not. MIT licensed.

**Proof bullets (for a proposal):**

- Public repo, green CI badge, tests you can run in one command.
- Container is smoke-tested with `GET /health` on every push.
- Non-root user, read-only filesystem, dropped capabilities.
- Written handover: architecture diagram, env vars, deploy and rollback notes.

**One-line version:**

“I built and open-sourced the deployment pattern I use for client APIs: Docker multi-stage, non-root, health-checked, tested and smoke-tested in CI — github.com/MedRahim/deploy-starter.”
