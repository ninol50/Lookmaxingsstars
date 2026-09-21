/**
 * Demande d'accès par un acheteur.
 * POST { email, order }
 *
 * On enregistre la demande en attente. La décision revient au créateur :
 * cette route ne peut jamais accorder un accès par elle-même.
 */
'use strict';

const kv = require('../_lib/kv');
const { send, fail, onlyPost, readJson, normalizeEmail, looksLikeEmail, clientKey } = require('../_lib/http');

module.exports = async (req, res) => {
  if (!onlyPost(req, res)) return;

  try {
    // 20 demandes par heure et par IP : large pour un acheteur, étroit pour
    // quelqu'un qui tenterait d'inonder la file d'attente.
    const count = await kv.hits(`request:${clientKey(req)}`, 3600);
    if (count > 20) {
      return send(res, 429, { ok: false, error: 'Trop de demandes. Réessaie dans une heure.' });
    }

    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    const order = String(body.order || '').trim().slice(0, 40);

    if (!looksLikeEmail(email)) {
      return send(res, 400, { ok: false, error: 'Adresse e-mail invalide.' });
    }

    const existing = await kv.get(email);

    // Une demande déjà tranchée n'est pas réinitialisée par un nouvel envoi :
    // sinon un acheteur refusé pourrait repasser en attente à volonté.
    if (existing && existing.status !== 'pending') {
      return send(res, 200, { ok: true, status: existing.status, already: true });
    }

    await kv.put(email, {
      email,
      order,
      status: 'pending',
      requestedAt: existing ? existing.requestedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    send(res, 200, { ok: true, status: 'pending', already: Boolean(existing) });
  } catch (err) {
    fail(res, err);
  }
};
