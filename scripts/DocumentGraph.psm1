Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-Sha256Text {
    param([AllowEmptyString()][string]$Text)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hash = $algorithm.ComputeHash($bytes)
        return (($hash | ForEach-Object { $_.ToString('x2') }) -join '')
    } finally {
        $algorithm.Dispose()
    }
}

function ConvertTo-StableToken {
    param([string]$Value)
    $normal = $Value.Normalize([System.Text.NormalizationForm]::FormKD).ToLowerInvariant()
    $normal = [regex]::Replace($normal, '[^a-z0-9]+', '-')
    return $normal.Trim('-')
}

function ConvertTo-JavaScriptIdentifier {
    param([string]$Value)
    $identifier = [regex]::Replace($Value, '[^A-Za-z0-9_]', '_')
    if ($identifier -match '^[0-9]') { $identifier = "_$identifier" }
    return $identifier
}

function Get-DocumentSections {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$SourceId,
        [Parameter(Mandatory)][AllowEmptyCollection()][AllowEmptyString()][string[]]$Lines
    )

    $headings = [System.Collections.Generic.List[object]]::new()
    $ancestry = @{}
    $pathOccurrences = @{}

    for ($index = 0; $index -lt $Lines.Count; $index++) {
        if ($Lines[$index] -notmatch '^(#{1,6})\s+(.+?)\s*$') { continue }
        $level = $Matches[1].Length
        $heading = $Matches[2]
        $ancestry[$level] = $heading
        foreach ($key in @($ancestry.Keys | Where-Object { [int]$_ -gt $level })) {
            $ancestry.Remove($key)
        }
        $headingPath = @(
            1..$level |
                Where-Object { $ancestry.ContainsKey($_) } |
                ForEach-Object { [string]$ancestry[$_] }
        )
        $normalPath = ($headingPath | ForEach-Object { ConvertTo-StableToken $_ }) -join '/'
        $occurrenceKey = "$SourceId|$normalPath"
        if (-not $pathOccurrences.ContainsKey($occurrenceKey)) { $pathOccurrences[$occurrenceKey] = 0 }
        $pathOccurrences[$occurrenceKey]++
        $occurrence = [int]$pathOccurrences[$occurrenceKey]
        $identityHash = Get-Sha256Text "$SourceId|$normalPath|$occurrence"

        $headings.Add([pscustomobject][ordered]@{
            SourceId = $SourceId
            DisplayId = ('{0}-H{1:d3}' -f $SourceId, ($headings.Count + 1))
            StableUid = "$SourceId-S-$($identityHash.Substring(0, 12))"
            Level = $level
            Heading = $heading
            HeadingPath = $headingPath
            StartLine = $index + 1
            EndLine = $null
            ContentSha256 = $null
            ExactText = $null
        })
    }

    for ($position = 0; $position -lt $headings.Count; $position++) {
        $section = $headings[$position]
        $endLine = if ($position + 1 -lt $headings.Count) { $headings[$position + 1].StartLine - 1 } else { $Lines.Count }
        $text = if ($Lines.Count -eq 0) { '' } else { ($Lines[($section.StartLine - 1)..($endLine - 1)] -join "`n") }
        $section.EndLine = $endLine
        $section.ExactText = $text
        $section.ContentSha256 = Get-Sha256Text $text
    }

    return $headings
}

