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

  /**
   * Les deux paliers se recouvrent : le Pack Créateur contient déjà tout le
   * Pack Complet. Ils sont donc exclusifs — `excludes` dit lequel décocher
   * pour qu'un acheteur ne paie jamais deux fois le même contenu.
   */
  bumps: {
    pack: {
      variantId: '60903720943950',
      title: 'MARLglow Pack Complet',
      price: 17,
      excludes: ['createur']
    },
    createur: {
      variantId: '60904414806350',
      title: 'MARLglow Pack Créateur',
      price: 47.5,
      excludes: ['pack'],
      // Ce palier ouvre un accès nominatif : l'acheteur doit le demander
      // après paiement avec l'e-mail de sa commande.
      grantsAccess: true
    }
  }
};
