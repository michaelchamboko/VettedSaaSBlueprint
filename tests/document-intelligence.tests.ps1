[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$modulePath = Join-Path $repositoryRoot 'scripts\DocumentGraph.psm1'

function Assert-Equal {
    param($Actual, $Expected, [string]$Message)
    if ($Actual -ne $Expected) {
        throw "$Message Expected=[$Expected] Actual=[$Actual]"
    }
}

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

Import-Module -Force -Name $modulePath

$refreshScript = Get-Content -Raw -LiteralPath (Join-Path $repositoryRoot 'scripts\refresh-gitnexus.ps1')
Assert-True ($refreshScript -match "expectedVersion\s*=\s*'1\.6\.9'") 'The refresh script does not pin GitNexus 1.6.9.'
Assert-True ($refreshScript -match 'walCheckpointThreshold\s*=\s*67108864') 'The refresh script does not retain the verified Windows WAL checkpoint threshold.'
Assert-True (($refreshScript -match '--index-only') -and ($refreshScript -match '--wal-checkpoint-threshold\s+\$walCheckpointThreshold')) 'The refresh script does not combine index-only mode with the configured WAL threshold.'
$verifierScript = Get-Content -Raw -LiteralPath (Join-Path $repositoryRoot 'scripts\verify-document-intelligence.ps1')
Assert-True ($verifierScript.Contains('Test-Path -LiteralPath (Join-Path $repositoryRoot ''.claude'')')) 'The verifier does not fail closed on a generated .claude directory.'

$sourceManifest = Get-Content -Raw -LiteralPath (Join-Path $repositoryRoot 'docs\document-intelligence\SOURCE_MANIFEST.json') | ConvertFrom-Json
$canonicalGraph = Get-Content -Raw -LiteralPath (Join-Path $repositoryRoot 'docs\document-intelligence\DOCUMENT_GRAPH.json') | ConvertFrom-Json
$domainEvidence = Get-Content -Raw -LiteralPath (Join-Path $repositoryRoot 'docs\document-intelligence\DOMAIN_QUERY_EVIDENCE.md')
$marketingSkillRows = @([regex]::Matches($domainEvidence, '(?m)^\| `(?<name>[a-z0-9-]+)` \|') | ForEach-Object { $_.Groups['name'].Value })
Assert-Equal $marketingSkillRows.Count 45 'The marketing-skill disposition table must account for all 45 reviewed skills.'
Assert-Equal @($marketingSkillRows | Sort-Object -Unique).Count 45 'The marketing-skill disposition table contains a duplicate skill.'
$knownStableUids = @($sourceManifest.sources.sections | ForEach-Object stable_uid)
$evidenceStableUids = @([regex]::Matches($domainEvidence, 'D\d{2}-S-[a-f0-9]{12}') | ForEach-Object Value | Sort-Object -Unique)
$unknownEvidenceUids = @($evidenceStableUids | Where-Object { $knownStableUids -notcontains $_ })
Assert-Equal $unknownEvidenceUids.Count 0 "Marketing-skill evidence cites unknown stable UIDs: $($unknownEvidenceUids -join ', ')"

$hormoziRows = @([regex]::Matches($domainEvidence, '(?m)^\| `(?<output>[A-Z_]+\.md)` \| `(?<skill>[a-z0-9-]+)` \|') | ForEach-Object {
    [pscustomobject]@{
        Output = $_.Groups['output'].Value
        Skill = $_.Groups['skill'].Value
    }
})
$expectedHormoziOutputs = @(
    'BONUS_STACK.md',
    'HOOKS.md',
    'LANDING_PAGE.md',
    'MARKET_RESEARCH.md',
    'OBJECTIONS.md',
    'OFFER.md',
    'OFFER_ANGLES.md',
    'OFFER_AUDIT.md',
    'PITCH.md',
    'VALUE_PERCEPTION.md'
)
$expectedHormoziPairs = @(
    'BONUS_STACK.md=bonus-stack',
    'HOOKS.md=hormozi-hooks',
    'LANDING_PAGE.md=landing-page-copy',
    'MARKET_RESEARCH.md=market-research',
    'OBJECTIONS.md=objection-destroyer',
    'OFFER.md=hormozi-offer',
    'OFFER_ANGLES.md=offer-angles',
    'OFFER_AUDIT.md=audit-offer',
    'PITCH.md=hormozi-pitch',
    'VALUE_PERCEPTION.md=value-perception'
)
Assert-Equal $hormoziRows.Count 10 'The affiliate-safe Hormozi mapping must account for the ten approved outputs.'
Assert-Equal @($hormoziRows.Output | Sort-Object -Unique).Count 10 'The affiliate-safe Hormozi mapping contains a duplicate output.'
Assert-Equal (($hormoziRows.Output | Sort-Object) -join ',') (($expectedHormoziOutputs | Sort-Object) -join ',') 'The affiliate-safe Hormozi mapping does not match the approved output set.'
Assert-Equal (($hormoziRows | ForEach-Object { "$($_.Output)=$($_.Skill)" } | Sort-Object) -join ',') (($expectedHormoziPairs | Sort-Object) -join ',') 'The approved Hormozi output-to-skill mapping has drifted.'
Assert-True (-not $domainEvidence.Contains('| `PRICING.md` |')) 'The Hormozi mapping must not introduce a pricing output.'
Assert-True (-not ($hormoziRows.Skill -contains 'pricing-strategy')) 'The Hormozi mapping must not invoke pricing-strategy.'
Assert-True ($domainEvidence.Contains('25ec2b0789ae8c760b45f577024782ff399983a6')) 'The Hormozi review is not pinned to the approved commit.'
Assert-True ($domainEvidence.Contains('Monetary value anchoring')) 'The affiliate adapter no longer excludes monetary value anchoring.'
Assert-True ($domainEvidence.Contains("official pricing page first, with current date and region")) 'The factual vendor-price exception is missing its official-source, date, or region boundary.'

$affiliateDirective = @($canonicalGraph.directives | Where-Object id -eq 'UD-008')
Assert-Equal $affiliateDirective.Count 1 'The canonical graph must contain exactly one affiliate-copy skill directive.'
Assert-Equal $affiliateDirective[0].authority_domain 'affiliate-copy-skill-integration' 'UD-008 has the wrong authority domain.'
Assert-Equal $affiliateDirective[0].resolution_state 'confirmed' 'UD-008 is not confirmed.'
$directiveSafetyText = [string]$affiliateDirective[0].exact_text
foreach ($requiredSafetyTerm in @('pricing strategy', 'seller-controlled price', 'guarantee', 'scarcity', 'urgency', 'bonus claims', 'evidence-bound vendor pricing facts')) {
    Assert-True ($directiveSafetyText.Contains($requiredSafetyTerm)) "UD-008 no longer contains the required safety term: $requiredSafetyTerm"
}
$expectedAffiliateRequirements = @('D01-H042', 'D04-H015', 'D05-H043', 'D05-H127', 'D05-H128', 'D06-H060', 'D07-H100', 'D08-H082', 'D09-H017', 'D10-H022')
Assert-Equal (($affiliateDirective[0].requirements_checked | Sort-Object) -join ',') (($expectedAffiliateRequirements | Sort-Object) -join ',') 'UD-008 does not bind the approved local requirements.'
$affiliateEdges = @($canonicalGraph.relationships | Where-Object from -eq 'UD-008')
Assert-Equal $affiliateEdges.Count 10 'UD-008 must constrain all ten approved local requirements.'
Assert-Equal @($affiliateEdges | Where-Object { $_.type -ne 'constrains' -or $_.classification -ne 'user-directive' -or $_.resolution_state -ne 'confirmed' }).Count 0 'UD-008 contains an invalid relationship edge.'
$expectedAffiliateTargets = @($expectedAffiliateRequirements | ForEach-Object {
    $displayId = $_
    $section = $sourceManifest.sources.sections | Where-Object display_id -eq $displayId
    Assert-Equal @($section).Count 1 "Affiliate requirement $displayId does not resolve to one source section."
    "C-$($section.stable_uid)"
})
Assert-Equal (($affiliateEdges.to | Sort-Object) -join ',') (($expectedAffiliateTargets | Sort-Object) -join ',') 'UD-008 relationship targets do not match its requirements.'

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("vsb-document-graph-tests-" + [guid]::NewGuid().ToString('N'))
[void](New-Item -ItemType Directory -Path $tempRoot)

try {
    $original = @(
        '# Root',
        '',
        '## Alpha',
        'Alpha content.',
        '',
        '## Beta',
        'Beta content.'
    )
    $inserted = @(
        '# Root',
        '',
        '## Inserted',
        'New content.',
        '',
        '## Alpha',
        'Alpha content.',
        '',
        '## Beta',
        'Beta content.'
    )
    $changed = @(
        '# Root',
        '',
        '## Alpha',
        'Changed alpha content.',
        '',
        '## Beta',
        'Beta content.'
    )

    $sectionsA = @(Get-DocumentSections -SourceId 'D99' -Lines $original)
    $sectionsB = @(Get-DocumentSections -SourceId 'D99' -Lines $inserted)
    $sectionsC = @(Get-DocumentSections -SourceId 'D99' -Lines $changed)

    $alphaA = $sectionsA | Where-Object Heading -eq 'Alpha'
    $alphaB = $sectionsB | Where-Object Heading -eq 'Alpha'
    $alphaC = $sectionsC | Where-Object Heading -eq 'Alpha'

    Assert-Equal $alphaA.StableUid $alphaB.StableUid 'An unrelated earlier heading changed the stable UID.'
    Assert-Equal $alphaA.StableUid $alphaC.StableUid 'Content drift changed the stable UID.'
    Assert-True ($alphaA.ContentSha256 -ne $alphaC.ContentSha256) 'Content drift did not change the content hash.'

    $duplicates = @(Get-DocumentSections -SourceId 'D99' -Lines @('# Root', '## Same', 'One', '## Same', 'Two'))
    $sameSections = @($duplicates | Where-Object Heading -eq 'Same')
    Assert-Equal $sameSections.Count 2 'Duplicate headings were not inventoried.'
    Assert-True ($sameSections[0].StableUid -ne $sameSections[1].StableUid) 'Duplicate sibling headings received the same UID.'

    $aliases = @{
        'Vetted-SaaS-Blueprint-Master-PRD-v1.md' = 'D05'
    }
    $candidateLines = @(
        '# Root',
        'Related document: `Vetted-SaaS-Blueprint-Master-PRD-v1.md`'
    )
    $candidateSections = @(Get-DocumentSections -SourceId 'D99' -Lines $candidateLines)
    $candidates = @(Get-RelationshipCandidates -SourceId 'D99' -Path 'fixture.md' -Lines $candidateLines -Sections $candidateSections -Aliases $aliases)
    Assert-Equal $candidates.Count 1 'The explicit stale filename was not extracted.'
    Assert-Equal $candidates[0].ResolvedTarget 'D05' 'The stale filename alias did not resolve to D05.'
    Assert-Equal $candidates[0].ResolutionNote 'alias-mismatch' 'Alias resolution did not retain the mismatch.'

    $frontmatterLines = @('---', 'primary_consumers:', '  - editorial agent', 'required_dependencies:', '  - VSB-DOC-01 Market Research', '---', '# Root', 'Documents 04, 06, and 10 define the checks.')
    $frontmatterSections = @(Get-DocumentSections -SourceId 'D99' -Lines $frontmatterLines)
    $frontmatterCandidates = @(Get-RelationshipCandidates -SourceId 'D99' -Path 'frontmatter.md' -Lines $frontmatterLines -Sections $frontmatterSections -Aliases @{})
    Assert-True (@($frontmatterCandidates | Where-Object Extractor -eq 'frontmatter-primary-consumer').Count -eq 1) 'Primary consumers were not extracted from frontmatter.'
    Assert-True (@($frontmatterCandidates | Where-Object { $_.ResolvedTarget -eq 'D01' -and $_.Extractor -eq 'frontmatter-required-dependency' }).Count -eq 1) 'Required dependencies were not extracted from frontmatter.'
    foreach ($target in @('D04', 'D06', 'D10')) {
        Assert-True (@($frontmatterCandidates | Where-Object ResolvedTarget -eq $target).Count -ge 1) "Document list target $target was not extracted."
    }

    $miniManifest = [ordered]@{
        schema_version = '2.0'
        manifest_sha256 = 'fixture-manifest'
        source_count = 2
        heading_count = 3
        sources = @(
            [ordered]@{ source_id = 'D01'; path = 'd01.md'; title = 'One'; sha256 = 'a'; authority_status = 'working'; sections = @(
                [ordered]@{ display_id = 'D01-H001'; stable_uid = 'D01-S-root'; heading = 'One'; heading_path = @('One'); line_start = 1; line_end = 2; content_sha256 = 'a'; exact_text = "# One`nAuthority." }
            ) },
            [ordered]@{ source_id = 'D02'; path = 'd02.md'; title = 'Two'; sha256 = 'b'; authority_status = 'working'; sections = @(
                [ordered]@{ display_id = 'D02-H001'; stable_uid = 'D02-S-root'; heading = 'Two'; heading_path = @('Two'); line_start = 1; line_end = 2; content_sha256 = 'b'; exact_text = "# Two`nThis document MUST depend on Document 01." },
                [ordered]@{ display_id = 'D02-H002'; stable_uid = 'D02-S-note'; heading = 'Note'; heading_path = @('Two', 'Note'); line_start = 3; line_end = 4; content_sha256 = 'c'; exact_text = "## Note`nExplanation only." }
            ) }
        )
    }
    $miniCandidates = @([ordered]@{
        candidate_id = 'RC-mini'; source_document = 'D02'; source_section_uid = 'D02-S-root'; source_path = 'd02.md'; line = 2; extractor = 'document-number'; original_text = 'This document MUST depend on Document 01.'; raw_target = 'Document 01'; resolved_target = 'D01'; resolution_note = 'document-number'; disposition = 'accepted'
    })
    $miniSeed = [ordered]@{ id = 'R-D01-REFINES-D02-NOTE'; from = 'C-D01-S-root'; to = 'C-D02-S-note'; type = 'refines'; classification = 'repository-fact'; resolution_state = 'confirmed'; evidence_anchors = @('D01-S-root','D02-S-note'); rationale = 'fixture seed'; affected_documents = @('D01','D02') }
    $builtGraph = New-CanonicalGraph -Manifest $miniManifest -Candidates $miniCandidates -Directives @() -RelationshipSeeds @($miniSeed)
    Assert-Equal @($builtGraph.sections | Where-Object review_disposition -eq 'unreviewed').Count 0 'The graph builder left an unreviewed section.'
    Assert-Equal ($builtGraph.sections | Where-Object stable_uid -eq 'D02-S-root').review_disposition 'claims-extracted' 'Normative source text was not classified for extraction.'
    Assert-Equal ($builtGraph.sections | Where-Object stable_uid -eq 'D02-S-note').review_disposition 'no-extracted-claim' 'Explanatory source text did not receive a closed disposition.'
    Assert-True (@($builtGraph.claims | Where-Object id -eq 'C-D02-S-note').Count -eq 1) 'A seeded explanatory endpoint did not receive a claim node.'
    Assert-True (@($builtGraph.relationships | Where-Object type -eq 'depends-on').Count -ge 1) 'An accepted explicit dependency did not create a graph edge.'

    $invalidGraph = [ordered]@{
        schema_version = '1.0'
        documents = @([ordered]@{ id = 'D99'; path = 'fixture.md'; sha256 = 'abc'; title = 'Fixture'; authority_status = 'working' })
        sections = @([ordered]@{ id = 'D99-H001'; stable_uid = 'D99-S-abc'; document_id = 'D99'; heading_path = @('Root'); line_start = 1; line_end = 2; content_sha256 = 'abc'; review_disposition = 'unreviewed' })
        claims = @()
        directives = @()
        relationships = @()
        candidates = @()
    }
    $validation = Test-CanonicalGraph -Graph $invalidGraph
    Assert-True (-not $validation.Valid) 'An unreviewed section passed validation.'
    Assert-True ($validation.Errors -contains 'Section D99-S-abc has invalid review disposition: unreviewed') 'The validation error did not identify the unreviewed section.'

    $graph = [ordered]@{
        schema_version = '1.0'
        documents = @(
            [ordered]@{ id = 'D01'; path = 'd01.md'; sha256 = 'a'; title = 'One'; authority_status = 'working' },
            [ordered]@{ id = 'D02'; path = 'd02.md'; sha256 = 'b'; title = 'Two'; authority_status = 'working' }
        )
        sections = @(
            [ordered]@{ id = 'D01-H001'; stable_uid = 'D01-S-one'; document_id = 'D01'; heading_path = @('One'); line_start = 1; line_end = 2; content_sha256 = 'a'; review_disposition = 'claims-extracted' },
            [ordered]@{ id = 'D02-H001'; stable_uid = 'D02-S-two'; document_id = 'D02'; heading_path = @('Two'); line_start = 1; line_end = 2; content_sha256 = 'b'; review_disposition = 'claims-extracted' }
        )
        claims = @(
            [ordered]@{ id = 'C-D01-S-one'; section_uid = 'D01-S-one'; document_id = 'D01'; exact_text = 'One'; statement_sha256 = 'a'; classification = 'repository-fact'; authority_domain = 'fixture'; defines = @(); consumes = @(); implementation_relevance = 'fixture' },
            [ordered]@{ id = 'C-D02-S-two'; section_uid = 'D02-S-two'; document_id = 'D02'; exact_text = 'Two'; statement_sha256 = 'b'; classification = 'repository-fact'; authority_domain = 'fixture'; defines = @(); consumes = @(); implementation_relevance = 'fixture' }
        )
        directives = @([ordered]@{ id = 'UD-999'; classification = 'user-directive'; exact_text = 'Fixture directive'; authority_domain = 'fixture'; resolution_state = 'confirmed'; requirements_checked = @('D01-H001') })
        relationships = @(
            [ordered]@{ id = 'R-D02-S-two-DEPENDS-ON-D01-S-one'; from = 'C-D02-S-two'; to = 'C-D01-S-one'; type = 'depends-on'; classification = 'repository-fact'; resolution_state = 'confirmed'; evidence_anchors = @('D02-S-two'); rationale = 'fixture'; affected_documents = @('D01', 'D02') },
            [ordered]@{ id = 'R-UD-999-CONSTRAINS-D01-S-one'; from = 'UD-999'; to = 'C-D01-S-one'; type = 'constrains'; classification = 'user-directive'; resolution_state = 'confirmed'; evidence_anchors = @('UD-999'); rationale = 'fixture directive'; affected_documents = @('D01') }
        )
        candidates = @()
    }

    $validation = Test-CanonicalGraph -Graph $graph
    Assert-True $validation.Valid 'The valid fixture graph failed validation.'

    $bridgeRoot = Join-Path $tempRoot 'bridge'
    New-GitNexusBridge -Graph $graph -OutputRoot $bridgeRoot
    $nodeOne = Get-Content -Raw -LiteralPath (Join-Path $bridgeRoot 'nodes\D01.mjs')
    $relationTwo = Get-Content -Raw -LiteralPath (Join-Path $bridgeRoot 'relationships\D02.mjs')
    $relationDirective = Get-Content -Raw -LiteralPath (Join-Path $bridgeRoot 'relationships\UD.mjs')
    Assert-True ($nodeOne -match 'export function claim_C_D01_S_one') 'The claim bridge symbol was not generated.'
    Assert-True ($relationTwo -match 'export function relation_R_D02_S_two_DEPENDS_ON_D01_S_one') 'The relation bridge symbol was not generated.'
    Assert-True (([regex]::Matches($relationTwo, 'claim_C_D0[12]_S_(one|two)\(\)')).Count -eq 2) 'The relation bridge does not call exactly two endpoints.'
    Assert-True ($relationDirective -match 'export function relation_R_UD_999_CONSTRAINS_D01_S_one') 'A directive-origin relation was not generated.'

    $impact = Get-GraphImpact -Graph $graph -SectionUid 'D01-S-one'
    Assert-Equal $impact.Inbound.Count 2 'Inbound impact was not reported.'
    Assert-Equal $impact.AffectedDocuments.Count 2 'Affected document closure was incomplete.'

    Write-Output 'PASS: document intelligence unit tests'
} finally {
    $resolvedTemp = [System.IO.Path]::GetFullPath($tempRoot)
    $systemTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if ($resolvedTemp.StartsWith($systemTemp, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedTemp)) {
        Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
    }
}