function Get-RelationshipCandidates {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$SourceId,
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][AllowEmptyString()][string[]]$Lines,
        [Parameter(Mandatory)][object[]]$Sections,
        [Parameter(Mandatory)][hashtable]$Aliases
    )

    $candidates = [System.Collections.Generic.List[object]]::new()
    $patterns = @(
        @{ Name = 'document-filename'; Regex = 'Vetted-SaaS-Blueprint-[A-Za-z0-9-]+\.md' },
        @{ Name = 'document-id'; Regex = 'VSB-DOC-(?:0[1-9]|1[01])' },
        @{ Name = 'document-number'; Regex = '\bDocument(?:s)?\s+(?:0[1-9]|1[01])\b' }
    )

    function Add-RelationshipCandidate {
        param(
            [string]$SectionUid,
            [int]$LineNumber,
            [string]$Extractor,
            [string]$OriginalText,
            [string]$RawTarget,
            [string]$ResolvedTarget,
            [string]$ResolutionNote
        )
        $candidateHash = Get-Sha256Text "$SourceId|$SectionUid|$LineNumber|$Extractor|$RawTarget"
        $candidates.Add([pscustomobject][ordered]@{
            CandidateId = "RC-$($candidateHash.Substring(0, 16))"
            SourceDocument = $SourceId
            SourceSectionUid = $SectionUid
            SourcePath = $Path
            Line = $LineNumber
            Extractor = $Extractor
            OriginalText = $OriginalText.Trim()
            RawTarget = $RawTarget
            ResolvedTarget = $ResolvedTarget
            ResolutionNote = $ResolutionNote
            Disposition = if ($ResolvedTarget) { 'accepted' } else { 'unresolved' }
        })
    }

    if ($Lines.Count -gt 2 -and $Lines[0].Trim() -eq '---') {
        $frontmatterEnd = -1
        for ($frontmatterIndex = 1; $frontmatterIndex -lt $Lines.Count; $frontmatterIndex++) {
            if ($Lines[$frontmatterIndex].Trim() -eq '---') { $frontmatterEnd = $frontmatterIndex; break }
        }
        if ($frontmatterEnd -gt 0) {
            $rootSectionUid = if ($Sections.Count -gt 0) { [string]$Sections[0].StableUid } else { "$SourceId-S-frontmatter" }
            $frontmatterKey = $null
            for ($frontmatterIndex = 1; $frontmatterIndex -lt $frontmatterEnd; $frontmatterIndex++) {
                $frontmatterLine = $Lines[$frontmatterIndex]
                if ($frontmatterLine -match '^([A-Za-z_]+):\s*(.*?)\s*$') {
                    $frontmatterKey = $Matches[1]
                    $inlineValue = $Matches[2]
                    if ($frontmatterKey -eq 'supersedes' -and $inlineValue -and $inlineValue -ne 'null') {
                        Add-RelationshipCandidate $rootSectionUid ($frontmatterIndex + 1) 'frontmatter-supersedes' $frontmatterLine $inlineValue $null 'unresolved'
                    }
                    continue
                }
                if ($frontmatterLine -notmatch '^\s*-\s+(.+?)\s*$') { continue }
                $item = $Matches[1]
                if ($frontmatterKey -eq 'primary_consumers') {
                    Add-RelationshipCandidate $rootSectionUid ($frontmatterIndex + 1) 'frontmatter-primary-consumer' $frontmatterLine "consumer:$item" $null 'non-document-consumer'
                } elseif ($frontmatterKey -eq 'required_dependencies') {
                    $target = if ($item -match 'VSB-DOC-(0[1-9]|1[01])') { "D$($Matches[1])" } else { $null }
                    Add-RelationshipCandidate $rootSectionUid ($frontmatterIndex + 1) 'frontmatter-required-dependency' $frontmatterLine $item $target $(if ($target) { 'exact-id' } else { 'unresolved' })
                }
            }
        }
    }

    foreach ($section in $Sections) {
        $sectionLines = $Lines[($section.StartLine - 1)..($section.EndLine - 1)]
        for ($offset = 0; $offset -lt $sectionLines.Count; $offset++) {
            $line = $sectionLines[$offset]
            if ($line -match '(?i)\bDocuments?\b') {
                foreach ($numberMatch in [regex]::Matches($line, '\b(0[1-9]|1[01])\b')) {
                    $rawTarget = "Document $($numberMatch.Groups[1].Value)"
                    $resolvedTarget = "D$($numberMatch.Groups[1].Value)"
                    Add-RelationshipCandidate $section.StableUid ($section.StartLine + $offset) 'document-list' $line $rawTarget $resolvedTarget 'document-number'
                }
            }
            foreach ($pattern in $patterns) {
                foreach ($match in [regex]::Matches($line, $pattern.Regex)) {
                    $rawTarget = $match.Value
                    $resolvedTarget = $null
                    $resolutionNote = 'unresolved'
                    if ($Aliases.ContainsKey($rawTarget)) {
                        $resolvedTarget = [string]$Aliases[$rawTarget]
                        $resolutionNote = 'alias-mismatch'
                    } elseif ($rawTarget -match 'VSB-DOC-(0[1-9]|1[01])') {
                        $resolvedTarget = "D$($Matches[1])"
                        $resolutionNote = 'exact-id'
                    } elseif ($rawTarget -match '\bDocument(?:s)?\s+(0[1-9]|1[01])\b') {
                        $resolvedTarget = "D$($Matches[1])"
                        $resolutionNote = 'document-number'
                    } elseif ($rawTarget -match '^Vetted-SaaS-Blueprint-(0[1-9]|1[01])-') {
                        $resolvedTarget = "D$($Matches[1])"
                        $resolutionNote = 'filename-prefix'
                    }
                    Add-RelationshipCandidate $section.StableUid ($section.StartLine + $offset) $pattern.Name $line $rawTarget $resolvedTarget $resolutionNote
                }
            }
        }
    }

    return @($candidates | Sort-Object CandidateId -Unique)
}

