[CmdletBinding()]
param([switch]$SkipGitNexus)

$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSVersion.Major -ge 7) { $PSNativeCommandUseErrorActionPreference = $false }
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$intelligenceRoot = Join-Path $repositoryRoot 'docs\document-intelligence'
Import-Module -Force -Name (Join-Path $PSScriptRoot 'DocumentGraph.psm1')

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

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

$manifest = Get-Content -Raw -LiteralPath (Join-Path $intelligenceRoot 'SOURCE_MANIFEST.json') | ConvertFrom-Json
$candidatePath = Join-Path $intelligenceRoot 'RELATIONSHIP_CANDIDATES.json'
$candidates = Get-Content -Raw -LiteralPath $candidatePath | ConvertFrom-Json
$graphPath = Join-Path $intelligenceRoot 'DOCUMENT_GRAPH.json'
$graph = Get-Content -Raw -LiteralPath $graphPath | ConvertFrom-Json
$bridgeManifest = Get-Content -Raw -LiteralPath (Join-Path $intelligenceRoot 'gitnexus-bridge\BRIDGE_MANIFEST.json') | ConvertFrom-Json
$agents = Get-Content -Raw -LiteralPath (Join-Path $repositoryRoot 'AGENTS.md')
$config = Get-Content -Raw -LiteralPath (Join-Path $repositoryRoot '.gitnexusrc') | ConvertFrom-Json

Assert-True ($manifest.source_count -eq 12) 'Expected exactly 12 registered source documents.'
Assert-True ($manifest.heading_count -eq 1424) 'Expected exactly 1,424 registered headings.'
Assert-True ($manifest.schema_version -eq '2.0') 'Expected source-manifest schema 2.0.'
Assert-True ($candidates.source_manifest_sha256 -eq $manifest.manifest_sha256) 'Candidate inbox is stale relative to the source manifest.'
Assert-True ($graph.source_manifest_sha256 -eq $manifest.manifest_sha256) 'Canonical graph is stale relative to the source manifest.'
Assert-True ($bridgeManifest.source_manifest_sha256 -eq $manifest.manifest_sha256) 'Bridge is stale relative to the source manifest.'

$manifestSections = @($manifest.sources | ForEach-Object sections)
Assert-True ($manifestSections.Count -eq $manifest.heading_count) 'Manifest section count does not match heading count.'
$stableUids = @($manifestSections | ForEach-Object stable_uid)
Assert-True (@($stableUids | Sort-Object -Unique).Count -eq $stableUids.Count) 'Stable section UIDs are not unique.'

