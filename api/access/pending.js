/**
 * Liste des demandes d'accès, pour l'espace créateur.
 * POST, en-tête Authorization: Bearer <jeton>
 */
'use strict';

const kv = require('../_lib/kv');
const auth = require('../_lib/auth');
const { send, fail, onlyPost } = require('../_lib/http');

module.exports = async (req, res) => {
  if (!onlyPost(req, res)) return;

  try {
    auth.requireCreator(req);
    send(res, 200, { ok: true, requests: await kv.all() });
  } catch (err) {
    fail(res, err);
  }
};