function Test-CanonicalGraph {
    [CmdletBinding()]
    param([Parameter(Mandatory)]$Graph)

    $errors = [System.Collections.Generic.List[string]]::new()
    $allowedDispositions = @('claims-extracted', 'no-extracted-claim', 'unresolved')
    $allowedClassifications = @('repository-fact', 'user-directive', 'inference', 'proposal', 'external-evidence')
    $allowedRelationships = @('defines', 'depends-on', 'constrains', 'refines', 'verifies', 'conflicts-with', 'supersedes')
    $allowedResolutions = @('confirmed', 'unresolved', 'superseded')
    $allowedCandidateDispositions = @('accepted', 'rejected', 'duplicate', 'unresolved')

    $nodeIds = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($section in @($Graph.sections)) {
        [void]$nodeIds.Add([string]$section.stable_uid)
        if ($allowedDispositions -notcontains $section.review_disposition) {
            $errors.Add("Section $($section.stable_uid) has invalid review disposition: $($section.review_disposition)")
        }
    }
    foreach ($claim in @($Graph.claims)) {
        [void]$nodeIds.Add([string]$claim.id)
        if ($allowedClassifications -notcontains $claim.classification) {
            $errors.Add("Claim $($claim.id) has invalid classification: $($claim.classification)")
        }
    }
    foreach ($directive in @($Graph.directives)) {
        [void]$nodeIds.Add([string]$directive.id)
        if ($directive.classification -ne 'user-directive') {
            $errors.Add("Directive $($directive.id) must use user-directive classification")
        }
    }
    foreach ($edge in @($Graph.relationships)) {
        if ($allowedRelationships -notcontains $edge.type) { $errors.Add("Relationship $($edge.id) has invalid type: $($edge.type)") }
        if ($allowedClassifications -notcontains $edge.classification) { $errors.Add("Relationship $($edge.id) has invalid classification: $($edge.classification)") }
        if ($allowedResolutions -notcontains $edge.resolution_state) { $errors.Add("Relationship $($edge.id) has invalid resolution: $($edge.resolution_state)") }
        if (-not $nodeIds.Contains([string]$edge.from)) { $errors.Add("Relationship $($edge.id) has unknown from endpoint: $($edge.from)") }
        if (-not $nodeIds.Contains([string]$edge.to)) { $errors.Add("Relationship $($edge.id) has unknown to endpoint: $($edge.to)") }
    }
    foreach ($candidate in @($Graph.candidates)) {
        if ($allowedCandidateDispositions -notcontains $candidate.disposition) {
            $errors.Add("Candidate $($candidate.candidate_id) has invalid disposition: $($candidate.disposition)")
        }
    }

    return [pscustomobject]@{ Valid = ($errors.Count -eq 0); Errors = @($errors) }
}

function Get-AuthorityDomain {
    param([string]$DocumentId)
    $domains = @{
        UI = 'visual-reference-catalogue'
        D01 = 'market-and-buyer-decision'
        D02 = 'roadmap-and-delivery'
        D03 = 'architecture-and-automation'
        D04 = 'design-experience-and-motion'
        D05 = 'product-requirements'
        D06 = 'implementation-and-agent-behaviour'
        D07 = 'editorial-operations'
        D08 = 'research-and-knowledge-acquisition'
        D09 = 'growth-and-distribution'
        D10 = 'quality-assurance'
        D11 = 'scrollcraft-proposal'
    }
    if ($domains.ContainsKey($DocumentId)) { return $domains[$DocumentId] }
    return 'unclassified-domain'
}

