/**
 * Décision du créateur sur une demande.
 * POST { email, decision: 'granted' | 'denied' }, en-tête Authorization.
 */
'use strict';

const kv = require('../_lib/kv');
const auth = require('../_lib/auth');
const { send, fail, onlyPost, readJson, normalizeEmail, looksLikeEmail } = require('../_lib/http');

const ALLOWED = ['granted', 'denied'];

module.exports = async (req, res) => {
  if (!onlyPost(req, res)) return;

  try {
    auth.requireCreator(req);

    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    const decision = String(body.decision || '');

    if (!looksLikeEmail(email)) {
      return send(res, 400, { ok: false, error: 'Adresse e-mail invalide.' });
    }
    if (ALLOWED.indexOf(decision) === -1) {
      return send(res, 400, { ok: false, error: 'Décision inconnue.' });
    }

    const record = await kv.get(email);
    if (!record) {
      return send(res, 404, { ok: false, error: 'Aucune demande pour cette adresse.' });
    }

    record.status = decision;
    record.updatedAt = new Date().toISOString();
    await kv.put(email, record);

    send(res, 200, { ok: true, status: decision });
  } catch (err) {
    fail(res, err);
  }
};
