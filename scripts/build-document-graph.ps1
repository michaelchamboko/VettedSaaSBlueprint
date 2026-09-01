[CmdletBinding()]
param([string]$OutputPath)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$intelligenceRoot = Join-Path $repositoryRoot 'docs\document-intelligence'
if ([string]::IsNullOrWhiteSpace($OutputPath)) { $OutputPath = Join-Path $intelligenceRoot 'DOCUMENT_GRAPH.json' }
Import-Module -Force -Name (Join-Path $PSScriptRoot 'DocumentGraph.psm1')

$manifest = Get-Content -Raw -LiteralPath (Join-Path $intelligenceRoot 'SOURCE_MANIFEST.json') | ConvertFrom-Json
$candidateDocument = Get-Content -Raw -LiteralPath (Join-Path $intelligenceRoot 'RELATIONSHIP_CANDIDATES.json') | ConvertFrom-Json
if ($candidateDocument.source_manifest_sha256 -ne $manifest.manifest_sha256) { throw 'Candidate inbox was generated from a different source manifest.' }

function Get-SectionUidByDisplayId {
    param([string]$DisplayId)
    $match = @($manifest.sources.sections | Where-Object display_id -eq $DisplayId)
    if ($match.Count -ne 1) { throw "Unable to resolve unique display ID: $DisplayId" }
    return [string]$match[0].stable_uid
}

function Get-ClaimId {
    param([string]$DisplayId)
    return "C-$(Get-SectionUidByDisplayId $DisplayId)"
}

function New-SeedEdge {
    param(
        [string]$Id,
        [string]$From,
        [string]$To,
        [string]$Type,
        [string]$Classification,
        [string]$Resolution,
        [string[]]$Anchors,
        [string]$Rationale,
        [string[]]$Documents
    )
    return [pscustomobject][ordered]@{
        id = $Id; from = $From; to = $To; type = $Type; classification = $Classification
        resolution_state = $Resolution; evidence_anchors = $Anchors; rationale = $Rationale
        affected_documents = @($Documents | Sort-Object -Unique)
    }
}

$directives = @(
    [pscustomobject][ordered]@{ id = 'UD-001'; classification = 'user-directive'; exact_text = 'Complete the local document graph before deployment, Global Setup, harmonisation, or ScrollCraft implementation.'; authority_domain = 'foundation-scope'; resolution_state = 'confirmed'; requirements_checked = @('D06-H018', 'D08-H081') },
    [pscustomobject][ordered]@{ id = 'UD-002'; classification = 'user-directive'; exact_text = 'Do not add information outside the existing documents unless the product owner explicitly introduces it.'; authority_domain = 'non-inference'; resolution_state = 'confirmed'; requirements_checked = @('D05-H024', 'D06-H018') },
    [pscustomobject][ordered]@{ id = 'UD-003'; classification = 'user-directive'; exact_text = 'Motion and the customer journey must support a profitable affiliate business and qualified affiliate action.'; authority_domain = 'commercial-intent'; resolution_state = 'unresolved'; requirements_checked = @('D02-H024', 'D03-H113', 'D04-H015', 'D05-H127', 'D09-H009') },
    [pscustomobject][ordered]@{ id = 'UD-004'; classification = 'user-directive'; exact_text = 'Do not create a baseline commit yet.'; authority_domain = 'git-baseline'; resolution_state = 'confirmed'; requirements_checked = @('D08-H081') },
    [pscustomobject][ordered]@{ id = 'UD-005'; classification = 'user-directive'; exact_text = 'Reduced motion must not be misrepresented as a preference for minimal motion.'; authority_domain = 'motion-interpretation'; resolution_state = 'confirmed'; requirements_checked = @('D04-H057', 'D06-H052', 'D10-H024') },
    [pscustomobject][ordered]@{ id = 'UD-006'; classification = 'user-directive'; exact_text = 'Use ScrollCraft as the primary advanced narrative-motion engine; use CSS or static rendering as baseline and reduced-motion path; permit GSAP only as a documented exception for a safely unexpressible reversible or branching interaction.'; authority_domain = 'motion-engine-selection'; resolution_state = 'confirmed'; requirements_checked = @('D06-H056', 'D11-H020', 'D11-H023') },
    [pscustomobject][ordered]@{ id = 'UD-007'; classification = 'user-directive'; exact_text = 'Review the marketingskills repository and tailor applicable skills through the existing documentation for page creation; do not create an extra planning document.'; authority_domain = 'marketing-skill-integration'; resolution_state = 'confirmed'; requirements_checked = @('D06-H060', 'D07-H004', 'D08-H082', 'D09-H014', 'D10-H022') },
    [pscustomobject][ordered]@{ id = 'UD-008'; classification = 'user-directive'; exact_text = 'Use the pinned hormozi-skills capabilities selectively for affiliate-safe copy and business messaging; exclude pricing strategy and seller-controlled price, guarantee, scarcity, urgency, and bonus claims while preserving evidence-bound vendor pricing facts.'; authority_domain = 'affiliate-copy-skill-integration'; resolution_state = 'confirmed'; requirements_checked = @('D01-H042', 'D04-H015', 'D05-H043', 'D05-H127', 'D05-H128', 'D06-H060', 'D07-H100', 'D08-H082', 'D09-H017', 'D10-H022') }
)

