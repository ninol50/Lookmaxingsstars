/** Petits utilitaires partagés par les fonctions d'API. */
'use strict';

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function fail(res, err) {
  const status = err && err.statusCode ? err.statusCode : 500;
  // Les messages d'erreur de configuration sont utiles à l'exploitant ;
  // au-delà, on ne détaille pas le fonctionnement interne.
  const message = status === 500 ? 'Erreur interne.' : err.message;
  if (status === 500) console.error('[api]', err);
  send(res, status, { ok: false, error: message });
}

function onlyPost(req, res) {
  if (req.method === 'POST') return true;
  res.setHeader('Allow', 'POST');
  send(res, 405, { ok: false, error: 'Méthode non autorisée.' });
  return false;
}

/** Vercel parse déjà le JSON ; ce repli couvre les appels bruts. */
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) { return {}; }
}

/**
 * Normalise une adresse pour que la comparaison avec l'e-mail de la commande
 * Shopify ne dépende pas de la casse ni des espaces collés.
 */
function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

/** Validation volontairement simple : on vérifie la forme, pas l'existence. */
function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** Identifiant d'appelant pour la limitation de débit. */
function clientKey(req) {
  const forwarded = req.headers['x-forwarded-for'] || '';
  return String(forwarded).split(',')[0].trim() || 'inconnu';
}

module.exports = { send, fail, onlyPost, readJson, normalizeEmail, looksLikeEmail, clientKey };
