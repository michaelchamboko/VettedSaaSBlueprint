[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$expectedVersion = '1.6.9'
$walCheckpointThreshold = 67108864
$workerCount = 1
$actualVersion = (& npx --yes "gitnexus@$expectedVersion" --version).Trim()
if ($LASTEXITCODE -ne 0 -or $actualVersion -ne $expectedVersion) {
    throw "Expected GitNexus $expectedVersion but received [$actualVersion]."
}
& npx --yes "gitnexus@$expectedVersion" analyze --force --index-only --workers $workerCount --wal-checkpoint-threshold $walCheckpointThreshold
if ($LASTEXITCODE -ne 0) { throw 'GitNexus index refresh failed.' }
