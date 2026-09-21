/**
 * Multilingue.
 *
 * Le français est la langue source : les valeurs de `fr.json` sont extraites
 * du HTML lui-même, donc la page reste correcte même si le fichier de langue
 * ne se charge pas. Les autres langues sont des dictionnaires de même forme,
 * appliqués sur les éléments portant `data-i18n`.
 *
 * Choix assumé : pas de modale bloquante au premier passage. Un bandeau
 * discret propose la langue détectée, et le sélecteur reste accessible dans
 * la barre de navigation. Une modale avant lecture coûte des conversions.
 */
(function () {
  'use strict';

  // Ajouter une langue = un fichier dans assets/i18n/ + une ligne ici.
  var LANGS = [
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' }
  ];

  var DEFAULT = 'fr';
  var STORE_KEY = 'marlglow.lang';
  var SEEN_KEY = 'marlglow.langPrompted';

  var codes = LANGS.map(function (l) { return l.code; });
  var cache = {};

  /* ----- Stockage : peut échouer en navigation privée ----- */

  function read(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function write(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* sans effet */ }
  }

  /* ----- Détection ----- */

  function fromBrowser() {
    var list = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < list.length; i++) {
      var base = String(list[i]).toLowerCase().split('-')[0];
      if (codes.indexOf(base) !== -1) return base;
    }
    return null;
  }

  function resolve() {
    var saved = read(STORE_KEY);
    if (saved && codes.indexOf(saved) !== -1) return saved;
    return fromBrowser() || DEFAULT;
  }

  /* ----- Application ----- */

  function fillYears() {
    var year = String(new Date().getFullYear());
    Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
      el.textContent = year;
    });
  }

  function apply(lang, dict) {
    if (dict) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
        var value = dict[el.dataset.i18n];
        if (typeof value === 'string') el.innerHTML = value;
      });
    }

    document.documentElement.lang = lang;

    var select = document.querySelector('[data-lang-select]');
    if (select) select.value = lang;

    // La traduction réécrit des blocs entiers : l'année et les prix formatés
    // doivent être réinjectés après coup.
    fillYears();
    document.dispatchEvent(new CustomEvent('lms:langchange', { detail: { lang: lang } }));
  }

  function load(lang) {
    if (lang === DEFAULT) return Promise.resolve(null);   // déjà dans le HTML
    if (cache[lang]) return Promise.resolve(cache[lang]);

    return fetch('assets/i18n/' + lang + '.json', { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (dict) { cache[lang] = dict; return dict; })
      .catch(function (err) {
        // Une langue manquante ne doit pas casser la page : on reste en
        // français, qui est déjà dans le document.
        console.warn('[i18n] ' + lang + ' indisponible, français conservé.', err);
        return null;
      });
  }

  function setLang(lang, remember) {
    if (codes.indexOf(lang) === -1) lang = DEFAULT;
    if (remember) write(STORE_KEY, lang);
    return load(lang).then(function (dict) { apply(lang, dict); });
  }

  /* ----- Sélecteur dans la barre de navigation ----- */

  function buildSelect() {
    var host = document.querySelector('[data-lang-host]');
    if (!host) return;

    var wrap = document.createElement('div');
    wrap.className = 'lang';

    var select = document.createElement('select');
    select.setAttribute('data-lang-select', '');
    select.setAttribute('aria-label', 'Langue / Language');

    LANGS.forEach(function (l) {
      var opt = document.createElement('option');
      opt.value = l.code;
      opt.textContent = l.label;
      select.appendChild(opt);
    });

    select.addEventListener('change', function () {
      setLang(select.value, true);
      hideBar();
    });

    wrap.appendChild(select);
    host.appendChild(wrap);
  }

  /* ----- Bandeau de premier passage ----- */

  var bar;

  function hideBar() {
    if (bar) bar.classList.remove('is-shown');
    write(SEEN_KEY, '1');
  }

  function maybeShowBar(current) {
    if (read(SEEN_KEY) || read(STORE_KEY)) return;

    var detected = fromBrowser();
    // Rien à proposer si le navigateur ne demande pas autre chose.
    if (!detected || detected === current) return;

    var label = LANGS.filter(function (l) { return l.code === detected; })[0];
    if (!label) return;

    bar = document.createElement('div');
    bar.className = 'lang-bar';
    bar.innerHTML =
      '<span>Ce site est aussi disponible en ' + label.label + '.</span>' +
      '<button type="button" data-lang-accept>Passer en ' + label.label + '</button>' +
      '<button type="button" class="lang-bar-close" data-lang-dismiss aria-label="Fermer">&times;</button>';

    document.body.insertBefore(bar, document.body.firstChild);
    requestAnimationFrame(function () { bar.classList.add('is-shown'); });

    bar.querySelector('[data-lang-accept]').addEventListener('click', function () {
      setLang(detected, true);
      hideBar();
    });
    bar.querySelector('[data-lang-dismiss]').addEventListener('click', hideBar);
  }

  /* ----- Démarrage ----- */

  buildSelect();
  var initial = resolve();
  setLang(initial, false).then(function () { maybeShowBar(initial); });

  window.lmsI18n = { set: setLang, langs: LANGS };
})();
