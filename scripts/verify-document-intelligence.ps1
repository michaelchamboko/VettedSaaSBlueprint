[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSVersion.Major -ge 7) { $PSNativeCommandUseErrorActionPreference = $false }
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$intelligenceRoot = Join-Path $repositoryRoot 'docs\document-intelligence'
Import-Module -Force -Name (Join-Path $PSScriptRoot 'DocumentGraph.psm1')

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

function Get-SemanticJsonSha256 {
    param([string]$Path)
    $normalized = Get-Content -Raw -Encoding UTF8 -LiteralPath $Path | ConvertFrom-Json | ConvertTo-Json -Depth 100 -Compress
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try {
        return (($algorithm.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($normalized)) | ForEach-Object { $_.ToString('x2') }) -join '')
    } finally {
        $algorithm.Dispose()
    }
}

$manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $intelligenceRoot 'SOURCE_MANIFEST.json') | ConvertFrom-Json
$candidatePath = Join-Path $intelligenceRoot 'RELATIONSHIP_CANDIDATES.json'
$candidates = Get-Content -Raw -Encoding UTF8 -LiteralPath $candidatePath | ConvertFrom-Json
$graphPath = Join-Path $intelligenceRoot 'DOCUMENT_GRAPH.json'
$graph = Get-Content -Raw -Encoding UTF8 -LiteralPath $graphPath | ConvertFrom-Json
$agents = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $repositoryRoot 'AGENTS.md')

Assert-True ($manifest.source_count -eq 12) 'Expected exactly 12 registered source documents.'
Assert-True ($manifest.heading_count -eq 1424) 'Expected exactly 1,424 registered headings.'
Assert-True ($manifest.schema_version -eq '2.0') 'Expected source-manifest schema 2.0.'
Assert-True ($candidates.source_manifest_sha256 -eq $manifest.manifest_sha256) 'Candidate inbox is stale relative to the source manifest.'
Assert-True ($graph.source_manifest_sha256 -eq $manifest.manifest_sha256) 'Canonical graph is stale relative to the source manifest.'

$manifestSections = @($manifest.sources | ForEach-Object sections)
Assert-True ($manifestSections.Count -eq $manifest.heading_count) 'Manifest section count does not match heading count.'
$stableUids = @($manifestSections | ForEach-Object stable_uid)
Assert-True (@($stableUids | Sort-Object -Unique).Count -eq $stableUids.Count) 'Stable section UIDs are not unique.'

foreach ($source in $manifest.sources) {
    $sourcePath = Join-Path $repositoryRoot ($source.path -replace '/', '\')
    Assert-True (Test-Path -LiteralPath $sourcePath -PathType Leaf) "Missing registered source: $($source.path)"
    Assert-True ((Get-NormalizedFileSha256 -Path $sourcePath) -eq $source.sha256) "Source hash drift: $($source.path)"
}

$verificationToken = [guid]::NewGuid().ToString('N')
$freshCandidatePath = Join-Path ([System.IO.Path]::GetTempPath()) "vsb-candidates-$verificationToken.json"
$freshGraphPath = Join-Path ([System.IO.Path]::GetTempPath()) "vsb-graph-$verificationToken.json"
try {
    $null = & (Join-Path $PSScriptRoot 'extract-relationship-candidates.ps1') -OutputPath $freshCandidatePath
    Assert-True ((Get-SemanticJsonSha256 -Path $freshCandidatePath) -eq (Get-SemanticJsonSha256 -Path $candidatePath)) 'Candidate inbox is not reproducible.'
    $null = & (Join-Path $PSScriptRoot 'build-document-graph.ps1') -OutputPath $freshGraphPath
    Assert-True ((Get-SemanticJsonSha256 -Path $freshGraphPath) -eq (Get-SemanticJsonSha256 -Path $graphPath)) 'Canonical graph is not reproducible.'
} finally {
    Remove-Item -LiteralPath $freshCandidatePath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $freshGraphPath -Force -ErrorAction SilentlyContinue
}

Assert-True (@($graph.documents).Count -eq $manifest.source_count) 'Canonical document count differs from source manifest.'
Assert-True (@($graph.sections).Count -eq $manifest.heading_count) 'Canonical section count differs from source manifest.'
Assert-True (@($graph.sections | Where-Object review_disposition -eq 'unreviewed').Count -eq 0) 'Canonical graph contains unreviewed sections.'
Assert-True (@($graph.candidates).Count -eq $candidates.candidate_count) 'Canonical candidate count differs from candidate inbox.'
$validation = Test-CanonicalGraph -Graph $graph
Assert-True $validation.Valid ($validation.Errors -join "`n")

Assert-True (-not (Test-Path -LiteralPath (Join-Path $repositoryRoot 'CLAUDE.md') -PathType Leaf)) 'CLAUDE.md must not exist.'
Assert-True (-not (Test-Path -LiteralPath (Join-Path $repositoryRoot '.claude'))) '.claude must not exist in this agent-neutral workspace.'
Assert-True ($agents -match 'repository_intelligence_v1') 'AGENTS.md does not name the current persistence schema.'

$repositoryState = Get-RepositoryLifecycleState -RepositoryRoot $repositoryRoot
Assert-True $repositoryState.IsInsideWorkTree 'Document intelligence must be verified inside a Git worktree.'
Assert-True ($repositoryState.HeadCommit -match '^[0-9a-f]{40}$') 'Unable to identify the committed verification baseline.'

Write-Output 'Document-intelligence verification passed.'
Write-Output "Sources: $($manifest.source_count)"
Write-Output "Sections: $($manifest.heading_count)"
Write-Output "Claims: $(@($graph.claims).Count)"
Write-Output "Directives: $(@($graph.directives).Count)"
Write-Output "Relationships: $(@($graph.relationships).Count)"
Write-Output "Candidates: $(@($graph.candidates).Count)"
Write-Output "Remotes: $(@($repositoryState.Remotes).Count) [$(@($repositoryState.Remotes) -join ', ')]"
Write-Output "Commit baseline: $($repositoryState.HeadCommit)"
Write-Output 'Agent injection: absent'
