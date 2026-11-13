# Workspaces e sessões do Assistencialize

Implementação em desenvolvimento; não validada em um navegador compilado.

Cada workspace normal recebe um contêiner Firefox exclusivo, persistido localmente por UUID. Renomear o workspace ou abrir outra janela mantém o contêiner. IDs de contêiner vindos de sincronização não são considerados IDs locais. Os mecanismos de originAttributes do Firefox separam cookies e armazenamento de sites, incluindo sessões de WhatsApp Web. Não são perfis completos: histórico, favoritos, senhas salvas e extensões continuam sendo recursos do perfil do navegador.

Abas novas, links externos e rotas passam pela associação workspace/contêiner no addTab. Trocas manuais do contêiner do workspace são bloqueadas. Mover abas autenticadas entre contêineres é rejeitado; abra a URL no destino e autentique novamente. Não se deve alterar apenas o atributo usercontextid de uma aba viva.

Na migração de estados salvos de outro contêiner, preservam-se URLs, títulos, posição do histórico e fixação; dados de formulário, POST e armazenamento de sessão não são transplantados. Isso exige novos logins e pode descartar formulários não enviados do estado antigo. Contêineres não são apagados automaticamente com o workspace, para evitar apagar sessões ainda utilizadas em outras janelas.

Janelas privadas mantêm a semântica privada herdada; esta implementação não promete um contêiner exclusivo por workspace privado. Restauração de abas fechadas, adoção entre janelas, Glance, split view, essenciais, extensões e inicialização com links externos ainda precisam de testes no engine real. Não distribuir esta implementação como isolamento garantido antes desses testes.

Layout: botões dos workspaces na sidebar; elementos reais das abas no header, junto aos controles nativos. CSS é limitado ao atributo assistencialize-header-tabs. O código de geometria do Zen ainda usa hipóteses de abas verticais: arrastar, overflow, teclado, modos compacto/tela cheia e personalização precisam de validação/adaptação no Windows; macOS também precisa de compilação e revisão visual. A preferência assistencialize.workspaces.header-tabs pode ser desativada antes da inicialização para comparar o layout original.

## Verificações

Executado no ambiente Linux:

```
node --test scripts/assistencialize-isolation.test.mjs scripts/assistencialize-branding.test.mjs
```

Teste de integração preparado, ainda NÃO executado (engine indisponível):

```
npm test -- spaces/browser_assistencialize_isolation.js
```

Esse teste abre o mesmo domínio em dois workspaces e verifica cookies, localStorage, retorno à primeira sessão, bloqueio de movimentação e posicionamento dos elementos. A validação manual Windows deve incluir dois logins reais em web.whatsapp.com, reinício do navegador, múltiplas janelas e reconexão. Os limites de dispositivos vinculados são os definidos pelo WhatsApp.

Bloqueio atual: o proxy retorna HTTP 403 para archive.mozilla.org; não há engine, executável nem instalador disponível para rodar os testes funcionais.

## Adaptacao de componentes preservando o tema Zen

O seletor usa os mesmos botoes, icones, estados de selecao e dimensoes do Zen, em coluna na sidebar. O rodape continua na sidebar. As abas reais do workspace ativo ficam em uma faixa no topo da area principal, junto aos controles nativos. Nenhuma copia de aba e criada para representar a interface.

Foram removidos os tamanhos arbitrarios da primeira implementacao (42/36px e larguras de 100/220px), a mudanca do espacamento dos botoes e a forcagem de botoes de fechar. O CSS adicional trata da disposicao dos containers; cores, bordas, sombras, fontes e dimensoes usam as regras e variaveis existentes do Zen. A orientacao horizontal e aplicada tambem ao tabbrowser, para o codigo nativo reconhecer o eixo de teclado/arraste, e reaplicada apos o startup.

A implementacao conserva a posicao original dos elementos e seus atributos de orientacao para restaurar o modo anterior. Novos workspaces recebem a orientacao do layout. A sincronizacao de sessoes e a politica de cookies nao foram redesenhadas nesta etapa; as limitacoes da revisao arquitetural ainda precisam ser resolvidas.

Teste adicionado: `zen/tests/spaces/browser_assistencialize_layout.js`. Compara propriedades visuais antes/depois, verifica os mesmos elementos, sua posicao, orientacao, troca de workspace e restauracao ao desativar a opcao. O workflow executa esse teste no Firefox compilado antes de empacotar. Ainda nao foi executado localmente, pois o engine nao esta disponivel aqui. A equivalencia visual precisa da execucao no Windows e de revisao de DPI/modo compacto/macOS.
