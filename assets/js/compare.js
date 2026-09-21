/**
 * Curseur de comparaison avant / après.
 *
 * L'image « après » est superposée à l'image « avant » et rognée par
 * clip-path. Déplacer la poignée change la variable CSS --pos, donc la
 * largeur révélée. Pas de calcul de dimensions en JS : le navigateur
 * s'occupe du rendu, ce qui reste fluide au redimensionnement.
 *
 * Accessible : la poignée est un bouton, pilotable aux flèches et
 * exposée en slider pour les lecteurs d'écran.
 */
(function () {
  'use strict';

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function setup(root) {
    var handle = root.querySelector('.compare-handle');
    if (!handle) return;

    var position = 50;

    function apply(next) {
      position = clamp(next, 0, 100);
      root.style.setProperty('--pos', position + '%');
      handle.setAttribute('aria-valuenow', Math.round(position));
    }

    function positionFromEvent(event) {
      var box = root.getBoundingClientRect();
      if (!box.width) return position;
      return ((event.clientX - box.left) / box.width) * 100;
    }

    var dragging = false;

    root.addEventListener('pointerdown', function (event) {
      // Ignorer le clic droit et les clics milieu.
      if (event.button !== 0) return;
      dragging = true;
      root.setPointerCapture(event.pointerId);
      apply(positionFromEvent(event));
    });

    root.addEventListener('pointermove', function (event) {
      if (!dragging) return;
      event.preventDefault();
      apply(positionFromEvent(event));
    });

    function stop(event) {
      if (!dragging) return;
      dragging = false;
      if (root.hasPointerCapture(event.pointerId)) {
        root.releasePointerCapture(event.pointerId);
      }
    }

    root.addEventListener('pointerup', stop);
    root.addEventListener('pointercancel', stop);

    handle.addEventListener('keydown', function (event) {
      var step = event.shiftKey ? 10 : 2;
      if (event.key === 'ArrowLeft')       apply(position - step);
      else if (event.key === 'ArrowRight') apply(position + step);
      else if (event.key === 'Home')       apply(0);
      else if (event.key === 'End')        apply(100);
      else return;
      event.preventDefault();
    });

    apply(50);
  }

  Array.prototype.forEach.call(document.querySelectorAll('.compare'), setup);
})();
