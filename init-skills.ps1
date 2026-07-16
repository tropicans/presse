param(
    [string]$GlobalSkillsPath = "C:\Users\X1 Carbon\Downloads\Projects\self-hosted-ai-starter-kit\.agents\skills",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

function Resolve-FullPath {
    param([string]$Path)
    return [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $Path).Path)
}

$projectRoot = (Get-Location).Path
$agentsPath = Join-Path $projectRoot ".agents"
$localSkillsPath = Join-Path $agentsPath "skills"

if (-not (Test-Path -LiteralPath $GlobalSkillsPath)) {
    throw "Global skills path not found: $GlobalSkillsPath"
}

$globalSkillsFull = Resolve-FullPath -Path $GlobalSkillsPath

if (-not (Test-Path -LiteralPath $agentsPath)) {
    New-Item -ItemType Directory -Path $agentsPath | Out-Null
}

if (Test-Path -LiteralPath $localSkillsPath) {
    $existing = Get-Item -LiteralPath $localSkillsPath -Force

    if (($existing.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        $existingTarget = $null
        if ($existing.Target) {
            $existingTarget = [System.IO.Path]::GetFullPath((Join-Path $agentsPath $existing.Target))
        }

        if ($existingTarget -and ($existingTarget -ieq $globalSkillsFull)) {
            Write-Host "OK: .agents\\skills already points to global skills."
            exit 0
        }

        if (-not $Force) {
            throw ".agents\\skills already exists as link/junction to a different target. Re-run with -Force to replace it."
        }

        Remove-Item -LiteralPath $localSkillsPath -Force
    }
    else {
        if (-not $Force) {
            throw ".agents\\skills already exists as a regular file/folder. Re-run with -Force to replace it."
        }

        Remove-Item -LiteralPath $localSkillsPath -Recurse -Force
    }
}

New-Item -ItemType Junction -Path $localSkillsPath -Target $globalSkillsFull | Out-Null

Write-Host "Done: created junction"
Write-Host "  $localSkillsPath"
Write-Host "-> $globalSkillsFull"