function Get-RelationshipTypeFromText {
    param([string]$Text)
    if ($Text -match '(?i)\bsupersed') { return 'supersedes' }
    if ($Text -match '(?i)\bconflict') { return 'conflicts-with' }
    if ($Text -match '(?i)\bverif|\btest|\bQA\b|quality assurance') { return 'verifies' }
    if ($Text -match '(?i)\bconstrain') { return 'constrains' }
    if ($Text -match '(?i)\brefin') { return 'refines' }
    return 'depends-on'
}

function Test-ClaimBearingSection {
    param([string]$Text)
    return $Text -match '(?im)\b(MUST|SHOULD|MAY)\b|\b(authority|authoritative|governs?|governed|depends?|dependency|constrains?|refines?|verifies?|supersedes?|conflicts?|required_dependencies|primary_consumers|implementation_authority|VSB-DOC-(?:0[1-9]|1[01])|Document(?:s)?\s+(?:0[1-9]|1[01])|Vetted-SaaS-Blueprint-[A-Za-z0-9-]+\.md)\b'
}

function New-CanonicalGraph {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]$Manifest,
        [Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Candidates,
        [Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Directives,
        [Parameter(Mandatory)][AllowEmptyCollection()][object[]]$RelationshipSeeds
    )

    $documents = [System.Collections.Generic.List[object]]::new()
    $sections = [System.Collections.Generic.List[object]]::new()
    $claims = [System.Collections.Generic.List[object]]::new()
    $relationships = [System.Collections.Generic.List[object]]::new()
    $claimBySection = @{}
    $rootClaimByDocument = @{}
    $requiredClaimSections = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($seed in @($RelationshipSeeds)) {
        foreach ($endpoint in @([string]$seed.from, [string]$seed.to)) {
            if ($endpoint -match '^C-(.+)$') { [void]$requiredClaimSections.Add($Matches[1]) }
        }
    }

    foreach ($source in @($Manifest.sources)) {
        $documents.Add([pscustomobject][ordered]@{
            id = [string]$source.source_id
            path = [string]$source.path
            sha256 = [string]$source.sha256
            title = [string]$source.title
            authority_status = [string]$source.authority_status
        })
        $sourceSections = @($source.sections)
        foreach ($sourceSection in $sourceSections) {
            $hasClaim = Test-ClaimBearingSection -Text ([string]$sourceSection.exact_text)
            $requiresBridgeClaim = $requiredClaimSections.Contains([string]$sourceSection.stable_uid)
            $disposition = if ($hasClaim) { 'claims-extracted' } else { 'no-extracted-claim' }
            $section = [pscustomobject][ordered]@{
                id = [string]$sourceSection.display_id
                stable_uid = [string]$sourceSection.stable_uid
                document_id = [string]$source.source_id
                heading = [string]$sourceSection.heading
                heading_path = @($sourceSection.heading_path)
                line_start = [int]$sourceSection.line_start
                line_end = [int]$sourceSection.line_end
                content_sha256 = [string]$sourceSection.content_sha256
                review_disposition = $disposition
            }
            $sections.Add($section)

            if ($hasClaim -or $requiresBridgeClaim) {
                $claimId = "C-$($sourceSection.stable_uid)"
                $classification = if ($source.source_id -eq 'D11') { 'proposal' } else { 'repository-fact' }
                $claim = [pscustomobject][ordered]@{
                    id = $claimId
                    section_uid = [string]$sourceSection.stable_uid
                    document_id = [string]$source.source_id
                    exact_text = [string]$sourceSection.exact_text
                    line_start = [int]$sourceSection.line_start
                    line_end = [int]$sourceSection.line_end
                    statement_sha256 = [string]$sourceSection.content_sha256
                    classification = $classification
                    authority_domain = Get-AuthorityDomain -DocumentId ([string]$source.source_id)
                    defines = @(Get-AuthorityDomain -DocumentId ([string]$source.source_id))
                    consumes = @()
                    implementation_relevance = if ($source.source_id -eq 'D11') { 'proposal-only' } elseif ($source.source_id -eq 'UI') { 'visual-reference-only' } else { 'strategy-and-future-implementation' }
                }
                $claims.Add($claim)
                $claimBySection[$section.stable_uid] = $claimId
                if (-not $rootClaimByDocument.ContainsKey($source.source_id)) { $rootClaimByDocument[$source.source_id] = $claimId }
                $relationships.Add([pscustomobject][ordered]@{
                    id = "R-$($section.stable_uid)-DEFINES-$claimId"
                    from = $section.stable_uid
                    to = $claimId
                    type = 'defines'
                    classification = $classification
                    resolution_state = 'confirmed'
                    evidence_anchors = @($section.stable_uid)
                    rationale = 'The reviewed source section contains one or more claim-bearing statements represented by its exact section text.'
                    affected_documents = @([string]$source.source_id)
                })
            }
        }
        if (-not $rootClaimByDocument.ContainsKey($source.source_id) -and $sourceSections.Count -gt 0) {
            $rootSection = $sections | Where-Object { $_.stable_uid -eq $sourceSections[0].stable_uid }
            $rootSection.review_disposition = 'claims-extracted'
            $claimId = "C-$($sourceSections[0].stable_uid)"
            $classification = if ($source.source_id -eq 'D11') { 'proposal' } else { 'repository-fact' }
            $claims.Add([pscustomobject][ordered]@{
                id = $claimId; section_uid = [string]$sourceSections[0].stable_uid; document_id = [string]$source.source_id
                exact_text = [string]$sourceSections[0].exact_text; line_start = [int]$sourceSections[0].line_start; line_end = [int]$sourceSections[0].line_end
                statement_sha256 = [string]$sourceSections[0].content_sha256; classification = $classification
                authority_domain = Get-AuthorityDomain -DocumentId ([string]$source.source_id); defines = @(Get-AuthorityDomain -DocumentId ([string]$source.source_id)); consumes = @()
                implementation_relevance = 'document-root-identity'
            })
            $claimBySection[$sourceSections[0].stable_uid] = $claimId
            $rootClaimByDocument[$source.source_id] = $claimId
            $relationships.Add([pscustomobject][ordered]@{
                id = "R-$($sourceSections[0].stable_uid)-DEFINES-$claimId"; from = [string]$sourceSections[0].stable_uid; to = $claimId; type = 'defines'
                classification = $classification; resolution_state = 'confirmed'; evidence_anchors = @([string]$sourceSections[0].stable_uid)
                rationale = 'The document root is represented as a claim-bearing identity node.'; affected_documents = @([string]$source.source_id)
            })
        }
    }

    foreach ($candidate in @($Candidates)) {
        if ($candidate.disposition -ne 'accepted' -or -not $candidate.resolved_target) { continue }
        if ($candidate.resolved_target -eq $candidate.source_document) { continue }
        $fromClaim = $claimBySection[[string]$candidate.source_section_uid]
        $toClaim = $rootClaimByDocument[[string]$candidate.resolved_target]
        if (-not $fromClaim -or -not $toClaim) { continue }
        $relationshipType = Get-RelationshipTypeFromText -Text ([string]$candidate.original_text)
        $isExplicit = $candidate.original_text -match '(?i)required_dependencies|related document|depends?|govern|authority|verif|test|supersed|constrain|refin|conflict'
        $classification = if ($candidate.source_document -eq 'D11') { 'proposal' } elseif ($isExplicit) { 'repository-fact' } else { 'inference' }
        $resolutionState = if ($classification -eq 'inference') { 'unresolved' } else { 'confirmed' }
        $typeToken = $relationshipType.ToUpperInvariant().Replace('-', '_')
        $edgeId = "R-$($candidate.source_section_uid)-$typeToken-$($candidate.resolved_target)"
        if (@($relationships | Where-Object id -eq $edgeId).Count -gt 0) { continue }
        $relationships.Add([pscustomobject][ordered]@{
            id = $edgeId
            from = $fromClaim
            to = $toClaim
            type = $relationshipType
            classification = $classification
            resolution_state = $resolutionState
            evidence_anchors = @([string]$candidate.source_section_uid, [string]$candidate.candidate_id)
            rationale = [string]$candidate.original_text
            affected_documents = @([string]$candidate.source_document, [string]$candidate.resolved_target | Sort-Object -Unique)
        })
        $claim = $claims | Where-Object id -eq $fromClaim
        $claim.consumes = @($claim.consumes + [string]$candidate.resolved_target | Sort-Object -Unique)
    }

    foreach ($directive in @($Directives)) { }
    foreach ($seed in @($RelationshipSeeds)) {
        if (@($relationships | Where-Object id -eq $seed.id).Count -eq 0) { $relationships.Add($seed) }
    }

    return [pscustomobject][ordered]@{
        schema_version = '1.0'
        source_manifest_sha256 = [string]$Manifest.manifest_sha256
        documents = @($documents)
        sections = @($sections)
        claims = @($claims)
        directives = @($Directives)
        relationships = @($relationships)
        candidates = @($Candidates)
    }
}