foreach ($source in $manifest.sources) {
    $sourcePath = Join-Path $repositoryRoot ($source.path -replace '/', '\')
    Assert-True (Test-Path -LiteralPath $sourcePath -PathType Leaf) "Missing registered source: $($source.path)"
    Assert-True ((Get-Sha256File -Path $sourcePath) -eq $source.sha256) "Source hash drift: $($source.path)"
}

$verificationToken = [guid]::NewGuid().ToString('N')
$freshCandidatePath = Join-Path ([System.IO.Path]::GetTempPath()) "vsb-candidates-$verificationToken.json"
$freshGraphPath = Join-Path ([System.IO.Path]::GetTempPath()) "vsb-graph-$verificationToken.json"
try {
    $null = & (Join-Path $PSScriptRoot 'extract-relationship-candidates.ps1') -OutputPath $freshCandidatePath
    Assert-True ((Get-Sha256File -Path $freshCandidatePath) -eq (Get-Sha256File -Path $candidatePath)) 'Candidate inbox is not reproducible from the current manifest and extractor.'

    $null = & (Join-Path $PSScriptRoot 'build-document-graph.ps1') -OutputPath $freshGraphPath
    Assert-True ((Get-Sha256File -Path $freshGraphPath) -eq (Get-Sha256File -Path $graphPath)) 'Canonical graph is not reproducible from the current manifest, candidates, and graph builder.'
} finally {
    Remove-Item -LiteralPath $freshCandidatePath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $freshGraphPath -Force -ErrorAction SilentlyContinue
}

Assert-True (@($graph.documents).Count -eq $manifest.source_count) 'Canonical document count differs from source manifest.'
Assert-True (@($graph.sections).Count -eq $manifest.heading_count) 'Canonical section count differs from source manifest.'
Assert-True (@($graph.sections | Where-Object review_disposition -eq 'unreviewed').Count -eq 0) 'Canonical graph contains unreviewed sections.'
Assert-True (@($graph.sections | Where-Object { $_.review_disposition -notin @('claims-extracted','no-extracted-claim','unresolved') }).Count -eq 0) 'Canonical graph contains invalid section dispositions.'
Assert-True (@($graph.candidates).Count -eq $candidates.candidate_count) 'Canonical candidate count differs from candidate inbox.'
Assert-True (@($graph.candidates | Where-Object { $_.disposition -notin @('accepted','rejected','duplicate','unresolved') }).Count -eq 0) 'Canonical graph contains candidates without a disposition.'

$validation = Test-CanonicalGraph -Graph $graph
Assert-True $validation.Valid ($validation.Errors -join "`n")

$expectedNodeCount = @($graph.sections).Count + @($graph.claims).Count + @($graph.directives).Count
Assert-True ($bridgeManifest.expected.section_symbol_count -eq @($graph.sections).Count) 'Bridge section-symbol count differs from graph.'
Assert-True ($bridgeManifest.expected.claim_symbol_count -eq @($graph.claims).Count) 'Bridge claim-symbol count differs from graph.'
Assert-True ($bridgeManifest.expected.directive_symbol_count -eq @($graph.directives).Count) 'Bridge directive-symbol count differs from graph.'
Assert-True ($bridgeManifest.expected.relation_symbol_count -eq @($graph.relationships).Count) 'Bridge relation-symbol count differs from graph.'
Assert-True ($bridgeManifest.expected.endpoint_call_count -eq (2 * @($graph.relationships).Count)) 'Bridge expected endpoint-call count is invalid.'
Assert-True ($bridgeManifest.observed_source.endpoint_call_count -eq $bridgeManifest.expected.endpoint_call_count) 'Generated bridge source does not contain two endpoint calls per relationship.'

$runtimeResult = (& node (Join-Path $PSScriptRoot 'verify-bridge-runtime.mjs')) | ConvertFrom-Json
Assert-True ($LASTEXITCODE -eq 0) 'Bridge runtime verification failed.'
Assert-True ($runtimeResult.status -eq 'pass') 'Bridge runtime did not report pass.'
Assert-True ($runtimeResult.nodeExports -eq $expectedNodeCount) 'Bridge runtime node export count differs from graph.'
Assert-True ($runtimeResult.relationExports -eq @($graph.relationships).Count) 'Bridge runtime relationship export count differs from graph.'

Assert-True ($config.analyze.indexOnly -eq $true) 'GitNexus index-only mode is not enforced.'
Assert-True (-not (Test-Path -LiteralPath (Join-Path $repositoryRoot 'CLAUDE.md') -PathType Leaf)) 'CLAUDE.md must not exist.'
Assert-True (-not (Test-Path -LiteralPath (Join-Path $repositoryRoot '.claude'))) '.claude must not exist in this agent-neutral workspace.'
Assert-True ($agents -notmatch 'gitnexus:start') 'AGENTS.md contains a generated GitNexus block.'

$gitSafeDirectory = "safe.directory=$repositoryRoot"
$remotes = @(git -c $gitSafeDirectory -C $repositoryRoot remote)
Assert-True ($LASTEXITCODE -eq 0) 'Unable to inspect Git remotes.'
Assert-True ($remotes.Count -eq 0) 'This local-only repository must not have a remote.'
$headCommit = git -c $gitSafeDirectory -C $repositoryRoot rev-list --max-count=1 --all
Assert-True ([string]::IsNullOrWhiteSpace($headCommit)) 'A commit exists even though the baseline commit is deferred.'

if (-not $SkipGitNexus) {
    $reconciliationPath = Join-Path $intelligenceRoot 'GITNEXUS_RECONCILIATION.json'
    Assert-True (Test-Path -LiteralPath $reconciliationPath -PathType Leaf) 'GitNexus reconciliation evidence is missing.'
    $reconciliation = Get-Content -Raw -LiteralPath $reconciliationPath | ConvertFrom-Json
    Assert-True ($reconciliation.source_manifest_sha256 -eq $manifest.manifest_sha256) 'GitNexus reconciliation is stale relative to source manifest.'
    Assert-True ($reconciliation.document_graph_sha256 -eq (Get-Sha256File -Path $graphPath)) 'GitNexus reconciliation is stale relative to canonical graph.'
    Assert-True ($reconciliation.gitnexus_version -eq '1.6.9') 'GitNexus reconciliation used an unapproved version.'
    Assert-True ($reconciliation.status -eq 'pass') 'GitNexus reconciliation did not pass.'
    Assert-True $reconciliation.exact_node_set_match 'GitNexus node-symbol set differs from bridge manifest.'
    Assert-True $reconciliation.exact_relation_set_match 'GitNexus relation-symbol set differs from bridge manifest.'
    Assert-True ($reconciliation.call_edges -eq $bridgeManifest.expected.endpoint_call_count) 'GitNexus CALLS count differs from bridge expectation.'
    Assert-True ($reconciliation.import_edges -gt 0) 'GitNexus has no bridge IMPORTS edges.'
}

Write-Output 'Document-intelligence verification passed.'
Write-Output "Sources: $($manifest.source_count)"
Write-Output "Sections: $($manifest.heading_count)"
Write-Output "Claims: $(@($graph.claims).Count)"
Write-Output "Directives: $(@($graph.directives).Count)"
Write-Output "Relationships: $(@($graph.relationships).Count)"
Write-Output "Candidates: $(@($graph.candidates).Count)"
Write-Output "Bridge node exports: $($runtimeResult.nodeExports)"
Write-Output "Bridge relation exports: $($runtimeResult.relationExports)"
Write-Output 'Remote: none'
Write-Output 'Commit baseline: deferred'
Write-Output 'Agent injection: absent'
Write-Output "GitNexus reconciliation: $(if ($SkipGitNexus) { 'skipped' } else { 'pass' })"
