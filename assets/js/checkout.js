/**
 * Order bump + redirection vers le checkout Shopify.
 *
 * Pourquoi ce mécanisme plutôt qu'une app :
 * le plan Basic n'ouvre pas les extensions de checkout (réservées à Plus).
 * Le bump se joue donc AVANT le checkout, sur cette page : les cases cochées
 * sont concaténées dans un permalien panier que Shopify sait lire directement.
 *
 *   https://<domaine>/cart/<variantId>:<qte>,<variantId>:<qte>
 *
 * Shopify construit le panier puis envoie l'acheteur au checkout. Un seul
 * tunnel, un seul paiement, aucune dépendance à un abonnement d'app.
 */
(function () {
  'use strict';

  var cfg = window.LMS_CONFIG;
  if (!cfg) {
    console.error('[LMS] config.js absent — les boutons d\'achat sont inertes.');
    return;
  }

  var euro = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: cfg.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  /* ----- Construction du permalien ----- */

  function buildCheckoutUrl(variantIds) {
    var items = variantIds.map(function (id) { return id + ':1'; }).join(',');
    // `channel=buy_button` évite une session panier parasite et amène
    // directement au checkout plutôt qu'à la page panier.
    return 'https://' + cfg.shopDomain + '/cart/' + items + '?channel=buy_button';
  }

  /* ----- Bloc d'offre : offre principale + bumps cochés ----- */

  var offerEl = document.querySelector('[data-offer]');

  function selectedBumps() {
    if (!offerEl) return [];
    return Array.prototype.slice
      .call(offerEl.querySelectorAll('[data-bump]:checked'))
      .map(function (input) { return cfg.bumps[input.dataset.bump]; })
      .filter(Boolean);
  }

  function currentTotal(base) {
    return selectedBumps().reduce(function (sum, bump) {
      return sum + bump.price;
    }, base.price);
  }

  function refreshOffer() {
    if (!offerEl) return;

    var base = cfg.offers[offerEl.dataset.offer];
    if (!base) return;

    var total = currentTotal(base);

    // Total affiché
    var totalEl = offerEl.querySelector('[data-total]');
    if (totalEl) totalEl.textContent = euro.format(total);

    // État visuel de chaque ligne de bump
    Array.prototype.forEach.call(offerEl.querySelectorAll('[data-bump]'), function (input) {
      input.closest('.bump').classList.toggle('is-on', input.checked);
    });

    // Libellé du bouton principal
    var btnPrice = offerEl.querySelector('[data-btn-price]');
    if (btnPrice) btnPrice.textContent = euro.format(total);

    // Barre mobile
    var sbPrice = document.querySelector('[data-sticky-price]');
    if (sbPrice) sbPrice.textContent = euro.format(total);
  }

  function goToCheckout(event) {
    event.preventDefault();

    var base = cfg.offers[offerEl ? offerEl.dataset.offer : 'protocole'];
    if (!base) return;

    var ids = [base.variantId].concat(
      selectedBumps().map(function (bump) { return bump.variantId; })
    );

    // Point d'accroche analytics : GA4, Meta Pixel ou TikTok se branchent ici.
    if (typeof window.lmsTrackCheckout === 'function') {
      window.lmsTrackCheckout({
        value: currentTotal(base),
        currency: cfg.currency,
        variantIds: ids
      });
    }

    window.location.href = buildCheckoutUrl(ids);
  }

  if (offerEl) {
    offerEl.addEventListener('change', function (event) {
      if (event.target.matches('[data-bump]')) refreshOffer();
    });
    refreshOffer();
  }

  /* ----- Tous les boutons d'achat de la page ----- */

  Array.prototype.forEach.call(
    document.querySelectorAll('[data-checkout]'),
    function (el) {
      var direct = el.dataset.checkout;

      // Un bouton avec `data-checkout="skin"` part sur cette offre seule ;
      // `data-checkout=""` reprend l'offre principale et ses bumps cochés.
      if (direct) {
        var offer = cfg.offers[direct] || cfg.bumps[direct];
        if (offer) el.href = buildCheckoutUrl([offer.variantId]);
        return;
      }

      el.addEventListener('click', goToCheckout);
    }
  );

  /* ----- Barre d'achat mobile -----
     Elle s'affiche une fois le hero dépassé, mais se retire quand le bloc
     d'offre est à l'écran : y superposer un rappel d'achat masquerait le
     bouton de paiement réel. */

  var stickyBar = document.querySelector('.sticky-buy');
  var heroAnchor = document.querySelector('[data-hero-end]');
  var offerSection = document.getElementById('offre');

  if (stickyBar && heroAnchor && 'IntersectionObserver' in window) {
    var pastHero = false;
    var offerInView = false;

    function syncStickyBar() {
      stickyBar.classList.toggle('is-shown', pastHero && !offerInView);
    }

    new IntersectionObserver(function (entries) {
      // Le sentinel est sorti par le haut : le hero est derrière nous.
      pastHero = entries[0].boundingClientRect.top < 0;
      syncStickyBar();
    }).observe(heroAnchor);

    if (offerSection) {
      new IntersectionObserver(function (entries) {
        offerInView = entries[0].isIntersecting;
        syncStickyBar();
      }).observe(offerSection);
    }
  }
})();