function New-GitNexusBridge {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]$Graph,
        [Parameter(Mandatory)][string]$OutputRoot
    )

    $nodesRoot = Join-Path $OutputRoot 'nodes'
    $relationshipsRoot = Join-Path $OutputRoot 'relationships'
    [void](New-Item -ItemType Directory -Path $nodesRoot -Force)
    [void](New-Item -ItemType Directory -Path $relationshipsRoot -Force)

    foreach ($document in @($Graph.documents)) {
        $nodeLines = [System.Collections.Generic.List[string]]::new()
        $nodeLines.Add('// GENERATED - DO NOT EDIT. Canonical source: DOCUMENT_GRAPH.json')
        $nodeLines.Add('')
        foreach ($section in @($Graph.sections | Where-Object document_id -eq $document.id)) {
            $name = ConvertTo-JavaScriptIdentifier "section_$($section.stable_uid)"
            $value = ConvertTo-Json -Compress -InputObject ([string]$section.stable_uid)
            $nodeLines.Add("export function $name() { return $value; }")
        }
        foreach ($claim in @($Graph.claims | Where-Object document_id -eq $document.id)) {
            $name = ConvertTo-JavaScriptIdentifier "claim_$($claim.id)"
            $value = ConvertTo-Json -Compress -InputObject ([string]$claim.id)
            $nodeLines.Add("export function $name() { return $value; }")
        }
        [System.IO.File]::WriteAllLines((Join-Path $nodesRoot "$($document.id).mjs"), $nodeLines, [System.Text.UTF8Encoding]::new($false))
    }

    if (@($Graph.directives).Count -gt 0) {
        $directiveLines = [System.Collections.Generic.List[string]]::new()
        $directiveLines.Add('// GENERATED - DO NOT EDIT. Canonical source: DOCUMENT_GRAPH.json')
        $directiveLines.Add('')
        foreach ($directive in @($Graph.directives)) {
            $name = ConvertTo-JavaScriptIdentifier "directive_$($directive.id)"
            $value = ConvertTo-Json -Compress -InputObject ([string]$directive.id)
            $directiveLines.Add("export function $name() { return $value; }")
        }
        [System.IO.File]::WriteAllLines((Join-Path $nodesRoot 'UD.mjs'), $directiveLines, [System.Text.UTF8Encoding]::new($false))
    }

    $claimLookup = @{}
    foreach ($claim in @($Graph.claims)) { $claimLookup[$claim.id] = $claim.document_id }
    $sectionLookup = @{}
    foreach ($section in @($Graph.sections)) { $sectionLookup[$section.stable_uid] = $section.document_id }
    $directiveLookup = @{}
    foreach ($directive in @($Graph.directives)) { $directiveLookup[$directive.id] = 'UD' }

    $originGroups = @($Graph.documents | ForEach-Object { [string]$_.id })
    if (@($Graph.directives).Count -gt 0) { $originGroups += 'UD' }
    foreach ($originId in $originGroups) {
        $edges = @($Graph.relationships | Where-Object {
            $fromDocument = if ($claimLookup.ContainsKey([string]$_.from)) { $claimLookup[[string]$_.from] } elseif ($sectionLookup.ContainsKey([string]$_.from)) { $sectionLookup[[string]$_.from] } else { $directiveLookup[[string]$_.from] }
            $fromDocument -eq $originId
        })
        if ($edges.Count -eq 0) { continue }
        $relationLines = [System.Collections.Generic.List[string]]::new()
        $relationLines.Add('// GENERATED - DO NOT EDIT. Canonical source: DOCUMENT_GRAPH.json')
        $relationLines.Add('')
        $imports = @{}
        foreach ($edge in $edges) {
            foreach ($endpoint in @($edge.from, $edge.to)) {
                $endpointDoc = if ($claimLookup.ContainsKey($endpoint)) { $claimLookup[$endpoint] } elseif ($sectionLookup.ContainsKey($endpoint)) { $sectionLookup[$endpoint] } else { $directiveLookup[$endpoint] }
                $prefix = if ($endpoint -match '^C-') { 'claim' } elseif ($endpoint -match '^UD-') { 'directive' } else { 'section' }
                $symbol = ConvertTo-JavaScriptIdentifier "${prefix}_$endpoint"
                if (-not $imports.ContainsKey($endpointDoc)) { $imports[$endpointDoc] = [System.Collections.Generic.List[string]]::new() }
                if (-not $imports[$endpointDoc].Contains($symbol)) { $imports[$endpointDoc].Add($symbol) }
            }
        }
        foreach ($endpointDoc in @($imports.Keys | Sort-Object)) {
            $symbols = @($imports[$endpointDoc] | Sort-Object) -join ', '
            $relationLines.Add("import { $symbols } from '../nodes/$endpointDoc.mjs';")
        }
        $relationLines.Add('')
        foreach ($edge in $edges) {
            $fromPrefix = if ($edge.from -match '^C-') { 'claim' } elseif ($edge.from -match '^UD-') { 'directive' } else { 'section' }
            $toPrefix = if ($edge.to -match '^C-') { 'claim' } elseif ($edge.to -match '^UD-') { 'directive' } else { 'section' }
            $fromSymbol = ConvertTo-JavaScriptIdentifier "${fromPrefix}_$($edge.from)"
            $toSymbol = ConvertTo-JavaScriptIdentifier "${toPrefix}_$($edge.to)"
            $relationName = ConvertTo-JavaScriptIdentifier "relation_$($edge.id)"
            $idLiteral = ConvertTo-Json -Compress -InputObject ([string]$edge.id)
            $typeLiteral = ConvertTo-Json -Compress -InputObject ([string]$edge.type)
            $classificationLiteral = ConvertTo-Json -Compress -InputObject ([string]$edge.classification)
            $resolutionLiteral = ConvertTo-Json -Compress -InputObject ([string]$edge.resolution_state)
            $relationLines.Add("export function $relationName() {")
            $relationLines.Add("  return { id: $idLiteral, type: $typeLiteral, classification: $classificationLiteral, resolutionState: $resolutionLiteral, from: $fromSymbol(), to: $toSymbol() };")
            $relationLines.Add('}')
        }
        [System.IO.File]::WriteAllLines((Join-Path $relationshipsRoot "$originId.mjs"), $relationLines, [System.Text.UTF8Encoding]::new($false))
    }
}

