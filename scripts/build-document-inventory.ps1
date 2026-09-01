[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$docsRoot = Join-Path $repositoryRoot 'docs'
$outputRoot = Join-Path $docsRoot 'document-intelligence'
Import-Module -Force -Name (Join-Path $PSScriptRoot 'DocumentGraph.psm1')

$sources = @(
    @{ Id = 'UI'; File = 'APPROVED_UI_COMPONENT_CATALOGUE.md'; Title = 'Approved UI Component Catalogue'; Authority = 'visual-reference-catalogue' },
    @{ Id = 'D01'; File = 'Vetted-SaaS-Blueprint-01-Market-Research-and-Opportunity-Plan-v1.md'; Title = 'Market Research and Opportunity Plan'; Authority = 'working-validation-authority' },
    @{ Id = 'D02'; File = 'Vetted-SaaS-Blueprint-02-Product-Roadmap-v1.md'; Title = 'Product Roadmap'; Authority = 'working-roadmap-authority' },
    @{ Id = 'D03'; File = 'Vetted-SaaS-Blueprint-03-AI-First-System-Architecture-and-Automation-Blueprint-v1.md'; Title = 'AI-First Architecture and Automation Blueprint'; Authority = 'working-architecture-authority' },
    @{ Id = 'D04'; File = 'Vetted-SaaS-Blueprint-04-Design-System-and-Experience-Standards-v1.md'; Title = 'Design System and Experience Standards'; Authority = 'working-design-authority' },
    @{ Id = 'D05'; File = 'Vetted-SaaS-Blueprint-05-Master-PRD-v1.md'; Title = 'Master Product Requirements Document'; Authority = 'product-requirements-authority' },
    @{ Id = 'D06'; File = 'Vetted-SaaS-Blueprint-06-Agent-Technology-and-Implementation-Standards.md'; Title = 'Agent Technology and Implementation Standards'; Authority = 'working-implementation-authority' },
    @{ Id = 'D07'; File = 'Vetted-SaaS-Blueprint-07-Content-Intelligence-and-Editorial-Operations.md'; Title = 'Content Intelligence and Editorial Operations'; Authority = 'working-editorial-authority' },
    @{ Id = 'D08'; File = 'Vetted-SaaS-Blueprint-08-Knowledge-Acquisition-and-Research-Operations.md'; Title = 'Knowledge Acquisition and Research Operations'; Authority = 'working-research-authority' },
    @{ Id = 'D09'; File = 'Vetted-SaaS-Blueprint-09-Growth-and-Distribution-Strategy.md'; Title = 'Growth and Distribution Strategy'; Authority = 'working-growth-authority' },
    @{ Id = 'D10'; File = 'Vetted-SaaS-Blueprint-10-QA-and-Testing-Plan.md'; Title = 'QA and Testing Plan'; Authority = 'qa-operating-authority' },
    @{ Id = 'D11'; File = 'Vetted-SaaS-Blueprint-11-ScrollCraft-Narrative-Motion-Strategy-and-Fork-Tailoring-Plan.md'; Title = 'ScrollCraft Narrative Motion Strategy and Fork Tailoring Plan'; Authority = 'draft-proposal-no-implementation-authority' }
)

function Get-Sha256File {
    param([string]$Path)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $hash = $algorithm.ComputeHash($stream)
        return (($hash | ForEach-Object { $_.ToString('x2') }) -join '')
    } finally {
        $stream.Dispose()
        $algorithm.Dispose()
    }
}

function Get-Sha256Text {
    param([string]$Text)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hash = $algorithm.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Text))
        return (($hash | ForEach-Object { $_.ToString('x2') }) -join '')
    } finally {
        $algorithm.Dispose()
    }
}

function Escape-MarkdownCell {
    param([string]$Value)
    return ($Value -replace '\|', '\|') -replace "`r?`n", ' '
}

