#!/usr/bin/env bash
# bb runs this in every new worktree environment (cwd = the new worktree).
# A fresh worktree has no node_modules, so install dependencies here.
# `npm ci` also runs `prepare`, which re-installs the lefthook git hooks.
set -euo pipefail

npm ci --no-audit --no-fund