$seeds = [System.Collections.Generic.List[object]]::new()
$seedSpecs = @(
    @{ Id='R-UD-001-CONSTRAINS-D08-H081'; From='UD-001'; To=(Get-ClaimId 'D08-H081'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D08'); Why='The foundation phase keeps GitNexus subordinate to direct source authority.' },
    @{ Id='R-UD-002-CONSTRAINS-D05-H024'; From='UD-002'; To=(Get-ClaimId 'D05-H024'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D05'); Why='The user directive reinforces the repository evidence and anti-invention rule.' },
    @{ Id='R-UD-002-CONSTRAINS-D06-H018'; From='UD-002'; To=(Get-ClaimId 'D06-H018'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D06'); Why='The user directive reinforces the implementation anti-hallucination rule.' },
    @{ Id='R-UD-003-CONFLICTS-WITH-D05-H127'; From='UD-003'; To=(Get-ClaimId 'D05-H127'); Type='conflicts-with'; Class='user-directive'; State='unresolved'; Docs=@('D05','D09','D11'); Why='Commercial optimisation must be reconciled with ranking independence without pre-deciding the outcome.' },
    @{ Id='R-UD-004-CONSTRAINS-D08-H081'; From='UD-004'; To=(Get-ClaimId 'D08-H081'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D08'); Why='No-commit scope limits GitNexus commit-delta analysis but not direct-source mapping.' },
    @{ Id='R-UD-005-CONSTRAINS-D06-H052'; From='UD-005'; To=(Get-ClaimId 'D06-H052'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D04','D06','D10','D11'); Why='Reduced motion remains an equivalent information-and-action experience, not a default minimal-motion preference.' },
    @{ Id='R-UD-006-CONSTRAINS-D11-H020'; From='UD-006'; To=(Get-ClaimId 'D11-H020'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D06','D11'); Why='ScrollCraft is primary for advanced linear narrative motion; CSS/static is baseline and GSAP is an exception, not a fallback engine.' },
    @{ Id='R-UD-007-CONSTRAINS-D06-H060'; From='UD-007'; To=(Get-ClaimId 'D06-H060'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D06'); Why='Marketing capabilities must be selected by declared page intent and page type rather than invoked as an unrestricted bundle.' },
    @{ Id='R-UD-007-CONSTRAINS-D07-H004'; From='UD-007'; To=(Get-ClaimId 'D07-H004'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D07'); Why='External marketing guidance remains subordinate to the local real-demand, evidence, editorial-independence, and SEO sequence.' },
    @{ Id='R-UD-007-CONSTRAINS-D08-H082'; From='UD-007'; To=(Get-ClaimId 'D08-H082'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D08'); Why='Applicable marketing capabilities consume the existing research-context-to-page contract rather than creating a parallel product-marketing authority file.' },
    @{ Id='R-UD-007-CONSTRAINS-D09-H014'; From='UD-007'; To=(Get-ClaimId 'D09-H014'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D09'); Why='Distribution and experimentation skills enter only after the publish, deploy, asset, telemetry, and refresh loop has reached their stage.' },
    @{ Id='R-UD-007-CONSTRAINS-D10-H022'; From='UD-007'; To=(Get-ClaimId 'D10-H022'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D10'); Why='Marketing-generated page changes must pass the existing content, evidence, trust, distribution, and runtime QA gates.' },
    @{ Id='R-UD-008-CONSTRAINS-D01-H042'; From='UD-008'; To=(Get-ClaimId 'D01-H042'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D01'); Why='Market-research inputs must remain observed, source-linked demand signals rather than simulated customer language or invented evidence.' },
    @{ Id='R-UD-008-CONSTRAINS-D04-H015'; From='UD-008'; To=(Get-ClaimId 'D04-H015'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D04'); Why='Affiliate copy optimises informed progress rather than pressure or affiliate-click volume.' },
    @{ Id='R-UD-008-CONSTRAINS-D05-H043'; From='UD-008'; To=(Get-ClaimId 'D05-H043'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D05'); Why='Pricing strategy and price anchoring are excluded while decision-relevant vendor pricing remains bound to an official source, current date, and region.' },
    @{ Id='R-UD-008-CONSTRAINS-D05-H127'; From='UD-008'; To=(Get-ClaimId 'D05-H127'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D05'); Why='Affiliate commission, payout, vendor relationships, and campaign pressure cannot influence recommendation scoring or ranking.' },
    @{ Id='R-UD-008-CONSTRAINS-D05-H128'; From='UD-008'; To=(Get-ClaimId 'D05-H128'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D05'); Why='Every affiliate-copy output preserves clear affiliate disclosure.' },
    @{ Id='R-UD-008-CONSTRAINS-D06-H060'; From='UD-008'; To=(Get-ClaimId 'D06-H060'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D06'); Why='Hormozi capabilities are selected by the declared local page type rather than used as a generic sales-page bundle.' },
    @{ Id='R-UD-008-CONSTRAINS-D07-H100'; From='UD-008'; To=(Get-ClaimId 'D07-H100'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D07'); Why='Material copy remains traceable from page-block intent through claim, evidence, source, and date.' },
    @{ Id='R-UD-008-CONSTRAINS-D08-H082'; From='UD-008'; To=(Get-ClaimId 'D08-H082'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D08'); Why='Hormozi skills consume the existing research-context package and cannot manufacture product or market truth.' },
    @{ Id='R-UD-008-CONSTRAINS-D09-H017'; From='UD-008'; To=(Get-ClaimId 'D09-H017'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D09'); Why='Hooks and derivative copy retain canonical identity, user context, evidence state and dates, conditions, limitations, disclosure, and a route to the full reasoning.' },
    @{ Id='R-UD-008-CONSTRAINS-D10-H022'; From='UD-008'; To=(Get-ClaimId 'D10-H022'); Type='constrains'; Class='user-directive'; State='confirmed'; Docs=@('D10'); Why='Every generated copy artifact remains a proposal until it passes local content and evidence QA.' },
    @{ Id='R-D04-H015-DEPENDS-ON-D01-H011'; From=(Get-ClaimId 'D04-H015'); To=(Get-ClaimId 'D01-H011'); Type='depends-on'; Class='repository-fact'; State='confirmed'; Docs=@('D01','D04'); Why='Conversion design consumes the buyer-decision model.' },
    @{ Id='R-D04-H016-REFINES-D02-H077'; From=(Get-ClaimId 'D04-H016'); To=(Get-ClaimId 'D02-H077'); Type='refines'; Class='repository-fact'; State='confirmed'; Docs=@('D02','D04'); Why='Respect-over-manipulation refines the roadmap ethical-conversion constraint.' },
    @{ Id='R-D05-H127-REFINES-D03-H113'; From=(Get-ClaimId 'D05-H127'); To=(Get-ClaimId 'D03-H113'); Type='refines'; Class='repository-fact'; State='confirmed'; Docs=@('D03','D05'); Why='Ranking independence refines affiliate independence.' },
    @{ Id='R-D07-H013-REFINES-D03-H113'; From=(Get-ClaimId 'D07-H013'); To=(Get-ClaimId 'D03-H113'); Type='refines'; Class='repository-fact'; State='confirmed'; Docs=@('D03','D07'); Why='Editorial affiliate independence refines the architecture rule.' },
    @{ Id='R-D10-H024-VERIFIES-D04-H057'; From=(Get-ClaimId 'D10-H024'); To=(Get-ClaimId 'D04-H057'); Type='verifies'; Class='repository-fact'; State='confirmed'; Docs=@('D04','D10'); Why='Motion QA verifies purposeful motion.' },
    @{ Id='R-D10-H024-VERIFIES-D06-H050'; From=(Get-ClaimId 'D10-H024'); To=(Get-ClaimId 'D06-H050'); Type='verifies'; Class='repository-fact'; State='confirmed'; Docs=@('D06','D10'); Why='Motion QA verifies native scrolling.' },
    @{ Id='R-D10-H024-VERIFIES-D06-H052'; From=(Get-ClaimId 'D10-H024'); To=(Get-ClaimId 'D06-H052'); Type='verifies'; Class='repository-fact'; State='confirmed'; Docs=@('D06','D10'); Why='Motion QA verifies reduced-motion equivalence.' },
    @{ Id='R-D10-H030-VERIFIES-D05-H127'; From=(Get-ClaimId 'D10-H030'); To=(Get-ClaimId 'D05-H127'); Type='verifies'; Class='repository-fact'; State='confirmed'; Docs=@('D05','D10'); Why='Commercial-integrity QA verifies ranking independence.' },
    @{ Id='R-D11-H002-DEPENDS-ON-D04-H057'; From=(Get-ClaimId 'D11-H002'); To=(Get-ClaimId 'D04-H057'); Type='depends-on'; Class='proposal'; State='confirmed'; Docs=@('D04','D11'); Why='The ScrollCraft proposal consumes design motion authority.' },
    @{ Id='R-D11-H002-DEPENDS-ON-D06-H056'; From=(Get-ClaimId 'D11-H002'); To=(Get-ClaimId 'D06-H056'); Type='depends-on'; Class='proposal'; State='confirmed'; Docs=@('D06','D11'); Why='The ScrollCraft proposal consumes the narrative scroll-story contract.' },
    @{ Id='R-D10-H024-VERIFIES-D11-H040'; From=(Get-ClaimId 'D10-H024'); To=(Get-ClaimId 'D11-H040'); Type='verifies'; Class='user-directive'; State='confirmed'; Docs=@('D10','D11'); Why="Document 10 motion QA is the verification authority for Document 11's static, reduced-motion, keyboard, screen-reader, performance, and rollback matrix." }
)
foreach ($spec in $seedSpecs) {
    $seeds.Add((New-SeedEdge -Id $spec.Id -From $spec.From -To $spec.To -Type $spec.Type -Classification $spec.Class -Resolution $spec.State -Anchors @($spec.From,$spec.To) -Rationale $spec.Why -Documents $spec.Docs))
}

$graph = New-CanonicalGraph -Manifest $manifest -Candidates @($candidateDocument.candidates) -Directives $directives -RelationshipSeeds @($seeds)
$graph | Add-Member -NotePropertyName findings -NotePropertyValue @(
    [ordered]@{ id='F-001'; classification='tool-observation'; summary='Markdown indexing alone produced containment-only edges and no semantic flows.'; status='mitigated-by-bridge' },
    [ordered]@{ id='F-002'; classification='repository-fact'; summary='Some source relationship sections still describe an older ten-document set.'; status='open-for-harmonisation' },
    [ordered]@{ id='F-003'; classification='repository-fact'; summary='A stale Master PRD filename exists and is resolved only through the explicit alias registry.'; status='open-for-harmonisation' },
    [ordered]@{ id='F-004'; classification='repository-fact-plus-user-directive'; summary='The ScrollCraft fork is verified and published; D11 retains implementation_authority: false for production-page work.'; status='closed-with-boundary' },
    [ordered]@{ id='F-005'; classification='repository-fact-plus-inference'; summary='The UI catalogue has no explicit D04 consumer or authority relationship.'; status='open-and-visible' },
    [ordered]@{ id='F-006'; classification='user-directive-versus-repository-fact'; summary='The local foundation boundary and active-day deployment rules require later applicability adjudication.'; status='open-for-harmonisation' },
    [ordered]@{ id='F-007'; classification='user-directive-plus-repository-fact'; summary='The adjudicated motion strategy permits qualified affiliate action only after evidence resolves the relevant decision; ranking, disclosure, and anti-deception constraints remain binding.'; status='mitigated-by-adjudicated-strategy' },
    [ordered]@{ id='F-008'; classification='repository-fact-plus-user-directive'; summary='Reduced motion must not be reinterpreted as minimal default motion.'; status='locked-interpretation' },
    [ordered]@{ id='F-009'; classification='user-directive-plus-tool-observation'; summary='No baseline commit means GitNexus commit-delta analysis remains unavailable.'; status='mitigated-by-stable-uid-impact' },
    [ordered]@{ id='F-010'; classification='repository-fact'; summary='Engineering graphs are not canonical business knowledge.'; status='locked-boundary' },
    [ordered]@{ id='F-011'; classification='repository-fact-plus-user-directive'; summary='An explicit D10-to-D11 verification relationship now covers the narrative-motion verification matrix; UI-catalogue traceability remains a later amendment.'; status='partially-mitigated' },
    [ordered]@{ id='F-013'; classification='user-directive-plus-repository-fact'; summary='ScrollCraft is the primary advanced narrative-motion engine; CSS/static is the baseline and reduced-motion path; GSAP requires a documented branching or reversible-interaction exception.'; status='confirmed' },
    [ordered]@{ id='F-012'; classification='tool-observation'; summary='Earlier UI catalogue drift proved the need for manifest-hash gates.'; status='mitigated-by-source-hash-gate' },
    [ordered]@{ id='F-014'; classification='external-evidence-plus-repository-fact'; summary='The requested marketingskills fork is pinned for review at commit 8bfcdffb655f16e713940cd04fb08891899c47db (v2.5.1, 45 skills); its skills are bounded advisory adapters and are not repository authority or an install bundle.'; status='recorded-with-adapter-boundary' },
    [ordered]@{ id='F-015'; classification='external-evidence-versus-repository-fact'; summary='Generic product-marketing context, search-first prioritisation, page structures, comparison formats, and CRO defaults must yield to the existing local context, evidence order, three page-type contracts, and informed-progress conversion model.'; status='resolved-by-local-authority' },
    [ordered]@{ id='F-016'; classification='external-evidence-versus-repository-fact'; summary='Generic gating, social-proof, affiliate, crawler, and conversion advice must yield to public reasoning value, evidence traceability, ranking independence, disclosure, trust, consent, and crawler-policy requirements.'; status='resolved-by-local-authority' },
    [ordered]@{ id='F-017'; classification='tool-observation'; summary='The fork passes its local 45-skill frontmatter and size validator, but that validator is shallow; two skills lack eval files, integration and CLI assets are not runtime-certified by the observed workflows, and the fork trails upstream.'; status='advisory-only' },
    [ordered]@{ id='F-018'; classification='external-evidence-plus-repository-fact'; summary='The requested hormozi-skills fork is pinned for review at commit 25ec2b0789ae8c760b45f577024782ff399983a6; ten individual capabilities are mapped as advisory copy inputs without installing the bundle or invoking its orchestrator.'; status='recorded-with-affiliate-adapter-boundary' },
    [ordered]@{ id='F-019'; classification='external-evidence-versus-repository-fact'; summary='Seller-controlled pricing, guarantees, scarcity, urgency, and arbitrary bonus-value defaults conflict with an affiliate publisher that does not control the vendor offer and with local evidence and anti-deception requirements.'; status='resolved-by-exclusion' },
    [ordered]@{ id='F-020'; classification='tool-observation'; summary='The reviewed fork has no observed release, CI, or eval evidence, and its full orchestrator and subagent workflow assumes Claude-specific runtime primitives; only direct individual capability calls are permitted.'; status='advisory-only' },
    [ordered]@{ id='F-021'; classification='user-directive-plus-repository-fact'; summary='Pricing strategy and monetary value anchoring are excluded from Hormozi-generated copy; decision-relevant vendor price may still be reported when verified from an official source with current date and region.'; status='confirmed-with-evidence-boundary' }
)

$validation = Test-CanonicalGraph -Graph $graph
if (-not $validation.Valid) { throw ($validation.Errors -join "`n") }
[System.IO.File]::WriteAllText($OutputPath, (($graph | ConvertTo-Json -Depth 15) + "`n"), [System.Text.UTF8Encoding]::new($false))

Write-Output "Documents: $(@($graph.documents).Count)"
Write-Output "Sections: $(@($graph.sections).Count)"
Write-Output "Claims: $(@($graph.claims).Count)"
Write-Output "Directives: $(@($graph.directives).Count)"
Write-Output "Relationships: $(@($graph.relationships).Count)"
Write-Output "Unreviewed: $(@($graph.sections | Where-Object review_disposition -eq 'unreviewed').Count)"
