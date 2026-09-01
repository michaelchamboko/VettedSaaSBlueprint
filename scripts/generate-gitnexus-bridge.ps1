[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$intelligenceRoot = Join-Path $repositoryRoot 'docs\document-intelligence'
$graphPath = Join-Path $intelligenceRoot 'DOCUMENT_GRAPH.json'
$bridgeRoot = Join-Path $intelligenceRoot 'gitnexus-bridge'
Import-Module -Force -Name (Join-Path $PSScriptRoot 'DocumentGraph.psm1')

$graph = Get-Content -Raw -LiteralPath $graphPath | ConvertFrom-Json
$validation = Test-CanonicalGraph -Graph $graph
if (-not $validation.Valid) { throw ($validation.Errors -join "`n") }

$resolvedBridge = [System.IO.Path]::GetFullPath($bridgeRoot)
$resolvedIntelligence = [System.IO.Path]::GetFullPath($intelligenceRoot) + [System.IO.Path]::DirectorySeparatorChar
if (-not $resolvedBridge.StartsWith($resolvedIntelligence, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to replace bridge outside document-intelligence: $resolvedBridge"
}
if (Test-Path -LiteralPath $resolvedBridge) { Remove-Item -LiteralPath $resolvedBridge -Recurse -Force }
New-GitNexusBridge -Graph $graph -OutputRoot $resolvedBridge

function ConvertTo-JavaScriptIdentifier {
    param([string]$Value)
    $identifier = [regex]::Replace($Value, '[^A-Za-z0-9_]', '_')
    if ($identifier -match '^[0-9]') { $identifier = "_$identifier" }
    return $identifier
}

$sectionSymbols = @($graph.sections | ForEach-Object { ConvertTo-JavaScriptIdentifier "section_$($_.stable_uid)" } | Sort-Object)
$claimSymbols = @($graph.claims | ForEach-Object { ConvertTo-JavaScriptIdentifier "claim_$($_.id)" } | Sort-Object)
$directiveSymbols = @($graph.directives | ForEach-Object { ConvertTo-JavaScriptIdentifier "directive_$($_.id)" } | Sort-Object)
$relationSymbols = @($graph.relationships | ForEach-Object { ConvertTo-JavaScriptIdentifier "relation_$($_.id)" } | Sort-Object)
$bridgeFiles = @(Get-ChildItem -LiteralPath $resolvedBridge -File -Recurse -Filter '*.mjs' | Sort-Object FullName)
$importCount = 0
$endpointCallCount = 0
foreach ($file in $bridgeFiles) {
    $content = Get-Content -Raw -LiteralPath $file.FullName
    $importCount += [regex]::Matches($content, '(?m)^import \{').Count
    if ($file.Directory.Name -eq 'relationships') {
        $endpointCallCount += [regex]::Matches($content, '(?:section|claim|directive)_[A-Za-z0-9_]+\(\)').Count
    }
}
$bridgeManifest = [ordered]@{
    schema_version = '1.0'
    source_manifest_sha256 = $graph.source_manifest_sha256
    files = @($bridgeFiles | ForEach-Object { $_.FullName.Substring($repositoryRoot.Length + 1).Replace('\','/') })
    section_symbols = $sectionSymbols
    claim_symbols = $claimSymbols
    directive_symbols = $directiveSymbols
    relation_symbols = $relationSymbols
    expected = [ordered]@{
        section_symbol_count = $sectionSymbols.Count
        claim_symbol_count = $claimSymbols.Count
        directive_symbol_count = $directiveSymbols.Count
        relation_symbol_count = $relationSymbols.Count
        endpoint_call_count = 2 * $relationSymbols.Count
        import_statement_count = $importCount
    }
    observed_source = [ordered]@{
        endpoint_call_count = $endpointCallCount
    }
}
[System.IO.File]::WriteAllText((Join-Path $resolvedBridge 'BRIDGE_MANIFEST.json'), (($bridgeManifest | ConvertTo-Json -Depth 8) + "`n"), [System.Text.UTF8Encoding]::new($false))
if ($endpointCallCount -ne (2 * $relationSymbols.Count)) { throw "Bridge source call mismatch: expected $((2 * $relationSymbols.Count)), observed $endpointCallCount" }

$mapLines = [System.Collections.Generic.List[string]]::new()
$mapLines.Add('---')
$mapLines.Add('title: "Vetted SaaS B Semantic Relationship Map"')
$mapLines.Add('tags: [document-intelligence, relationships, gitnexus, generated]')
$mapLines.Add('status: active')
$mapLines.Add('created: 2026-08-29')
$mapLines.Add('---')
$mapLines.Add('')
$mapLines.Add('# Vetted SaaS B Semantic Relationship Map')
$mapLines.Add('')
$mapLines.Add('> GENERATED — DO NOT EDIT. Canonical source: `DOCUMENT_GRAPH.json`. GitNexus is structural corroboration, not semantic authority.')
$mapLines.Add('')
$mapLines.Add("- Documents: $(@($graph.documents).Count)")
$mapLines.Add("- Sections: $(@($graph.sections).Count)")
$mapLines.Add("- Claims: $(@($graph.claims).Count)")
$mapLines.Add("- Directives: $(@($graph.directives).Count)")
$mapLines.Add("- Relationships: $(@($graph.relationships).Count)")
$mapLines.Add("- Unresolved relationships: $(@($graph.relationships | Where-Object resolution_state -eq 'unresolved').Count)")
$mapLines.Add('')
$mapLines.Add('| Relationship ID | Type | Classification | State | From | To | Affected documents | Rationale |')
$mapLines.Add('|---|---|---|---|---|---|---|---|')
foreach ($edge in @($graph.relationships | Sort-Object id)) {
    $rationale = ([string]$edge.rationale -replace '\|','\|' -replace "`r?`n",' ')
    $mapLines.Add("| ``$($edge.id)`` | $($edge.type) | $($edge.classification) | $($edge.resolution_state) | ``$($edge.from)`` | ``$($edge.to)`` | $(@($edge.affected_documents) -join ', ') | $rationale |")
}
[System.IO.File]::WriteAllLines((Join-Path $intelligenceRoot 'RELATIONSHIP_MAP.md'), $mapLines, [System.Text.UTF8Encoding]::new($false))

$findingLines = [System.Collections.Generic.List[string]]::new()
$findingLines.Add('---')
$findingLines.Add('title: "Vetted SaaS B Document Relationship Findings"')
$findingLines.Add('tags: [document-intelligence, findings, conflicts, generated]')
$findingLines.Add('status: active')
$findingLines.Add('created: 2026-08-29')
$findingLines.Add('---')
$findingLines.Add('')
$findingLines.Add('# Vetted SaaS B Document Relationship Findings')
$findingLines.Add('')
$findingLines.Add('> GENERATED — DO NOT EDIT. Canonical source: `DOCUMENT_GRAPH.json`. Open findings remain inputs to harmonisation, not hidden assumptions.')
$findingLines.Add('')
$findingLines.Add('## Findings')
$findingLines.Add('')
$findingLines.Add('| ID | Classification | Status | Summary |')
$findingLines.Add('|---|---|---|---|')
foreach ($finding in @($graph.findings)) {
    $summary = ([string]$finding.summary -replace '\|','\|')
    $findingLines.Add("| $($finding.id) | $($finding.classification) | $($finding.status) | $summary |")
}
$findingLines.Add('')
$findingLines.Add('## Unresolved candidates')
$findingLines.Add('')
$unresolved = @($graph.candidates | Where-Object disposition -eq 'unresolved' | Sort-Object candidate_id)
$findingLines.Add("Count: **$($unresolved.Count)**")
$findingLines.Add('')
$findingLines.Add('| Candidate | Source | Line | Extractor | Raw target | Resolution note |')
$findingLines.Add('|---|---|---:|---|---|---|')
foreach ($candidate in $unresolved) {
    $findingLines.Add("| ``$($candidate.candidate_id)`` | ``$($candidate.source_section_uid)`` | $($candidate.line) | $($candidate.extractor) | $(([string]$candidate.raw_target) -replace '\|','\|') | $($candidate.resolution_note) |")
}
[System.IO.File]::WriteAllLines((Join-Path $intelligenceRoot 'FINDINGS_AND_CONFLICTS.md'), $findingLines, [System.Text.UTF8Encoding]::new($false))

Write-Output "Bridge files: $($bridgeFiles.Count)"
Write-Output "Section symbols: $($sectionSymbols.Count)"
Write-Output "Claim symbols: $($claimSymbols.Count)"
Write-Output "Directive symbols: $($directiveSymbols.Count)"
Write-Output "Relation symbols: $($relationSymbols.Count)"
Write-Output "Endpoint calls: $endpointCallCount"
