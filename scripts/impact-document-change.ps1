[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$SectionUid,
    [switch]$Json
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$graphPath = Join-Path $repositoryRoot 'docs\document-intelligence\DOCUMENT_GRAPH.json'
Import-Module -Force -Name (Join-Path $PSScriptRoot 'DocumentGraph.psm1')
$graph = Get-Content -Raw -LiteralPath $graphPath | ConvertFrom-Json
$impact = Get-GraphImpact -Graph $graph -SectionUid $SectionUid

if ($Json) {
    $impact | ConvertTo-Json -Depth 10
    exit 0
}

Write-Output "Section UID: $($impact.SectionUid)"
Write-Output "Affected documents: $($impact.AffectedDocuments -join ', ')"
Write-Output "Inbound relationships: $($impact.Inbound.Count)"
Write-Output "Outbound relationships: $($impact.Outbound.Count)"
Write-Output "Conflicts: $($impact.Conflicts.Count)"
Write-Output 'Required review targets:'
$impact.RequiredReviewTargets | ForEach-Object { Write-Output "- $_" }
