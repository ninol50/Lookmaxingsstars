# MARLglow — site de vente + boutique Shopify

Page de vente autonome (HTML/CSS/JS, zéro dépendance) branchée sur le checkout
Shopify de `bdvvhu-wx.myshopify.com`. Paiement et livraison des fichiers gérés
par Shopify ; le tunnel de conversion et les order bumps sont gérés ici.

---

## Pourquoi cette architecture

Le plan **Basic** n'ouvre pas les extensions de checkout — elles sont
réservées à Shopify Plus. Impossible donc de poser un order bump *dans* le
checkout sans passer par une app payante.

La page place donc les bumps **avant** le checkout. Les cases cochées sont
concaténées dans un permalien panier que Shopify lit nativement :

```
https://bdvvhu-wx.myshopify.com/cart/60903596360014:1,60903597539662:1?channel=buy_button
```

Shopify construit le panier et envoie l'acheteur au checkout. Un seul tunnel,
un seul paiement, aucun abonnement d'app. Limite à connaître : ce mécanisme ne
permet pas d'upsell **après** paiement (post-purchase), qui lui exige une app.

---

## Structure

```
index.html              page de vente (hero, problème, 3 phases, offre + bumps, FAQ)
merci.html              page de remerciement — à brancher en post-achat
mentions-legales.html   \
cgv.html                 > à compléter, champs [ENTRE CROCHETS] obligatoires
confidentialite.html    /
shopify/config.js       IDs de variantes, prix — source de vérité
assets/css/style.css    feuille unique, palette bleu nuit + jaune fluo
assets/js/checkout.js   order bumps, total dynamique, permalien, barre mobile
vercel.json             cleanUrls + cache assets + en-têtes de sécurité
```

Aucun build, aucun `npm install`. Pour travailler en local :

```bash
python3 -m http.server 8099   # puis http://localhost:8099
```

---

## Catalogue Shopify

| Produit | Prix | SKU | Variante | Rôle |
|---|---|---|---|---|
| Méthode MARLglow — Technique complète | 12 € | `MARL-CORE-12` | `60903719305550` | offre principale |
| MARLglow Pack Complet | 17 € | `MARL-PACK-17` | `60903720943950` | order bump |

Le Pack Complet ajoute le massage de peau sans produit et le tri des produits
du marché. Coché sur la page, il monte le panier à **29 €** dans le même
paiement.

Les cinq produits de la première version (Protocole 90 Jours, Skin & Grooming,
Style & Silhouette, Pack Photo, Tracker) sont toujours en brouillon dans
l'admin. Ils ne sont plus référencés par le site : à archiver quand tu es sûr
de ne pas les reprendre.

Les deux produits actifs sont en **brouillon**. C'est volontaire : publier
avant d'avoir attaché le contenu ferait payer des clients pour un accès vide.

## Photos avant / après — à fournir

La page contient trois comparateurs avant/après fonctionnels (curseur
glissant, souris, tactile et clavier). Ils affichent aujourd'hui des gabarits :

```
assets/img/avant-1.svg   assets/img/apres-1.svg    (hero + résultat 1)
assets/img/avant-2.svg   assets/img/apres-2.svg    (résultat 2)
```

Remplace ces quatre fichiers par de vraies photos, puis mets à jour les `src`
dans `index.html` si tu changes l'extension. Format portrait 3:4, même
cadrage, même lumière et même heure entre l'avant et l'après — sinon la
comparaison ne vaut rien et se voit immédiatement.

**Ces photos doivent être celles de vrais clients, avec leur accord écrit.**
Des avant/après fabriqués ou récupérés ailleurs, présentés comme des
résultats de la méthode, sont une pratique commerciale trompeuse
(art. L121-2) et le motif de bannissement le plus fréquent des comptes
publicitaires sur cette niche.

## Ce qu'il reste à faire, dans l'ordre

### 1. Activer les paiements — bloquant, à faire manuellement

