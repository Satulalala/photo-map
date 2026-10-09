param(
  [ValidateSet('run', 'verify', 'check')]
  [string]$Action = 'run'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

# Prefer explicit environment settings; also locate common Windows installs.
if (-not $env:JAVA_HOME) {
  $javaCommand = Get-Command java.exe -ErrorAction SilentlyContinue
  if ($javaCommand) {
    $env:JAVA_HOME = Split-Path -Parent (Split-Path -Parent $javaCommand.Source)
  } elseif (Test-Path -LiteralPath 'D:\java\bin\java.exe') {
    $env:JAVA_HOME = 'D:\java'
  }
}
if (-not $env:JAVA_HOME -or -not (Test-Path -LiteralPath "$env:JAVA_HOME\bin\java.exe")) {
  throw '未找到 JDK。请安装 JDK 17+ 并设置 JAVA_HOME。'
}

$mavenCommand = Get-Command mvn.cmd -ErrorAction SilentlyContinue
$mavenPath = if ($mavenCommand) { $mavenCommand.Source } else { $null }
if (-not $mavenPath) {
  $ideaPaths = @('D:\IntelliJ IDEA*', "$env:ProgramFiles\JetBrains\IntelliJ IDEA*")
  foreach ($pattern in $ideaPaths) {
    $idea = Get-ChildItem -Path $pattern -Directory -ErrorAction SilentlyContinue
    foreach ($install in $idea) {
      $candidate = Join-Path $install.FullName 'plugins\maven\lib\maven3\bin\mvn.cmd'
      if (Test-Path -LiteralPath $candidate) { $mavenPath = $candidate; break }
    }
    if ($mavenPath) { break }
  }
}
if (-not $mavenPath) { throw '未找到 Maven。请安装 Maven 3.6.3+ 并添加到 PATH。' }

if ($Action -eq 'check') {
  & "$env:JAVA_HOME\bin\java.exe" -version
  & $mavenPath -version
  exit $LASTEXITCODE
}

$goal = if ($Action -eq 'verify') { 'verify' } else { 'spring-boot:run' }
& $mavenPath -f (Join-Path $projectRoot 'server-java\pom.xml') $goal
exit $LASTEXITCODE
