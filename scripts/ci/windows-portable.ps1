# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
function Run([string] $Program, [string[]] $Arguments) {
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program failed ($LASTEXITCODE): $Arguments" }
}

Set-Location (Join-Path $PSScriptRoot '../..')
New-Item artifacts -ItemType Directory -Force | Out-Null
Start-Transcript -Path artifacts/build.log
try {
    # mach enforces a stricter source-root limit than Git's long-path support.
    $enginePath = [IO.Path]::GetFullPath((Join-Path (Get-Location) 'engine'))
    if ($enginePath.Length -gt 62) {
        throw "Caminho do engine tem $($enginePath.Length) caracteres; o Firefox no Windows aceita no maximo 62. Use uma pasta curta, como D:\az."
    }
    foreach ($required in @('configs/common/mozconfig', 'configs/windows/mozconfig')) {
        if (!(Test-Path -LiteralPath $required -PathType Leaf)) {
            throw "Configuracao obrigatoria ausente no checkout: $required"
        }
    }
    Run 'git' @('config', '--global', 'user.name', 'github-actions[bot]')
    Run 'git' @('config', '--global', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com')
    # Firefox has paths beyond the traditional Windows MAX_PATH limit.
    # Configure before Surfer creates and indexes the engine repository.
    Run 'git' @('config', '--global', 'core.longpaths', 'true')
    Run 'git' @('config', '--global', 'core.autocrlf', 'false')
    Run 'npm.cmd' @('ci', '--no-audit', '--no-fund')
    Run 'python' @('-m', 'pip', 'install', '-r', 'requirements.txt')
    Run 'npm.cmd' @('run', 'test:assistencialize')
    Run 'npm.cmd' @('run', 'download')
    # Surfer can report success even when its internal git add/commit failed.
    Run 'git' @('-C', 'engine', 'rev-parse', '--verify', 'HEAD^{commit}')
    $trackedFiles = @(& git -C engine ls-files --error-unmatch mach toolkit/moz.build)
    if ($LASTEXITCODE -ne 0 -or $trackedFiles.Count -ne 2) {
        throw 'O download terminou sem registrar os arquivos essenciais no Git do engine'
    }
    # Invoke mach directly to enforce noninteractive bootstrapping.
    Push-Location engine
    try { Run 'python' @('mach', '--no-interactive', 'bootstrap', '--application-choice', 'browser') }
    finally { Pop-Location }
    # The checked-in Rust toolchain is selected automatically by rustup.
    Run 'rustup' @('show', 'active-toolchain')
    Run 'npm.cmd' @('run', 'import')
    Run 'npx.cmd' @('--no-install', 'surfer', 'config', 'brand', 'release')
    Run 'npx.cmd' @('--no-install', 'surfer', 'config', 'buildMode', 'dev')
    # No release signing, PGO, LTO or stub installer is needed for local testing.
    @'
ac_add_options --disable-debug-symbols
ac_add_options --disable-crashreporter
ac_add_options --disable-lto
mk_add_options MOZ_MAKE_FLAGS="-j2"
'@ | Set-Content mozconfig -Encoding utf8NoBOM
    Run 'npm.cmd' @('run', 'build', '--', '--jobs', '2')
    Push-Location engine
    try {
        Run 'python' @('mach', '--no-interactive', 'test', '--headless', 'zen/tests/spaces/browser_assistencialize_layout.js')
        Run 'python' @('mach', 'package')
    }
    finally { Pop-Location }
    $archives = @(Get-ChildItem 'engine/obj-*/dist/*.zip')
    $packages = @($archives | Where-Object {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zip = [IO.Compression.ZipFile]::OpenRead($_.FullName)
        try { @($zip.Entries | Where-Object { $_.Name -eq 'assistencialize.exe' }).Count -eq 1 }
        finally { $zip.Dispose() }
    })
    if ($packages.Count -ne 1) { throw 'Nao foi encontrado exatamente um pacote Windows contendo assistencialize.exe' }
    $unpack = Join-Path $env:RUNNER_TEMP 'assistencialize-package'
    if (Test-Path $unpack) { throw "Diretorio temporario ja existe: $unpack" }
    Expand-Archive -LiteralPath $packages[0].FullName -DestinationPath $unpack
    $executables = @(Get-ChildItem $unpack -Recurse -Filter assistencialize.exe)
    if ($executables.Count -ne 1) { throw 'Distribuicao Windows ambigua' }
    Run 'python' @('scripts/package-portable.py', $executables[0].DirectoryName, 'artifacts/Assistencialize-Windows-x64-portatil.zip')
    $portable = Join-Path $env:RUNNER_TEMP 'assistencialize-portable-smoke'
    Expand-Archive artifacts/Assistencialize-Windows-x64-portatil.zip $portable
    $exe = Join-Path $portable 'Assistencialize/browser/assistencialize.exe'
    $profile = Join-Path $portable 'Assistencialize/profile'
    New-Item $profile -ItemType Directory | Out-Null
    $screenshot = Join-Path (Get-Location) 'artifacts/smoke.png'
    $process = Start-Process $exe -ArgumentList @('-headless', '-no-remote', '-profile', "`"$profile`"", '--screenshot', "`"$screenshot`"", 'about:blank') -PassThru
    if (!$process.WaitForExit(120000)) {
        Stop-Process -Id $process.Id -Force
        throw 'O executavel portatil nao encerrou o teste headless em 120 segundos'
    }
    if ($process.ExitCode -ne 0 -or !(Test-Path $screenshot)) { throw 'Falha ao iniciar o navegador portatil' }
    $hash = (Get-FileHash artifacts/Assistencialize-Windows-x64-portatil.zip -Algorithm SHA256).Hash
    "$hash  Assistencialize-Windows-x64-portatil.zip" | Set-Content artifacts/SHA256SUMS.txt
    @'
### Pacote experimental gerado
Baixe o artefato **Assistencialize-Windows-x64-portatil**. Extraia o ZIP de artefatos e depois o ZIP do navegador. Abra **Assistencialize-portatil.cmd** para usar o perfil separado; nao abra o exe diretamente. Nao requer instalacao.

O smoke test confirmou inicializacao headless, nao isolamento funcional ou funcionamento do WhatsApp. O executavel nao tem assinatura Authenticode e pode receber alerta do Windows. Nao ha publicacao de release neste workflow.
'@ >> $env:GITHUB_STEP_SUMMARY
}
finally { Stop-Transcript }
