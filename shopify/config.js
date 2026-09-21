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
    protocole: {
      variantId: '60903596360014',
      title: 'Protocole Lookmax 90 Jours',
      price: 47,
      compareAt: 97
    },
    skin: {
      variantId: '60903597211982',
      title: 'Skin & Grooming Blueprint',
      price: 27,
      compareAt: 47
    },
    style: {
      variantId: '60903597506894',
      title: 'Style & Silhouette — Guide Morphologie',
      price: 27,
      compareAt: 47
    }
  },

  bumps: {
    photo: {
      variantId: '60903597539662',
      title: 'Pack Photo & Posture — 60 poses + réglages',
      price: 17,
      compareAt: 34
    },
    tracker: {
      variantId: '60903597736270',
      title: 'Tracker 90 Jours (Notion)',
      price: 12,
      compareAt: 24
    }
  }
};
