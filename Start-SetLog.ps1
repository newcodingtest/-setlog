param([ValidateSet('dev','build','preview','test','lint','typecheck','test:e2e')][string]$Task='dev')
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$systemNpm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if ($systemNpm) { & $systemNpm.Source run $Task; exit $LASTEXITCODE }
$portableNode = Join-Path $PSScriptRoot '.tools/node-v22.23.3-win-x64/node.exe'
$portableNpm = Join-Path $PSScriptRoot '.tools/node-v22.23.3-win-x64/node_modules/npm/bin/npm-cli.js'
if (!(Test-Path -LiteralPath $portableNode)) { throw 'Node.js 22.12 이상 LTS를 설치하고 npm install을 실행해주세요.' }
$env:Path = (Split-Path -Parent $portableNode) + ';' + $env:Path
$env:npm_config_cache = Join-Path $PSScriptRoot '.tools/npm-cache'
& $portableNode $portableNpm run $Task
exit $LASTEXITCODE
