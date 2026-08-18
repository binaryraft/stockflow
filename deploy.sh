#!/bin/bash
# Usage: ./deploy.sh "commit message"
# Commits all changes, pushes to origin & upstream, and deploys to Vercel production.

set -e

MSG="${1:-chore: deploy}"

echo "==> Committing changes..."
git add -A
git commit -m "$MSG"

echo "==> Pushing to origin..."
git push origin v2

echo "==> Pushing to upstream..."
git push upstream v2 || true

echo "==> Deploying to Vercel production..."
npx vercel --prod --yes

echo "==> Done!"
