/**
 * Consultation de l'état d'une demande par l'acheteur.
 * POST { email }
 *
 * Renvoie uniquement l'état de l'adresse fournie, jamais la liste complète.
 */
'use strict';

const kv = require('../_lib/kv');
const { send, fail, onlyPost, readJson, normalizeEmail, looksLikeEmail, clientKey } = require('../_lib/http');

module.exports = async (req, res) => {
  if (!onlyPost(req, res)) return;

  try {
    // Limite le balayage d'adresses pour deviner qui a acheté.
    const count = await kv.hits(`status:${clientKey(req)}`, 3600);
    if (count > 60) {
      return send(res, 429, { ok: false, error: 'Trop de requêtes. Réessaie plus tard.' });
    }

    const body = await readJson(req);
    const email = normalizeEmail(body.email);

    if (!looksLikeEmail(email)) {
      return send(res, 400, { ok: false, error: 'Adresse e-mail invalide.' });
    }

    const record = await kv.get(email);
    send(res, 200, { ok: true, status: record ? record.status : 'none' });
  } catch (err) {
    fail(res, err);
  }
};
