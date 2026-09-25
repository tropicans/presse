param(
    [string]$GlobalSkillsPath = "C:\Users\X1 Carbon\Downloads\Projects\self-hosted-ai-starter-kit\.agents\skills"
)

$ErrorActionPreference = "Stop"

$profilePath = $PROFILE.CurrentUserCurrentHost
$profileDir = Split-Path -Parent $profilePath

if (-not (Test-Path -LiteralPath $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir | Out-Null
}

$globalSkillsEscaped = $GlobalSkillsPath.Replace("'", "''")

$functionBlock = @'

function Use-GlobalSkills {
    param(
        [string]$ProjectPath = (Get-Location).Path,
        [string]$GlobalSkillsPath = '__GLOBAL_SKILLS_PATH__',
        [switch]$Force
    )

    $ErrorActionPreference = 'Stop'
    $projectPathFull = (Resolve-Path -LiteralPath $ProjectPath).Path
    $globalSkillsFull = (Resolve-Path -LiteralPath $GlobalSkillsPath).Path
    $agentsPath = Join-Path $projectPathFull '.agents'
    $localSkillsPath = Join-Path $agentsPath 'skills'

    if (-not (Test-Path -LiteralPath $globalSkillsFull)) {
        throw "Global skills path not found: $GlobalSkillsPath"
    }

    if (-not (Test-Path -LiteralPath $agentsPath)) {
        New-Item -ItemType Directory -Path $agentsPath | Out-Null
    }

    if (Test-Path -LiteralPath $localSkillsPath) {
        $existingItem = Get-Item -LiteralPath $localSkillsPath -Force
        $existingFull = (Resolve-Path -LiteralPath $localSkillsPath).Path

        if ($existingFull -ieq $globalSkillsFull) {
            Write-Host "OK: .agents\skills already uses global skills."
            return
        }

        if (($existingItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -and $existingItem.Target) {
            $targetCandidate = $existingItem.Target
            if (-not [System.IO.Path]::IsPathRooted($targetCandidate)) {
                $targetCandidate = Join-Path $agentsPath $targetCandidate
            }

            try {
                $existingTargetFull = [System.IO.Path]::GetFullPath($targetCandidate)
                if ($existingTargetFull -ieq $globalSkillsFull) {
                    Write-Host "OK: .agents\skills already uses global skills."
                    return
                }
            }
            catch {
            }
        }

        if (-not $Force) {
            throw ".agents\\skills already exists. Re-run with -Force to replace it."
        }

        Remove-Item -LiteralPath $localSkillsPath -Recurse -Force
    }

    New-Item -ItemType Junction -Path $localSkillsPath -Target $globalSkillsFull | Out-Null

    Write-Host "Done: $localSkillsPath -> $globalSkillsFull"
}

Set-Alias -Name uskills -Value Use-GlobalSkills -Scope Global
'@

$functionBlock = $functionBlock.Replace('__GLOBAL_SKILLS_PATH__', $globalSkillsEscaped)

$existing = ""
if (Test-Path -LiteralPath $profilePath) {
    $existing = Get-Content -LiteralPath $profilePath -Raw
}

$functionRegex = '(?ms)function\s+Use-GlobalSkills\s*\{.*?Set-Alias\s+-Name\s+uskills\s+-Value\s+Use-GlobalSkills\s+-Scope\s+Global\s*'
$normalizedBlock = $functionBlock.Trim() + "`r`n"

if ($existing -match "function\s+Use-GlobalSkills") {
    $updated = [regex]::Replace($existing, $functionRegex, $normalizedBlock, 1)
    Set-Content -LiteralPath $profilePath -Value $updated
    Write-Host "Updated existing Use-GlobalSkills in: $profilePath"
}
else {
    Add-Content -LiteralPath $profilePath -Value $functionBlock
    Write-Host "Installed to profile: $profilePath"
}

Write-Host "Run: . `$PROFILE"
Write-Host "Then use: uskills"
