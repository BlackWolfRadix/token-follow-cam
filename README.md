# Token Follow Cam

Módulo para **Foundry VTT v13**: a câmera **segue o token controlado** enquanto
ele se move — WASD, setas ou arrasto — mantendo-o **centralizado na tela**,
acompanhando a animação do movimento quadro a quadro (nada de a câmera ficar
para trás).

## Instalação (desenvolvimento)

```
mklink /D "C:\Users\<voce>\AppData\Local\FoundryVTT\Data\modules\token-follow-cam" "C:\Users\<voce>\Desktop\token-follow-cam"
```

## Como funciona

- Controle um token e ande com WASD/setas: a câmera trava no centro dele
  durante todo o trajeto e para quando ele chega.
- Só segue movimentos **iniciados por você** em tokens que **você controla** —
  o GM mover o token de um jogador não sequestra a câmera do jogador.
- **Setting por cliente** ("Seguir o token controlado") para ligar/desligar, e
  um **atalho de teclado opcional** de toggle (sem tecla padrão — atribua em
  Configurar Controles).
- Agnóstico de sistema, sem dependências, um único arquivo de script.

## Notas

- A câmera **persegue com suavização** (ajustável na setting "Suavidade da
  câmera": maior = deslize mais macio, 0 = pulo instantâneo). Zoom com a
  rolagem continua livre durante o seguimento.
- Ao soltar o token, trocar de cena ou deletá-lo, o seguimento se encerra
  sozinho.
