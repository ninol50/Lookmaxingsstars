/**
 * Ouverture d'une session créateur.
 * POST { passcode }
 *
 * Le code est comparé côté serveur contre CREATOR_PASSCODE et n'est jamais
 * exposé au navigateur. En cas de succès, un jeton signé de courte durée est
 * délivré ; c'est lui qui autorise les routes de décision.
 */
'use strict';

const kv = require('../_lib/kv');
const auth = require('../_lib/auth');
const { send, fail, onlyPost, readJson, clientKey } = require('../_lib/http');

module.exports = async (req, res) => {
  if (!onlyPost(req, res)) return;

  try {
    // 10 tentatives par heure et par IP. Sans cette limite, un code court se
    // devine en quelques minutes.
    const count = await kv.hits(`login:${clientKey(req)}`, 3600);
    if (count > 10) {
      return send(res, 429, { ok: false, error: 'Trop de tentatives. Réessaie dans une heure.' });
    }

    const body = await readJson(req);

    if (!auth.checkPasscode(body.passcode)) {
      return send(res, 401, { ok: false, error: 'Code incorrect.' });
    }

    send(res, 200, { ok: true, token: auth.issueToken(), expiresIn: auth.TOKEN_TTL_SECONDS });
  } catch (err) {
    fail(res, err);
  }
};