function Get-GraphImpact {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]$Graph,
        [Parameter(Mandatory)][string]$SectionUid
    )

    $section = @($Graph.sections | Where-Object stable_uid -eq $SectionUid)
    if ($section.Count -ne 1) { throw "Unknown or ambiguous section UID: $SectionUid" }
    $claimIds = @($Graph.claims | Where-Object section_uid -eq $SectionUid | ForEach-Object id)
    $endpointIds = @($SectionUid) + $claimIds
    $inbound = @($Graph.relationships | Where-Object { $endpointIds -contains $_.to })
    $outbound = @($Graph.relationships | Where-Object { $endpointIds -contains $_.from })
    $affectedDocuments = @(
        @($section[0].document_id) +
        @($inbound | ForEach-Object affected_documents) +
        @($outbound | ForEach-Object affected_documents) |
        Sort-Object -Unique
    )
    return [pscustomobject]@{
        SectionUid = $SectionUid
        Inbound = $inbound
        Outbound = $outbound
        AffectedDocuments = $affectedDocuments
        Conflicts = @($inbound + $outbound | Where-Object type -eq 'conflicts-with')
        RequiredReviewTargets = @($inbound + $outbound | ForEach-Object { @($_.from, $_.to) } | Sort-Object -Unique)
    }
}

Export-ModuleMember -Function Get-DocumentSections, Get-RelationshipCandidates, New-CanonicalGraph, Test-CanonicalGraph, New-GitNexusBridge, Get-GraphImpact