Shopify n'autorise aucune API à activer un moyen de paiement : c'est une
procédure KYC réglementée. Dans **Admin → Paramètres → Paiements** :

- activer **Shopify Payments** (pièce d'identité, IBAN, SIREN/SIRET, adresse) ;
- ajouter **PayPal** — sur du produit digital en France il pèse souvent
  15-25 % des paiements, ne pas le négliger ;
- activer **Apple Pay / Google Pay** (un clic une fois Shopify Payments actif).

Comptez 1 à 3 jours ouvrés de vérification. Tant que ce n'est pas fait, les
boutons de la page mènent à un checkout qui ne peut pas encaisser.

### 2. Attacher les fichiers

Pour chaque produit, via l'app **Digital Products** (déjà installée) :
téléverser le PDF, puis publier. Le produit passe en `ACTIVE` et apparaît en
ligne.

### 3. Compléter les pages légales

Les trois pages contiennent des champs `[ENTRE CROCHETS]` : raison sociale,
SIRET, adresse, TVA, médiateur de la consommation. Ce sont des mentions
obligatoires (LCEN art. 6-III, Code de la consommation art. L221-5) et elles
ne peuvent pas être inventées. Sans elles, ni Meta ni TikTok ne valideront un
compte publicitaire.

### 4. Déployer

```bash
vercel --prod
```

Puis brancher un domaine personnalisé et remplacer `shopDomain` dans
`shopify/config.js` par ce domaine, afin que le checkout reste sur la même
marque (`checkout.lookmaxingstars.com` plutôt que `bdvvhu-wx.myshopify.com`).
L'écart de conversion sur ce seul point est loin d'être négligeable.

### 5. Rediriger vers `merci.html`

**Admin → Paramètres → Checkout → Statut de la commande**, ajouter :

```html
<script>
  if (!window.__lmsRedirected) {
    window.__lmsRedirected = true;
    setTimeout(function () {
      window.location.href = 'https://VOTRE-DOMAINE/merci.html';
    }, 3000);
  }
</script>
```

À garder optionnel : la page de statut Shopify est aussi le point d'accès au
téléchargement. Rediriger trop vite prive l'acheteur de ce lien.

---

## Points de vigilance

**Prix barrés.** Les `compareAtPrice` sont posés à 2× le prix de vente. En
droit français (art. L112-1-1, directive Omnibus), un prix de référence doit
être **le prix le plus bas réellement pratiqué sur les 30 derniers jours**. Sur
une boutique neuve, aucun de ces prix n'a jamais été pratiqué : en l'état c'est
attaquable. Soit vendre 30 jours au prix fort avant d'afficher la remise, soit
remplacer le prix barré par une mention d'offre de lancement datée.

**Avis clients.** Aucun témoignage n'est présent sur la page, et c'est
délibéré. Le gabarit est prêt en commentaire dans `index.html`, à décommenter
une fois de vrais avis collectés. Inventer des avis est une pratique
commerciale trompeuse (art. L121-2) et le premier motif de bannissement des
comptes publicitaires sur cette niche.

**Contenu de la niche.** Les guides évitent volontairement le *bone smashing*,
le *mewing* et les promesses de transformation osseuse. Ce n'est pas de la
prudence excessive : ces claims génèrent des litiges, des impayés et des
suspensions de compte marchand, sur une niche déjà surveillée.

**Profil de risque paiement.** Boutique neuve + 100 % digital + trafic payant =
profil à risque pour les processeurs. Une réserve ou un gel de fonds sur les
premières semaines est fréquent. Prévoir la trésorerie en conséquence et ne pas
compter sur un encaissement immédiat pour financer les pubs.

**Analytics.** `checkout.js` expose un point d'accroche `window.lmsTrackCheckout`
pour GA4, Meta Pixel ou TikTok. Attention : tout pixel publicitaire impose un
bandeau de consentement conforme **avant** dépôt, et une mise à jour de
`confidentialite.html`.
