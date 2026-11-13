# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.

function Invoke-LoggedCommand([string] $Program, [string[]] $Arguments, [string] $LogPath) {
    # Capture native stdout/stderr explicitly: Start-Transcript alone can miss
    # output written directly to the console by npm, Surfer and mach.
    # Check the native exit code ourselves, after all output has been flushed.
    $PSNativeCommandUseErrorActionPreference = $false
    "> $Program $($Arguments -join ' ')" | Tee-Object -FilePath $LogPath -Append | Out-Host
    & $Program @Arguments 2>&1 | Tee-Object -FilePath $LogPath -Append | Out-Host
    $exitCode = $LASTEXITCODE
    "< exit code: $exitCode" | Tee-Object -FilePath $LogPath -Append | Out-Host
    if ($exitCode -ne 0) { throw "$Program failed ($exitCode): $Arguments" }
}
