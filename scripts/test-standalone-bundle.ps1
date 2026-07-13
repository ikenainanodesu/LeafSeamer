param(
  [Parameter(Mandatory = $true)]
  [string]$Bundle
)

# 在系统临时目录中验证单个 bundle 不依赖仓库根目录资源。
$projectRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $projectRoot "bundles\$Bundle"
$targetRoot = Join-Path ([System.IO.Path]::GetTempPath()) "leafseamer-standalone"
$target = Join-Path $targetRoot $Bundle
$resolvedTargetRoot = [System.IO.Path]::GetFullPath($targetRoot)
$resolvedTarget = [System.IO.Path]::GetFullPath($target)

if (-not (Test-Path -LiteralPath $source)) {
  throw "Bundle not found: $Bundle"
}

# 删除前确认解析后的目标仍位于隔离测试根目录内。
if (-not $resolvedTarget.StartsWith("$resolvedTargetRoot$([System.IO.Path]::DirectorySeparatorChar)")) {
  throw "Refusing to use a target outside the standalone test root: $resolvedTarget"
}

if (Test-Path -LiteralPath $resolvedTarget) {
  Remove-Item -LiteralPath $resolvedTarget -Recurse -Force
}

New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
Copy-Item -LiteralPath $source -Destination $resolvedTarget -Recurse

Push-Location $resolvedTarget
try {
  npm.cmd install --ignore-scripts
  if ($LASTEXITCODE -ne 0) { throw "npm install failed for $Bundle" }
  npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw "npm run build failed for $Bundle" }
} finally {
  Pop-Location
}
