/**
 * Stockage des demandes d'accès.
 *
 * Utilise l'API REST d'un Redis compatible Upstash : deux variables
 * d'environnement, aucune dépendance npm, fonctionne tel quel sur une
 * fonction Vercel.
 *
 * Si les variables ne sont pas configurées, chaque appel échoue bruyamment.
 * C'est volontaire : un stockage muet ferait croire que les accès sont
 * enregistrés alors qu'ils seraient perdus.
 */
'use strict';

const URL_VAR = 'UPSTASH_REDIS_REST_URL';
const TOKEN_VAR = 'UPSTASH_REDIS_REST_TOKEN';

function config() {
  const url = process.env[URL_VAR];
  const token = process.env[TOKEN_VAR];
  if (!url || !token) {
    const err = new Error(
      `Stockage non configuré : renseigner ${URL_VAR} et ${TOKEN_VAR} ` +
      'dans les variables d\'environnement du projet.'
    );
    err.statusCode = 503;
    throw err;
  }
  return { url: url.replace(/\/+$/, ''), token };
}

async function command(args) {
  const { url, token } = config();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args)
  });

  if (!res.ok) {
    const err = new Error(`Stockage indisponible (HTTP ${res.status}).`);
    err.statusCode = 502;
    throw err;
  }

  const payload = await res.json();
  if (payload && payload.error) {
    const err = new Error(`Stockage : ${payload.error}`);
    err.statusCode = 502;
    throw err;
  }
  return payload ? payload.result : null;
}

/** Clé d'un enregistrement d'accès, normalisée sur l'e-mail. */
const key = (email) => `access:${email}`;

async function put(email, record) {
  await command(['SET', key(email), JSON.stringify(record)]);
  await command(['SADD', 'access:index', email]);
}

async function get(email) {
  const raw = await command(['GET', key(email)]);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

async function all() {
  const emails = (await command(['SMEMBERS', 'access:index'])) || [];
  if (!emails.length) return [];

  const raws = await command(['MGET', ...emails.map(key)]);
  return emails
    .map((email, i) => {
      try { return JSON.parse(raws[i]); } catch (e) { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)));
}

/** Compteur à fenêtre glissante, pour limiter les tentatives. */
async function hits(bucket, windowSeconds) {
  const count = await command(['INCR', `rate:${bucket}`]);
  if (count === 1) await command(['EXPIRE', `rate:${bucket}`, String(windowSeconds)]);
  return count;
}

module.exports = { put, get, all, hits };
