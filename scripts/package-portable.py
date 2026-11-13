#!/usr/bin/env python3
"""Package an existing Windows build; this script does not compile Firefox."""
import argparse
import configparser
from pathlib import Path
import zipfile

LAUNCHER = r'''@echo off
setlocal
cd /d "%~dp0"
if not exist "browser\assistencialize.exe" (
  echo Compilacao Windows do Assistencialize ausente.
  pause
  exit /b 1
)
if not exist "profile" mkdir "profile"
start "" /wait "browser\assistencialize.exe" -no-remote -profile "%~dp0profile" %*
'''


def package(source, output):
    source, output = Path(source).resolve(), Path(output).resolve()
    binary = source / 'assistencialize.exe'
    if not binary.is_file():
        raise ValueError('Informe a pasta da compilacao Windows contendo assistencialize.exe, nao um instalador.')
    with binary.open('rb') as stream:
        if stream.read(2) != b'MZ':
            raise ValueError('O executavel nao possui cabecalho Windows PE.')
        stream.seek(0x3C)
        offset = stream.read(4)
        if len(offset) != 4:
            raise ValueError('Cabecalho PE incompleto.')
        stream.seek(int.from_bytes(offset, 'little'))
        if stream.read(4) != b'PE\0\0':
            raise ValueError('Assinatura Windows PE ausente.')
    app = configparser.ConfigParser(interpolation=None)
    app.read(source / 'application.ini', encoding='utf-8')
    if app.get('App', 'Name', fallback='') != 'Assistencialize':
        raise ValueError('application.ini nao identifica esta compilacao como Assistencialize.')
    if not (source / 'xul.dll').is_file():
        raise ValueError('xul.dll ausente: forneca a distribuicao completa, nao apenas o exe.')
    if source == output or source in output.parents:
        raise ValueError('O ZIP deve ficar fora da pasta de origem.')
    files = sorted(p for p in source.rglob('*') if p.is_file())
    if any(p.is_symlink() or source not in p.resolve().parents for p in files):
        raise ValueError('Links simbolicos nao sao aceitos no pacote.')
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            archive.write(path, Path('Assistencialize/browser') / path.relative_to(source))
        archive.writestr('Assistencialize/Assistencialize-portatil.cmd', LAUNCHER.replace('\n', '\r\n'))
        archive.writestr('Assistencialize/LEIA-ME.txt',
            'Extraia todo o ZIP e abra Assistencialize-portatil.cmd.\r\n'
            'O executavel real fica em browser/assistencialize.exe.\r\n'
            'O perfil fica em profile/ ao lado do launcher; proteja esta pasta.\r\n'
            'O perfil inclui logins. Nao o compartilhe. Feche o navegador antes de mover a pasta.\r\n'
            'Build experimental sem garantia de ausencia de arquivos temporarios fora desta pasta.\r\n')
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('distribution', help='Pasta da distribuicao Windows ja compilada')
    parser.add_argument('output', help='Caminho do ZIP final')
    args = parser.parse_args()
    try:
        print(package(args.distribution, args.output))
    except (ValueError, OSError) as error:
        parser.exit(1, f'Erro: {error}\n')
