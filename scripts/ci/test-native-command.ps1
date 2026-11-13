# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'native-command.ps1')

$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('assistencialize-command-' + [guid]::NewGuid())
New-Item $testRoot -ItemType Directory | Out-Null
try {
    $child = Join-Path $testRoot 'child with spaces.ps1'
    $log = Join-Path $testRoot 'build.log'
    @'
param([string] $Message, [int] $Code)
[Console]::Out.WriteLine("stdout: $Message")
[Console]::Error.WriteLine("stderr: $Message")
exit $Code
'@ | Set-Content -LiteralPath $child
    $pwsh = (Get-Process -Id $PID).Path
    # The helper must preserve errors even when the caller enables this option.
    $PSNativeCommandUseErrorActionPreference = $true
    Invoke-LoggedCommand $pwsh @('-NoProfile', '-File', $child, 'first output', '0') $log
    $caught = $null
    try {
        Invoke-LoggedCommand $pwsh @('-NoProfile', '-File', $child, 'failure details', '23') $log
    } catch { $caught = $_ }
    if (!$caught -or $caught.Exception.Message -notlike '*failed (23)*') {
        throw 'The native failure code was lost or the command incorrectly succeeded'
    }
    # A subsequent successful command must not reuse the previous failure code.
    Invoke-LoggedCommand $pwsh @('-NoProfile', '-File', $child, 'last output', '0') $log
    $contents = Get-Content -LiteralPath $log -Raw
    foreach ($expected in @('stdout: first output', 'stderr: first output',
        'stdout: failure details', 'stderr: failure details', '< exit code: 23',
        'stdout: last output', 'stderr: last output')) {
        if (!$contents.Contains($expected)) { throw "Missing command output in log: $expected" }
    }
    Write-Host 'Native command logging checks passed.'
} finally { Remove-Item -LiteralPath $testRoot -Recurse -Force }
