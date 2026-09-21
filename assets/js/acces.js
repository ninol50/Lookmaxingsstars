/**
 * Page d'accès : demande côté acheteur, décision côté créateur.
 *
 * Aucun secret ici. Le code créateur part vers /api/access/login, qui le
 * compare à une variable d'environnement et renvoie un jeton de session de
 * courte durée. Le jeton reste en mémoire : il n'est pas écrit dans le
 * stockage du navigateur, pour qu'il disparaisse avec l'onglet.
 */
(function () {
  'use strict';

  var token = null;

  function post(path, body, withAuth) {
    var headers = { 'Content-Type': 'application/json' };
    if (withAuth && token) headers.Authorization = 'Bearer ' + token;

    return fetch('/api/access/' + path, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body || {})
    }).then(function (res) {
      var type = res.headers.get('content-type') || '';

      // En local, ou si les fonctions ne sont pas déployées, la réponse est
      // une page d'erreur HTML : le dire clairement plutôt que « illisible ».
      if (type.indexOf('application/json') === -1) {
        return {
          status: res.status,
          data: {
            ok: false,
            error: res.status === 404
              ? 'Le service d\'accès n\'est pas déployé sur ce domaine.'
              : 'Le serveur a répondu ' + res.status + '.'
          }
        };
      }

      return res.json()
        .catch(function () { return { ok: false, error: 'Réponse du serveur illisible.' }; })
        .then(function (data) { return { status: res.status, data: data }; });
    }).catch(function () {
      return { status: 0, data: { ok: false, error: 'Serveur injoignable. Vérifie ta connexion.' } };
    });
  }

  function message(form, text, kind) {
    var el = form.querySelector('[data-msg]') || form;
    el.textContent = text;
    el.className = 'form-msg is-' + kind;
    el.hidden = false;
  }

  function busy(form, on) {
    var btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = on;
  }

  var STATUS_LABEL = {
    pending: 'en attente de validation',
    granted: 'accès accordé',
    denied: 'demande refusée',
    none: 'aucune demande enregistrée pour cette adresse'
  };

  /* ----- Acheteur : demande ----- */

  var requestForm = document.getElementById('request-form');
  if (requestForm) {
    requestForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var email = requestForm.email.value.trim();
      if (!email) return message(requestForm, 'Renseigne ton adresse e-mail.', 'err');

      busy(requestForm, true);
      post('request', { email: email, order: requestForm.order.value }).then(function (r) {
        busy(requestForm, false);
        if (!r.data.ok) return message(requestForm, r.data.error, 'err');

        if (r.data.status === 'granted') {
          message(requestForm, 'Ton accès est déjà actif pour cette adresse.', 'ok');
        } else if (r.data.status === 'denied') {
          message(requestForm, 'Cette adresse a été refusée. Écris-nous si c\'est une erreur.', 'err');
        } else {
          message(requestForm,
            'Demande enregistrée. Elle est en attente de validation : tu recevras '
            + 'une réponse à cette adresse.', 'ok');
        }
      });
    });
  }

  /* ----- Acheteur : consultation ----- */

  var statusForm = document.getElementById('status-form');
  if (statusForm) {
    statusForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var email = statusForm.email.value.trim();
      if (!email) return message(statusForm, 'Renseigne ton adresse e-mail.', 'err');

      busy(statusForm, true);
      post('status', { email: email }).then(function (r) {
        busy(statusForm, false);
        if (!r.data.ok) return message(statusForm, r.data.error, 'err');
        var label = STATUS_LABEL[r.data.status] || r.data.status;
        message(statusForm, 'État : ' + label + '.', r.data.status === 'granted' ? 'ok' : 'info');
      });
    });
  }

  /* ----- Créateur ----- */

  var loginForm = document.getElementById('creator-login');
  var panel = document.getElementById('creator-panel');
  var list = document.getElementById('requests');
  var panelMsg = document.querySelector('[data-creator-msg]');

  function panelMessage(text, kind) {
    if (!panelMsg) return;
    panelMsg.textContent = text;
    panelMsg.className = 'form-msg is-' + kind;
    panelMsg.hidden = !text;
  }

  function render(requests) {
    list.textContent = '';

    if (!requests.length) {
      list.innerHTML = '<p class="dim">Aucune demande pour le moment.</p>';
      return;
    }

    requests.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'req-row';

      var info = document.createElement('div');
      // textContent, jamais innerHTML : l'e-mail vient d'un visiteur.
      var strong = document.createElement('strong');
      strong.textContent = item.email;
      info.appendChild(strong);

      var meta = document.createElement('span');
      meta.className = 'req-meta';
      meta.textContent =
        (item.order ? 'commande ' + item.order + ' · ' : '') +
        (STATUS_LABEL[item.status] || item.status) + ' · ' +
        new Date(item.requestedAt).toLocaleString('fr-FR');
      info.appendChild(meta);
      row.appendChild(info);

      var actions = document.createElement('div');
      actions.className = 'req-actions';

      [['granted', 'Accepter', 'btn-primary'], ['denied', 'Refuser', 'btn-ghost']].forEach(function (pair) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn ' + pair[2];
        btn.textContent = pair[1];
        btn.disabled = item.status === pair[0];
        btn.addEventListener('click', function () {
          btn.disabled = true;
          post('decide', { email: item.email, decision: pair[0] }, true).then(function (r) {
            if (!r.data.ok) { panelMessage(r.data.error, 'err'); btn.disabled = false; return; }
            panelMessage('', 'info');
            refresh();
          });
        });
        actions.appendChild(btn);
      });

      row.appendChild(actions);
      list.appendChild(row);
    });
  }

  function refresh() {
    post('pending', {}, true).then(function (r) {
      if (r.status === 401) {
        token = null;
        panel.hidden = true;
        loginForm.hidden = false;
        return message(loginForm, 'Session expirée, reconnecte-toi.', 'err');
      }
      if (!r.data.ok) return panelMessage(r.data.error, 'err');
      render(r.data.requests || []);
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', function (event) {
      event.preventDefault();
      busy(loginForm, true);
      post('login', { passcode: loginForm.passcode.value }).then(function (r) {
        busy(loginForm, false);
        loginForm.passcode.value = '';

        if (!r.data.ok) return message(loginForm, r.data.error, 'err');

        token = r.data.token;
        loginForm.hidden = true;
        panel.hidden = false;
        refresh();
      });
    });
  }

  var refreshBtn = document.querySelector('[data-refresh]');
  if (refreshBtn) refreshBtn.addEventListener('click', refresh);
})();
