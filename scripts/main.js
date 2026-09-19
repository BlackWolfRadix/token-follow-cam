/**
 * Token Follow Cam — a câmera segue o token controlado.
 *
 * Por padrão, mover um token com WASD/setas deixa a câmera parada e o token
 * "foge" da tela. Este módulo faz a câmera perseguir o token: quando um token
 * **controlado por este cliente** se move (movimento iniciado por este
 * usuário — teclado ou arrasto), um ticker aproxima a câmera do centro de
 * DESTINO do token com **suavização exponencial** por frame
 * (`pivot + (alvo - pivot) * k`, `k = 1 - e^(-dt/suavidade)`).
 *
 * Por que perseguir o destino, e não a posição "animada"? No v13,
 * `token.center` deriva do documento — que já contém o destino no instante do
 * `updateToken` — então travar a câmera nele TELEPORTA a tela na frente do
 * token. A perseguição suavizada desliza até lá no mesmo ritmo da animação do
 * token, sem depender de internals de animação, e com teclas seguradas o alvo
 * vai andando e a câmera segue colada. O ticker se desliga sozinho quando a
 * câmera assenta no alvo.
 *
 * Decisões:
 * - Segue só o que EU movi e estou controlando (o GM arrastando o token de um
 *   jogador não sequestra a câmera do jogador).
 * - Suavidade configurável por cliente (ms; 0 = pan instantâneo ao destino).
 * - Setting de cliente para ligar/desligar + keybinding opcional de toggle
 *   (sem tecla padrão — o usuário escolhe em Configurar Controles).
 *
 * Foundry v13 exclusivamente; sem dependências; ES Module único.
 *
 * @module token-follow-cam
 */

const MODULE_ID = "token-follow-cam";

/** Chave da setting (client) que liga/desliga o seguimento. */
const SETTING_ENABLED = "enabled";

/** Chave da setting (client) da suavidade da câmera (ms; 0 = instantâneo). */
const SETTING_SMOOTHING = "smoothing";

/** Id do token sendo seguido, ou `null`. @type {string|null} */
let followTokenId = null;

/** Se o ticker de seguimento está instalado. */
let tickerActive = false;

/**
 * Centro de DESTINO do token (do documento — o alvo do movimento), em pixels
 * do mundo.
 * @param {TokenDocument} doc
 * @returns {{x: number, y: number}}
 */
function documentCenter(doc) {
  const gs = doc.parent?.grid?.size ?? canvas?.dimensions?.size ?? 100;
  return {
    x: doc.x + (doc.width * gs) / 2,
    y: doc.y + (doc.height * gs) / 2
  };
}

/**
 * Um frame de seguimento: desliza a câmera em direção ao centro de destino do
 * token (suavização exponencial — independente do framerate) e desliga quando
 * assenta (ou se o token sumir/for solto).
 * @returns {void}
 */
function followFrame() {
  const token = followTokenId ? canvas.tokens?.get(followTokenId) : null;
  if (!token || token.destroyed || !token.controlled) {
    stopFollowing();
    return;
  }

  const target = documentCenter(token.document);
  const pivot = canvas.stage.pivot;
  const smoothing = game.settings.get(MODULE_ID, SETTING_SMOOTHING);

  let x;
  let y;
  if (smoothing <= 0) {
    x = target.x;
    y = target.y;
  } else {
    // Fração do caminho percorrida NESTE frame, estável em qualquer framerate.
    const dt = canvas.app.ticker.deltaMS;
    const k = 1 - Math.exp(-dt / smoothing);
    x = pivot.x + (target.x - pivot.x) * k;
    y = pivot.y + (target.y - pivot.y) * k;
  }
  canvas.pan({ x, y });

  if (Math.hypot(target.x - x, target.y - y) < 1) stopFollowing();
}

/**
 * Começa a seguir um token (idempotente; trocar de token só re-aponta).
 * @param {Token} token
 * @returns {void}
 */
function startFollowing(token) {
  followTokenId = token.id;
  if (!tickerActive && canvas?.app?.ticker) {
    tickerActive = true;
    canvas.app.ticker.add(followFrame);
  }
}

/**
 * Para de seguir (idempotente).
 * @returns {void}
 */
function stopFollowing() {
  if (tickerActive) canvas?.app?.ticker?.remove(followFrame);
  tickerActive = false;
  followTokenId = null;
}

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | init`);

  game.settings.register(MODULE_ID, SETTING_ENABLED, {
    name: "TOKENFOLLOWCAM.Settings.Enabled.Name",
    hint: "TOKENFOLLOWCAM.Settings.Enabled.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      if (!value) stopFollowing();
    }
  });

  game.settings.register(MODULE_ID, SETTING_SMOOTHING, {
    name: "TOKENFOLLOWCAM.Settings.Smoothing.Name",
    hint: "TOKENFOLLOWCAM.Settings.Smoothing.Hint",
    scope: "client",
    config: true,
    type: Number,
    default: 150,
    range: { min: 0, max: 500, step: 25 }
  });

  // Toggle rápido (sem tecla padrão — configure em "Configurar Controles").
  game.keybindings.register(MODULE_ID, "toggleFollow", {
    name: "TOKENFOLLOWCAM.Keybind.Toggle",
    hint: "TOKENFOLLOWCAM.Keybind.ToggleHint",
    editable: [],
    onDown: () => {
      const next = !game.settings.get(MODULE_ID, SETTING_ENABLED);
      game.settings.set(MODULE_ID, SETTING_ENABLED, next);
      ui.notifications?.info(
        game.i18n.localize(
          next ? "TOKENFOLLOWCAM.Notifications.On" : "TOKENFOLLOWCAM.Notifications.Off"
        )
      );
      return true;
    },
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
  });

  // O gatilho: um token que EU controlo se moveu, num update iniciado por MIM
  // (teclado ou arrasto). Segue até a chegada.
  Hooks.on("updateToken", (doc, changed, _options, userId) => {
    if (userId !== game.user.id) return;
    if (!("x" in changed) && !("y" in changed)) return;
    if (game.settings.get(MODULE_ID, SETTING_ENABLED) !== true) return;
    if (doc.parent?.id !== canvas.scene?.id) return;
    const token = doc.object;
    if (!token?.controlled) return;
    startFollowing(token);
  });

  // Higiene: troca de cena, soltar o token ou deletá-lo encerram o seguimento.
  Hooks.on("canvasReady", () => stopFollowing());
  Hooks.on("controlToken", (token, controlled) => {
    if (!controlled && token.id === followTokenId) stopFollowing();
  });
  Hooks.on("deleteToken", (doc) => {
    if (doc.id === followTokenId) stopFollowing();
  });
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | ready`);
});
