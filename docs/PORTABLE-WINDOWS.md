# Pacote portátil Windows

Ainda não há um exe compilado: o engine Firefox não está disponível neste ambiente. O script abaixo apenas empacota uma compilação Windows existente do Assistencialize. Não converte Linux em Windows nem modifica um Zen já instalado.

Após compilar e gerar a distribuição completa no Windows:

```powershell
python scripts/package-portable.py C:\build\dist\assistencialize C:\artifacts\Assistencialize-portatil.zip
```

Extraia o ZIP e execute `Assistencialize-portatil.cmd`. O launcher chama `browser/assistencialize.exe` com `-no-remote -profile` para manter o perfil de teste ao lado do navegador, separado do perfil instalado. Abrir o exe diretamente não aplica esses argumentos.

Não é um instalador nem um pacote PortableApps certificado. Temporários, caches do sistema, integrações de protocolos e registros locais ainda precisam ser verificados no Windows. O pacote herda o estado experimental do código: isolamento e layout não foram validados em um navegador compilado. Não distribuir como release estável.

Para testar duas contas WhatsApp: criar dois workspaces, autenticar um login em cada, alternar entre eles, fechar o aplicativo e reabrir pelo launcher. Verificar também que o perfil da instalação existente não foi alterado.

## GitHub Actions

O workflow `.github/workflows/windows-portable.yml` permite tentar a compilação nativa Windows x64 sem publicar release e sem secrets específicos do Zen. O resultado depende da primeira execução bem-sucedida; o workflow ainda não foi executado no GitHub.

1. Envie este código, incluindo o workflow, para a branch padrão do seu repositório. Se o repositório estiver vazio, aplique o patch completo à base Zen indicada em BASE.txt antes de enviar os arquivos. O patch incremental de CI pressupõe que a base Assistencialize anterior já foi aplicada.
2. No GitHub, abra **Actions → Assistencialize - Windows portatil → Run workflow**.
3. O runner padrão é `windows-2025`. A compilação integral pode exigir um runner Windows x64 maior, com pelo menos 50 GiB de disco livre e 16 GiB RAM; o workflow falha cedo se o disco não for suficiente. O limite de execução é de seis horas, não uma estimativa de duração.
4. Em caso de sucesso, baixe o artefato `Assistencialize-Windows-x64-portatil-<número>`. Extraia o ZIP de artefatos e o ZIP interno; abra `Assistencialize-portatil.cmd`. O exe está dentro de `browser/`, mas abrir diretamente ignora o perfil portátil.
5. Em caso de falha, baixe `Windows-build-logs-<número>` para diagnóstico. `build.log` captura stdout, stderr e o código de saída de cada comando; `transcript.log` guarda a transcrição do PowerShell separadamente. Nenhum ZIP portátil é enviado se compilação, empacotamento ou smoke test falhar.

O smoke test headless confirma apenas a inicialização do exe. Ainda são necessários os testes funcionais de workspaces e WhatsApp no Windows. O pacote é experimental e não assinado; o workflow não ignora validação TLS, não assina com credenciais herdadas e não publica release. A execução usa minutos e recursos do seu GitHub Actions conforme o plano/runner escolhido.

### Novas execucoes por push

Uma alteracao de `.github/portable-build-request.txt` enviada a `main` solicita uma execucao nova, usando o codigo desse push. O gatilho e limitado a esse arquivo; outros pushes nao iniciam builds automaticamente. O acionamento manual em Actions continua disponivel. Para pushes, o runner padrao e `windows-2025`.

O workflow copia o checkout para uma pasta curta `az` na raiz do disco de trabalho (por exemplo, `D:\az`). O engine passa a ficar em `D:\az\engine`, dentro do limite de 62 caracteres imposto pelo Firefox no Windows. Logs e ZIP sao enviados dessa pasta curta; o checkout original continua disponivel para o cache npm e limpeza do GitHub Actions.
