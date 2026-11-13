# Assistencialize

Navegador independente baseado em Zen Browser e Mozilla Firefox, sob MPL-2.0.
Plataformas pretendidas: Windows e macOS. Testes funcionais: Windows.

## Estado atual

Base estável importada; nome, vendor, executável, perfil e identificação de distribuição personalizados. Textos das traduções atualizados sem renomear APIs internas `zen.*`. Avisos de licença e autoria preservados; consulte [UPSTREAM.md](UPSTREAM.md).

Esta é uma base de desenvolvimento, não um navegador compilado ou pronto para distribuição. Os ícones e logotipos herdados ainda precisam ser substituídos antes da distribuição. Serviços externos herdados (Mods, compartilhamento e outros) precisam de auditoria e decisão de produto; não há promessa de operação desses serviços pelo Assistencialize.

O atualizador binário foi desativado nas configurações comuns. O host `.invalid` é intencional e não deve ser usado para distribuição. O pós-import corrige os links que o Surfer gera para o Zen. Não usar instalador stub; o fork ainda não possui infraestrutura de download, assinatura ou atualização.

## Desenvolvimento

Use o checkout existente; não crie worktrees para configuração do ambiente.

1. Use Node.js 22 (ver `.nvmrc`) e a versão Rust de `rust-toolchain.toml`.
2. Execute `npm ci`.
3. Verifique as alterações de marca: `node --test scripts/assistencialize-branding.test.mjs`.
4. Consulte as instruções oficiais de compilação: https://docs.zen-browser.app/guides/building
5. Em uma máquina com toolchain da plataforma e espaço suficiente: `npm run download`, `npm run bootstrap`, `npm run import`. O último comando gera os prefs Rust, importa patches e executa o pós-import Assistencialize.
6. Configure a marca com `npx surfer config brand release` e o modo com `npx surfer config buildMode dev`.
7. Compile com `npm run build -- --jobs 4`, inicie com `npm start` e use `npm test` para os testes herdados.
8. Somente após validar a identidade, gerar ícones próprios e testar no Windows, use `npm run package` para gerar o pacote completo.

Esses passos de compilação ainda precisam ser validados no Windows e macOS. O teste Node valida apenas o pós-import da marca. A instalação npm e a leitura da configuração Surfer foram verificadas no ambiente Linux; o engine não foi baixado e nenhum binário foi gerado.

## Windows e macOS

Windows: preparar MozillaBuild/toolchain Firefox, Python, Rust e 7-Zip conforme documentação oficial; testar instalação, perfil isolado, abas, navegação, downloads, configurações e desinstalação.

macOS: compilar em máquina macOS com Xcode/SDK compatível e GNU tar. A validação funcional não faz parte desta primeira etapa. Assinatura e notarização exigem configuração própria antes de distribuição pública.

Os workflows originais foram arquivados em `docs/upstream-github`; nenhum deles publica releases automaticamente.

## Workspaces isolados e abas no header

Primeira implementação experimental em [docs/ASSISTENCIALIZE-WORKSPACES.md](docs/ASSISTENCIALIZE-WORKSPACES.md). Execute `npm run test:assistencialize` para os testes Node. Integração no engine e validação visual Windows pendentes; não tratar como garantia de isolamento em uma versão distribuível.
