/**
 * Authentification de l'espace créateur.
 *
 * Le code d'accès n'est JAMAIS envoyé au navigateur : il vit dans la variable
 * d'environnement CREATOR_PASSCODE et n'est comparé que côté serveur. Un code
 * écrit dans la page serait lisible par n'importe quel visiteur via le code
 * source, ce qui reviendrait à ne pas en avoir.
 *
 * Après vérification, le serveur délivre un jeton signé (HMAC-SHA256) valable
 * quelques heures. Le jeton ne contient aucun secret réutilisable.
 */
'use strict';

const crypto = require('crypto');

const TOKEN_TTL_SECONDS = 6 * 3600;
const MIN_PASSCODE_LENGTH = 12;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    const err = new Error(
      `Configuration manquante : renseigner ${name} dans les variables ` +
      'd\'environnement du projet.'
    );
    err.statusCode = 503;
    throw err;
  }
  return value;
}

/** Comparaison à durée constante : évite de révéler le code par le timing. */
function sameSecret(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function checkPasscode(candidate) {
  const expected = requireEnv('CREATOR_PASSCODE');

  if (expected.length < MIN_PASSCODE_LENGTH) {
    const err = new Error(
      `CREATOR_PASSCODE fait ${expected.length} caractères. En dessous de ` +
      `${MIN_PASSCODE_LENGTH}, il se devine par force brute en quelques ` +
      'minutes : l\'espace créateur reste fermé tant qu\'il n\'est pas rallongé.'
    );
    err.statusCode = 503;
    throw err;
  }

  return sameSecret(candidate || '', expected);
}

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function sign(payload) {
  const secret = requireEnv('CREATOR_SECRET');
  const body = b64url(JSON.stringify(payload));
  const mac = b64url(crypto.createHmac('sha256', secret).update(body).digest());
  return `${body}.${mac}`;
}

function issueToken() {
  return sign({ exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS });
}

function verifyToken(token) {
  if (typeof token !== 'string' || token.indexOf('.') === -1) return false;

  const secret = requireEnv('CREATOR_SECRET');
  const [body, mac] = token.split('.');
  const expected = b64url(crypto.createHmac('sha256', secret).update(body).digest());

  if (!sameSecret(mac, expected)) return false;

  try {
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch (e) {
    return false;
  }
}

/** Lit le jeton dans l'en-tête Authorization: Bearer <jeton>. */
function tokenFrom(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function requireCreator(req) {
  if (!verifyToken(tokenFrom(req))) {
    const err = new Error('Session créateur expirée ou absente.');
    err.statusCode = 401;
    throw err;
  }
}

module.exports = { checkPasscode, issueToken, requireCreator, TOKEN_TTL_SECONDS };
