param(
  [ValidatePattern('^[a-p]{32}$')][string]$ExtensionId,
  [switch]$ClearToken
)
$ErrorActionPreference = 'Stop'
$taskUtf8 = New-Object System.Text.UTF8Encoding($false)
$taskNode = (Get-Command node.exe -ErrorAction Stop).Source
$taskMajor = [int]((& $taskNode --version).TrimStart('v').Split('.')[0])
if ($taskMajor -lt 22) { throw 'Can Node.js 22 tro len. Cai Node.js LTS, sau do chay lai.' }
$taskRoot = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'PancakeAssistantPro'))
$taskExtension = Join-Path $taskRoot 'extension'
$taskHelper = Join-Path $taskRoot 'updater'
foreach ($taskDirectory in @($taskRoot, $taskExtension, $taskHelper)) {
  if (Test-Path -LiteralPath $taskDirectory) {
    if ((Get-Item -LiteralPath $taskDirectory).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Thu muc cai khong duoc la lien ket.' }
  } else { New-Item -ItemType Directory -Path $taskDirectory | Out-Null }
}
$taskSourceRoot = Split-Path -Parent $PSScriptRoot
$taskSourceExtension = Join-Path $taskSourceRoot 'extension'
if (-not (Test-Path -LiteralPath (Join-Path $taskSourceExtension 'manifest.json'))) {
  throw 'Hay chay install-update.cmd tu goi ZIP Windows da dong goi (node updater/build-release.cjs), khong chay truc tiep tu source.'
}
Write-Host 'Hay dong cac tab Pancake/POS truoc khi cai lai. Dang chuan bi ban extension...'
$taskDeployScript = 'require(process.argv[1]).installPackage(process.argv[2],process.argv[3]).catch(error=>{console.error(error.message);process.exitCode=1})'
& $taskNode -e $taskDeployScript (Join-Path $PSScriptRoot 'core.cjs') $taskRoot $taskSourceExtension
if ($LASTEXITCODE -ne 0) { throw 'Khong cai duoc extension; ban truoc da duoc giu/khoi phuc. Thu lai khi khong con trinh cap nhat dang chay.' }
$taskMarkerPath = Join-Path $taskExtension 'update-installation.json'
if (-not (Test-Path -LiteralPath $taskMarkerPath)) {
  [IO.File]::WriteAllText($taskMarkerPath, (@{ installationId = [Guid]::NewGuid().ToString() } | ConvertTo-Json), $taskUtf8)
}
Write-Host ''
Write-Host '1. Mo chrome://extensions, bat Developer mode.'
Write-Host '2. Tat ban Pancake Assistant Pro cu (neu co), bam Load unpacked va chon:'
Write-Host $taskExtension -ForegroundColor Cyan
Write-Host '3. Mo popup ban vua cai, muc Cap nhat qua GitHub, sao chep ID extension.'
Write-Host '   Lan chuyen thu muc dau tien can chon lai cac cong tac theo y ban.'
if (-not $ExtensionId) { $ExtensionId = Read-Host 'Dan ID extension (32 ky tu a-p)' }
if ($ExtensionId -notmatch '^[a-p]{32}$') { throw 'ID extension khong hop le.' }

foreach ($taskFile in @('host.cjs', 'core.cjs')) {
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot $taskFile) -Destination (Join-Path $taskHelper $taskFile) -Force
}
[IO.File]::WriteAllText((Join-Path $taskHelper 'config.json'), (@{ extensionId = $ExtensionId } | ConvertTo-Json), $taskUtf8)
# Keep the launcher stable outside the extension folder being replaced.
$taskLauncher = '@echo off' + "`r`n" + 'chcp 65001 >nul' + "`r`n" + '"' + $taskNode.Replace('%', '%%') + '" "%~dp0host.cjs" %*' + "`r`n"
[IO.File]::WriteAllText((Join-Path $taskHelper 'host.cmd'), $taskLauncher, $taskUtf8)
$taskHostManifest = @{
  name = 'com.pancakeassistant.updater'
  description = 'Pancake Assistant Pro GitHub updater'
  path = (Join-Path $taskHelper 'host.cmd')
  type = 'stdio'
  allowed_origins = @("chrome-extension://$ExtensionId/")
}
$taskManifestPath = Join-Path $taskHelper 'native-host.json'
[IO.File]::WriteAllText($taskManifestPath, ($taskHostManifest | ConvertTo-Json -Depth 4), $taskUtf8)
$taskRegistry = 'HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.pancakeassistant.updater'
New-Item -Path $taskRegistry -Force | Out-Null
Set-Item -LiteralPath $taskRegistry -Value $taskManifestPath

$taskTokenPath = Join-Path $taskRoot 'github-token.xml'
if ($ClearToken -and (Test-Path -LiteralPath $taskTokenPath)) { Remove-Item -LiteralPath $taskTokenPath }
Write-Host ''
Write-Host 'Repo private: nhap fine-grained GitHub token chi cho repo PancakeExtensionPro, Contents: Read-only.'
Write-Host 'Repo public hoac da luu token: bam Enter de bo qua. Token duoc ma hoa DPAPI theo tai khoan Windows.'
$taskToken = Read-Host 'GitHub token (an noi dung)' -AsSecureString
if ($taskToken.Length -gt 0) {
  $taskCredential = New-Object System.Management.Automation.PSCredential('GitHub', $taskToken)
  $taskCredential | Export-Clixml -LiteralPath $taskTokenPath
}
Write-Host ''
Write-Host 'Da cai trinh cap nhat. Mo popup va bam Kiem tra ban moi.' -ForegroundColor Green
Write-Host 'Chrome tu kiem tra moi gio khi dang mo; dong cac tab Pancake/POS de ap dung ban moi.'
Write-Host 'Khong can giu terminal nay. Chuong trinh khong tu tai lai tab dang lam viec.'
