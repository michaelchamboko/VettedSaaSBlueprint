[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$expectedVersion = '1.6.9'
$walCheckpointThreshold = 67108864
$workerCount = 1
$gitNexusCommand = Get-Command gitnexus.cmd -CommandType Application -ErrorAction SilentlyContinue
if ($null -eq $gitNexusCommand) {
    throw "GitNexus $expectedVersion is required on PATH. Install the pinned CLI, then rerun this script."
}

$actualVersion = (& $gitNexusCommand.Path --version).Trim()
if ($LASTEXITCODE -ne 0 -or $actualVersion -ne $expectedVersion) {
    throw "Expected GitNexus $expectedVersion but received [$actualVersion]."
}
& $gitNexusCommand.Path analyze --force --index-only --workers $workerCount --wal-checkpoint-threshold $walCheckpointThreshold
if ($LASTEXITCODE -ne 0) { throw 'GitNexus index refresh failed.' }
