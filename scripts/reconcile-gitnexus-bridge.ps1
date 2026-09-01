[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$intelligenceRoot = Join-Path $repositoryRoot 'docs\document-intelligence'
$bridgeManifest = Get-Content -Raw -LiteralPath (Join-Path $intelligenceRoot 'gitnexus-bridge\BRIDGE_MANIFEST.json') | ConvertFrom-Json
$graphPath = Join-Path $intelligenceRoot 'DOCUMENT_GRAPH.json'
$expectedVersion = '1.6.9'

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

function Invoke-GitNexusCypher {
    param([string]$Query, [int]$Limit = 5000)
    $output = (& npx --yes "gitnexus@$expectedVersion" cypher -r $repositoryRoot -l $Limit $Query) -join "`n"
    if ($LASTEXITCODE -ne 0) { throw "GitNexus Cypher failed: $Query" }
    return $output | ConvertFrom-Json
}

function Get-MarkdownValues {
    param([string]$Markdown)
    $values = [System.Collections.Generic.List[string]]::new()
    foreach ($line in ($Markdown -split "`n")) {
        if ($line -notmatch '^\|\s*(.+?)\s*\|$') { continue }
        $value = $Matches[1].Trim()
        if ($value -eq 'name' -or $value -eq 'count' -or $value -match '^-+$') { continue }
        $values.Add($value)
    }
    return @($values)
}

$version = (& npx --yes "gitnexus@$expectedVersion" --version).Trim()
if ($LASTEXITCODE -ne 0 -or $version -ne $expectedVersion) { throw "Expected GitNexus $expectedVersion but received [$version]." }

$nodeQuery = "MATCH (n) WHERE n.name STARTS WITH 'section_' OR n.name STARTS WITH 'claim_' OR n.name STARTS WITH 'directive_' RETURN n.name AS name ORDER BY name"
$relationQuery = "MATCH (n) WHERE n.name STARTS WITH 'relation_' RETURN n.name AS name ORDER BY name"
$callQuery = "MATCH (a)-[r:CodeRelation {type: 'CALLS'}]->(b) WHERE a.name STARTS WITH 'relation_' AND (b.name STARTS WITH 'section_' OR b.name STARTS WITH 'claim_' OR b.name STARTS WITH 'directive_') RETURN count(r) AS count"
$importQuery = "MATCH ()-[r:CodeRelation {type: 'IMPORTS'}]->() RETURN count(r) AS count"

$actualNodes = @(Get-MarkdownValues (Invoke-GitNexusCypher $nodeQuery).markdown | Sort-Object)
$actualRelations = @(Get-MarkdownValues (Invoke-GitNexusCypher $relationQuery).markdown | Sort-Object)
$callEdges = [int](Get-MarkdownValues (Invoke-GitNexusCypher $callQuery 10).markdown | Select-Object -First 1)
$importEdges = [int](Get-MarkdownValues (Invoke-GitNexusCypher $importQuery 10).markdown | Select-Object -First 1)
$expectedNodes = @($bridgeManifest.section_symbols + $bridgeManifest.claim_symbols + $bridgeManifest.directive_symbols | Sort-Object)
$expectedRelations = @($bridgeManifest.relation_symbols | Sort-Object)
$nodeSetMatch = (($expectedNodes -join "`n") -ceq ($actualNodes -join "`n"))
$relationSetMatch = (($expectedRelations -join "`n") -ceq ($actualRelations -join "`n"))
$status = if ($nodeSetMatch -and $relationSetMatch -and $callEdges -eq $bridgeManifest.expected.endpoint_call_count -and $importEdges -gt 0) { 'pass' } else { 'fail' }

$evidence = [ordered]@{
    schema_version = '1.0'
    source_manifest_sha256 = $bridgeManifest.source_manifest_sha256
    document_graph_sha256 = Get-Sha256File -Path $graphPath
    gitnexus_version = $version
    expected_node_symbols = $expectedNodes.Count
    observed_node_symbols = $actualNodes.Count
    expected_relation_symbols = $expectedRelations.Count
    observed_relation_symbols = $actualRelations.Count
    exact_node_set_match = $nodeSetMatch
    exact_relation_set_match = $relationSetMatch
    call_edges = $callEdges
    import_edges = $importEdges
    status = $status
}
[System.IO.File]::WriteAllText((Join-Path $intelligenceRoot 'GITNEXUS_RECONCILIATION.json'), (($evidence | ConvertTo-Json -Depth 5) + "`n"), [System.Text.UTF8Encoding]::new($false))
if ($status -ne 'pass') { throw ($evidence | ConvertTo-Json -Depth 5) }

Write-Output "Exact node set: $nodeSetMatch ($($actualNodes.Count))"
Write-Output "Exact relation set: $relationSetMatch ($($actualRelations.Count))"
Write-Output "CALLS: $callEdges"
Write-Output "IMPORTS: $importEdges"
Write-Output "Status: $status"
