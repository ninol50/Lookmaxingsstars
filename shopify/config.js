/**
 * Source de vérité des identifiants Shopify.
 * Les IDs de variantes servent à construire les permaliens panier :
 *   https://<domaine>/cart/<variantId>:<qte>,<variantId>:<qte>
 * C'est ce mécanisme qui permet l'order bump sur un plan Basic, sans app.
 */
window.LMS_CONFIG = {
  // Remplacer par le domaine personnalisé une fois branché sur Shopify.
  shopDomain: 'bdvvhu-wx.myshopify.com',

  // Devise d'affichage. Doit rester alignée avec la devise de la boutique.
  currency: 'EUR',

  offers: {
    marlglow: {
      variantId: '60903719305550',
      title: 'Méthode MARLglow — Technique complète',
      price: 12
    }
  },

  bumps: {
    pack: {
      variantId: '60903720943950',
      title: 'MARLglow Pack Complet',
      price: 17
    }
  }
};
