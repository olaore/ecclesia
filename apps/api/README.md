# API

## Tests

Run the API test suite from the repo root:

```bash
pnpm --filter nehemiah-api test
```

The suite uses `@cloudflare/vitest-pool-workers` and starts isolated Cloudflare Worker runtimes via [vitest.config.ts](/home/olanix/workspace/github.com/olaore/nehemiah/apps/api/vitest.config.ts). In restricted sandboxes, the run may exit immediately after:

```text
[vpw:info] Starting isolated runtimes for vitest.config.ts...
```

That is an environment limitation, not a known repo failure. In a normal local shell or CI environment with the required Worker runtime access, the command completes successfully.
