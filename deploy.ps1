# deploy.ps1
# Usage: .\deploy.ps1 "commit message"
# Commits all changes, pushes to origin & upstream, and deploys to Vercel production.

param(
    [string]$Message = "chore: deploy"
)

Write-Host "==> Committing changes..." -ForegroundColor Cyan
git add -A
git commit -m $Message

Write-Host "==> Pushing to origin..." -ForegroundColor Cyan
git push origin v2

Write-Host "==> Pushing to upstream..." -ForegroundColor Cyan
try { git push upstream v2 } catch { }

Write-Host "==> Deploying to Vercel production..." -ForegroundColor Cyan
npx vercel --prod --yes

Write-Host "==> Done!" -ForegroundColor Green
