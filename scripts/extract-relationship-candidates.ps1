[CmdletBinding()]
param([string]$OutputPath)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$intelligenceRoot = Join-Path $repositoryRoot 'docs\document-intelligence'
$manifestPath = Join-Path $intelligenceRoot 'SOURCE_MANIFEST.json'
$aliasPath = Join-Path $intelligenceRoot 'DOCUMENT_ALIASES.json'
if ([string]::IsNullOrWhiteSpace($OutputPath)) { $OutputPath = Join-Path $intelligenceRoot 'RELATIONSHIP_CANDIDATES.json' }
Import-Module -Force -Name (Join-Path $PSScriptRoot 'DocumentGraph.psm1')

function Get-Sha256File {
    param([string]$Path)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    $stream = [System.IO.File]::OpenRead($Path)
    try {
        return (($algorithm.ComputeHash($stream) | ForEach-Object { $_.ToString('x2') }) -join '')
    } finally {
        $stream.Dispose()
        $algorithm.Dispose()
    }
}

function Get-Sha256Text {
    param([string]$Text)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try {
        return (($algorithm.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Text)) | ForEach-Object { $_.ToString('x2') }) -join '')
    } finally {
        $algorithm.Dispose()
    }
}

$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
$aliasDocument = Get-Content -Raw -LiteralPath $aliasPath | ConvertFrom-Json
$aliases = @{}
foreach ($property in $aliasDocument.aliases.PSObject.Properties) { $aliases[$property.Name] = [string]$property.Value }

$candidates = [System.Collections.Generic.List[object]]::new()
foreach ($source in $manifest.sources) {
    $sourcePath = Join-Path $repositoryRoot ($source.path -replace '/', '\')
    $currentHash = Get-NormalizedFileSha256 -Path $sourcePath
    if ($currentHash -ne $source.sha256) { throw "Source drift detected before candidate extraction: $($source.path)" }
    $lines = [System.IO.File]::ReadAllLines($sourcePath)
    $sections = @(Get-DocumentSections -SourceId $source.source_id -Lines $lines)
    $expectedUids = @($source.sections | ForEach-Object stable_uid)
    $actualUids = @($sections | ForEach-Object StableUid)
    if (($expectedUids -join '|') -ne ($actualUids -join '|')) { throw "Stable section identity drift during candidate extraction: $($source.path)" }
    $sourceCandidates = @(Get-RelationshipCandidates -SourceId $source.source_id -Path $source.path -Lines $lines -Sections $sections -Aliases $aliases)
    foreach ($candidate in $sourceCandidates) {
        $disposition = if ($candidate.ResolvedTarget -eq $source.source_id) { 'duplicate' } else { $candidate.Disposition }
        $candidates.Add([pscustomobject][ordered]@{
            candidate_id = $candidate.CandidateId
            source_document = $candidate.SourceDocument
            source_section_uid = $candidate.SourceSectionUid
            source_path = $candidate.SourcePath
            line = $candidate.Line
            extractor = $candidate.Extractor
            original_text = $candidate.OriginalText
            raw_target = $candidate.RawTarget
            resolved_target = $candidate.ResolvedTarget
            resolution_note = $candidate.ResolutionNote
            disposition = $disposition
        })
    }
}

$ui = $manifest.sources | Where-Object source_id -eq 'UI'
$uiRoot = $ui.sections | Select-Object -First 1
$manualId = Get-Sha256Text "UI|$($uiRoot.stable_uid)|D04|unresolved-authority-consumer"
$candidates.Add([pscustomobject][ordered]@{
    candidate_id = "RC-$($manualId.Substring(0, 16))"
    source_document = 'UI'
    source_section_uid = $uiRoot.stable_uid
    source_path = $ui.path
    line = $uiRoot.line_start
    extractor = 'manual-authority-gap'
    original_text = 'The UI catalogue has no explicit source relationship to D04; the possible consumer relationship remains unresolved.'
    raw_target = 'D04'
    resolved_target = 'D04'
    resolution_note = 'unresolved-authority-consumer'
    disposition = 'unresolved'
})

$document = [ordered]@{
    schema_version = '1.0'
    source_manifest_sha256 = $manifest.manifest_sha256
    candidate_count = @($candidates | Sort-Object candidate_id -Unique).Count
    candidates = @($candidates | Sort-Object candidate_id -Unique)
}
[System.IO.File]::WriteAllText($OutputPath, (($document | ConvertTo-Json -Depth 10) + "`n"), [System.Text.UTF8Encoding]::new($false))

Write-Output "Candidates: $($document.candidate_count)"
Write-Output "Accepted: $(@($document.candidates | Where-Object disposition -eq 'accepted').Count)"
Write-Output "Unresolved: $(@($document.candidates | Where-Object disposition -eq 'unresolved').Count)"
Write-Output "Duplicate: $(@($document.candidates | Where-Object disposition -eq 'duplicate').Count)"
