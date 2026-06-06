# Development Memo

This memo is for development-facing context that should travel with the
repository. Keep entries concise and update it when requirements, implementation
decisions, or release-readiness status changes.

## Requirements

- Keep the repository suitable for source distribution.
- Ensure users can deploy from the repository with the expected flow:
  `npm install`, `npm run build`, then `npm start`.
- Include configuration examples needed for deployment.
- Exclude local runtime data, credentials, dependencies, logs, backups, and
  generated build artifacts from Git.

## Changes

- Reorganized `.gitignore` by category:
  dependencies, build output, NodeCG runtime data, local configuration/secrets,
  diagnostics, editor files, and local tool state.
- Added tracked configuration templates under `cfg/`:
  `nodecg.json.example`, `data-sync-service.json.example`, and `README.md`.
- Removed obsolete development leftovers:
  `test-regex.js` and bundle-level `package.json.off` files.
- Moved the HTML recovery helper from the repository root to
  `scripts/restore-html.js`.
- Fixed TypeScript issues that blocked project-wide type checking:
  shared path alias, dashboard `global.d.ts` references, an implicit `any`, and
  an ATEM macro display type narrowing.

## Progress

- `npm.cmd run typecheck` passes.
- `npm.cmd run build` passes and builds all 10 NodeCG bundles.
- Generated bundle output remains ignored:
  `bundles/*/dashboard/`, `bundles/*/graphics/`, `bundles/*/shared/`, and
  `bundles/*/extension/index.js`.
- Real NodeCG config and data remain ignored:
  `cfg/*.json`, `db/`, `logs/`, `backups/`, and `assets/`.

## Notes

- `package-lock.json` had pre-existing local changes before the cleanup work.
  Review it separately before committing if lockfile churn is not desired.
- Real Google Sheets credentials should not be committed. Use
  `cfg/data-sync-service.json.example` as the template and keep credential JSON
  files local.
- If a release package is intended to run without a build step, produce it from
  a clean build artifact process rather than committing generated bundle output.
