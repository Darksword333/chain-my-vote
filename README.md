# Chain My Vote - Vote Sécurisé par Signature de Wallet (Sans Carte d'Identité)

Chain My Vote est une application de vote décentralisée et sécurisée. Cette version a été simplifiée pour supprimer la vérification par carte d'identité / preuves Zero-Knowledge (ZKP), permettant aux électeurs de s'authentifier directement et de signer leur choix à l'aide de leur wallet de manière simplifiée et sécurisée, tout en conservant le sponsoring des frais de gaz (Paymaster via Gelato Relay).

## Fonctionnalités Clés

1. **Pas de Carte d'Identité** : Plus besoin de saisir des numéros d'identification de 8 chiffres.
2. **Whitelist par Adresses de Wallet** : Le créateur du vote fournit directement les adresses Ethereum (`0x...`) des votants autorisés lors de la création.
3. **Signature par Wallet** : Les votants signent cryptographiquement leur choix de vote directement via leur wallet (ex. MetaMask). Le contrat intelligent vérifie la signature à la volée.
4. **Sponsoring du Gaz (Paymaster)** : Le contrat intelligent rembourse le relais Gelato (`Gelato Relay SyncFee`) en utilisant des fonds déposés lors de la création. Le votant ne paie pas de gaz pour voter !

---

## Prérequis

Assurez-vous d'avoir installé :
- **Node.js** (v20 ou plus récent recommandé)
- **npm** (inclus avec Node.js)
- **Extension de Wallet (ex: MetaMask)** configurée sur votre navigateur.

---

## Installation et Préparation

1. **Installez les dépendances du projet** :
   ```bash
   npm install
   ```

2. **Compilez le smart contract mis à jour** :
   Le script `compile.js` compile `Main.sol` et génère les fichiers d'ABI/bytecode dans `src/lib/compiled.json` pour le frontend.
   ```bash
   node compile.js
   ```

3. **(Optionnel) Estimez les coûts en gaz** :
   Estimez les frais de déploiement et de vote pour la nouvelle structure par signature :
   ```bash
   node estimateGas.mjs
   ```

---

## Lancer le Projet

Démarrez le serveur de développement Next.js :
```bash
npm run dev
```

Ouvrez ensuite [http://localhost:3000](http://localhost:3000) dans votre navigateur.

---

## Guide de Test Étape par Étape

Pour tester le projet localement et valider son bon fonctionnement :

### Étape 1 : Se Connecter
1. Ouvrez l'application à l'adresse [http://localhost:3000](http://localhost:3000).
2. Cliquez sur **Connect MetaMask**.
3. Assurez-vous d'être connecté au réseau de test **Sepolia** (l'application vous demandera automatiquement de changer si nécessaire).
4. Prévoyez un peu d'ETH de test Sepolia sur le compte de l'organisateur pour déployer le contrat de vote et sponsoriser le gaz (0.02 ETH recommandé).

### Étape 2 : Créer un Vote (Organisateur)
1. Cliquez sur **Organize an Election** (ou allez sur `/organize`).
2. Saisissez un titre (ex: "Choix du framework 2026").
3. Sélectionnez une date limite de vote dans le futur.
4. Indiquez le montant de sponsoring en ETH (ex: `0.02` ETH) qui sera envoyé dans le contrat pour payer le relais Gelato pour vos électeurs.
5. Dans le champ **Whitelisted Wallet Addresses**, insérez la liste des adresses de wallet autorisées à voter (une par ligne). **N'oubliez pas d'inclure votre propre adresse MetaMask pour pouvoir voter et tester immédiatement !**
6. Saisissez vos options de vote.
7. Cliquez sur **Deploy Vote Contract**.
8. Confirmez la transaction de déploiement dans MetaMask. Une fois déployé, l'adresse de votre contrat de vote s'affichera à l'écran.

### Étape 3 : Voter (Électeur)
1. Cliquez sur **Vote Now** sur la page d'accueil ou naviguez sur `/vote`.
2. L'application listera automatiquement les scrutins actifs créés (stockés dans le stockage local pour la démonstration).
3. Connectez-vous avec l'un des wallets ajoutés dans la whitelist.
4. Cliquez sur l'option de votre choix.
5. Votre wallet MetaMask vous demandera de signer un message cryptographique sécurisé (contenant le choix de vote et l'adresse du contrat pour éviter toute réutilisation). **Cette signature est gratuite et ne nécessite pas de gaz.**
6. Une fois signée, la transaction sera soumise au relais Gelato qui exécutera le vote sur la blockchain en utilisant les fonds de sponsoring du contrat.
7. Un message de succès s'affichera une fois le vote enregistré sur la blockchain.

### Étape 4 : Consulter les Résultats
1. Naviguez sur `/results` pour consulter les statistiques de votes et les résultats en temps réel.

---

## Structure du Projet

- `Main.sol` : Le contrat intelligent contenant la vérification de signature ECDSA (`recoverSigner`) et la logique de distribution Gelato.
- `src/hooks/useDeployer.tsx` : Hook pour le déploiement direct du contrat de vote avec la whitelist d'adresses.
- `src/hooks/useWallet.tsx` : Hook pour la gestion du wallet, la génération de la signature de message EIP-191 et la communication avec Gelato.
- `src/app/organize/page.tsx` : Interface d'organisation mise à jour pour accepter les adresses Ethereum autorisées.
- `src/app/vote/page.tsx` : Interface de vote épurée, sans saisie de carte d'identité.