$manifestSources = [System.Collections.Generic.List[object]]::new()
$inventoryRows = [System.Collections.Generic.List[string]]::new()
$inventoryRows.Add('---')
$inventoryRows.Add('title: "Vetted SaaS B Source and Heading Inventory"')
$inventoryRows.Add('tags: [document-intelligence, inventory, traceability]')
$inventoryRows.Add('status: active')
$inventoryRows.Add('created: 2026-08-29')
$inventoryRows.Add('---')
$inventoryRows.Add('')
$inventoryRows.Add('# Vetted SaaS B Source and Heading Inventory')
$inventoryRows.Add('')
$inventoryRows.Add('Generated mechanically from the registered sources. Stable UIDs derive from document ID plus complete heading ancestry and duplicate-sibling occurrence; display IDs remain ordinal navigation labels only.')
$inventoryRows.Add('')
$inventoryRows.Add('| Display ID | Stable UID | Source | Level | Complete heading path | Lines | Content SHA-256 |')
$inventoryRows.Add('|---|---|---|---:|---|---:|---|')

$totalHeadings = 0
foreach ($source in $sources) {
    $path = Join-Path $docsRoot $source.File
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Registered source is missing: $($source.File)" }
    $lines = [System.IO.File]::ReadAllLines($path)
    $sections = @(Get-DocumentSections -SourceId $source.Id -Lines $lines)
    $manifestSections = [System.Collections.Generic.List[object]]::new()
    foreach ($section in $sections) {
        $headingPath = Escape-MarkdownCell (($section.HeadingPath) -join ' > ')
        $sourcePath = "docs/$($source.File)"
        $inventoryRows.Add("| $($section.DisplayId) | ``$($section.StableUid)`` | ``$sourcePath`` | $($section.Level) | $headingPath | $($section.StartLine)-$($section.EndLine) | ``$($section.ContentSha256)`` |")
        $manifestSections.Add([ordered]@{
            display_id = $section.DisplayId
            stable_uid = $section.StableUid
            level = $section.Level
            heading = $section.Heading
            heading_path = @($section.HeadingPath)
            line_start = $section.StartLine
            line_end = $section.EndLine
            content_sha256 = $section.ContentSha256
            exact_text = $section.ExactText
        })
    }
    $manifestSources.Add([ordered]@{
        source_id = $source.Id
        path = "docs/$($source.File)"
        title = $source.Title
        authority_status = $source.Authority
        line_count = $lines.Count
        heading_count = $sections.Count
        sha256 = Get-Sha256File -Path $path
        sections = @($manifestSections)
    })
    $totalHeadings += $sections.Count
}

$inventoryRows.Insert(9, "Generated coverage: **$($sources.Count) source documents** and **$totalHeadings headings**.")
$inventoryRows.Insert(10, '')
$manifestCore = [ordered]@{
    schema_version = '2.0'
    generated_on = '2026-08-29'
    source_count = $sources.Count
    heading_count = $totalHeadings
    sources = @($manifestSources)
}
$coreJson = $manifestCore | ConvertTo-Json -Depth 12 -Compress
$manifest = [ordered]@{
    schema_version = $manifestCore.schema_version
    generated_on = $manifestCore.generated_on
    manifest_sha256 = Get-Sha256Text -Text $coreJson
    source_count = $manifestCore.source_count
    heading_count = $manifestCore.heading_count
    sources = $manifestCore.sources
}

if (-not (Test-Path -LiteralPath $outputRoot)) { [void](New-Item -ItemType Directory -Path $outputRoot) }
[System.IO.File]::WriteAllLines((Join-Path $outputRoot 'DOCUMENT_INVENTORY.md'), $inventoryRows, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText((Join-Path $outputRoot 'SOURCE_MANIFEST.json'), (($manifest | ConvertTo-Json -Depth 12) + "`n"), [System.Text.UTF8Encoding]::new($false))

Write-Output "Sources: $($sources.Count)"
Write-Output "Headings: $totalHeadings"
Write-Output "Manifest SHA-256: $($manifest.manifest_sha256)"
