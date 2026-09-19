# Token Follow Cam (`token-follow-cam`)

Micro-módulo do Foundry VTT: a câmera segue o token controlado durante o
movimento (WASD/setas/arrasto), centralizado, quadro a quadro.

## Regras do projeto

Mesmas convenções dos módulos irmãos do autor (core-fnaf/fnaf-cameras/
fnaf-minigames): **Foundry v13 exclusivamente**, sem bundler/deps, ESM nativo,
JSDoc pt-BR com identificadores/i18n em inglês. i18n no namespace próprio
`TOKENFOLLOWCAM.*` (sem risco de colisão com os irmãos `FNAF.*`).

## Arquitetura (decisões)

- **Um arquivo** (`scripts/main.js`). Gatilho: hook `updateToken` com
  `userId === game.user.id` (só movimento iniciado por MIM) + `token.controlled`
  + setting ligada + cena vista.
- **Perseguição suavizada por ticker** (`canvas.app.ticker`): a cada frame,
  `canvas.pan` para `pivot + (alvo - pivot) * k`, com
  `k = 1 - e^(-deltaMS/suavidade)` (estável em qualquer framerate) e alvo =
  centro de DESTINO do documento. **Armadilha aprendida**: `token.center` no
  v13 deriva do documento, que já contém o destino no instante do
  `updateToken` — travar a câmera nele teleporta a tela na frente do token; a
  perseguição do destino com suavização é que dá o acompanhamento macio, sem
  depender de internals de animação. Desliga quando assenta (< 1px), ao
  soltar/deletar o token, na troca de cena ou desligando a setting.
- Movimentos encadeados (segurar a tecla) reutilizam o mesmo ticker.
- Settings (client): `enabled` e `smoothing` (ms; 0 = instantâneo; default
  150) + keybinding de toggle sem tecla padrão.

## Testes

- Symlink `Data/modules/token-follow-cam` (pasta = id). F5 para recarregar.
- Testar: WASD segurado (trajeto contínuo), arrasto longo, soltar o token no
  meio do movimento, trocar de cena no meio, e a setting desligada.
