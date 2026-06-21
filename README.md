# Chain My Vote - Système de Vote Décentralisé Sécurisé par ZKP et Signature de Wallet

**Chain My Vote** est une solution moderne de vote décentralisé conçue pour offrir un maximum de sécurité, de confidentialité et d'accessibilité. En combinant les preuves à divulgation nulle de connaissance (Zero-Knowledge Proofs - ZKP) avec des signatures cryptographiques de portefeuilles (ECDSA / EIP-191), le système garantit l'anonymat des électeurs, l'intégrité des résultats et la validation de l'éligibilité de manière totalement décentralisée. De plus, l'intégration de Gelato Relay (Paymaster) permet un vote entièrement "gasless" pour l'utilisateur final.

---

## 🚀 Fonctionnalités Clés

1. **🔒 Confidentialité & Preuves ZKP (Zero-Knowledge Proofs)**
   Garantit la validation sécurisée de l'éligibilité des votants tout en préservant l'anonymat. L'utilisation de preuves à divulgation nulle de connaissance permet de certifier le droit de vote sans lier l'identité publique de l'électeur à son bulletin.

2. **📝 Signature Cryptographique EIP-191**
   Les électeurs s'authentifient et valident leur choix en signant un message cryptographique sécurisé directement via leur portefeuille (ex. MetaMask). Le contrat intelligent (`Main.sol`) vérifie la validité de cette signature à la volée.

3. **🛡️ Résistance aux Attaques par Rejeu**
   Chaque hash de message de vote est lié de manière unique à l'adresse du contrat intelligent du scrutin en cours (`address(this)`), empêchant toute réutilisation ou double-vote d'une signature sur d'autres scrutins.

4. **⛽ Vote Gasless (Sponsoring via Gelato Relay)**
   Le contrat intelligent utilise le modèle de relais Gelato SyncFee. L'organisateur approvisionne le contrat en ETH lors de sa création, et le contrat prend en charge les frais d'exécution de la transaction de vote pour le compte de l'électeur.

5. **📋 Whitelist sur la Blockchain**
   Les adresses des portefeuilles autorisés sont déclarées lors de la création de l'élection et stockées de manière sécurisée dans le contrat pour vérifier l'éligibilité en temps réel.

---

## 🛠️ Prérequis

Assurez-vous de disposer des éléments suivants :
- **Node.js** (v20+ recommandé)
- **npm** (ou gestionnaire de paquets équivalent)
- Un portefeuille web3 compatible (ex. **MetaMask**) configuré dans votre navigateur.

---

## 🔧 Installation et Configuration

1. **Installation des dépendances** :
   ```bash
   npm install
   ```

2. **Compilation du Smart Contract** :
   Le script de compilation compile le contrat `Main.sol` et exporte automatiquement l'ABI et le bytecode mis à jour pour le frontend :
   ```bash
   node compile.js
   ```

3. **Évaluation des Coûts de Gaz** :
   Pour estimer précisément les coûts de déploiement et de transaction avec le protocole de signature cryptographique :
   ```bash
   node estimateGas.mjs
   ```

---

## 💻 Démarrage de l'Application

Lancez le serveur de développement local :
```bash
npm run dev
```
L'application est alors accessible à l'adresse [http://localhost:3000](http://localhost:3000).

---

## 📖 Guide d'Utilisation et Tests

### Étape 1 : Connexion au Portefeuille
1. Accédez à l'application sur [http://localhost:3000](http://localhost:3000).
2. Cliquez sur **Connect MetaMask**.
3. L'application configurera automatiquement le réseau de test **Sepolia** (demande de changement si nécessaire).
4. Assurez-vous d'avoir quelques fonds Sepolia ETH sur le compte organisateur pour le déploiement du contrat et le provisionnement du sponsoring de gaz (0.02 Sepolia ETH recommandé).

### Étape 2 : Création du Scrutin (Organisateur)
1. Allez dans la section **Organize an Election** (ou accédez à `/organize`).
2. Indiquez le titre de l'élection et la date limite.
3. Définissez le montant en ETH à allouer pour le sponsoring de gaz des électeurs (ex: `0.02` ETH).
4. Dans le champ **Whitelisted Wallet Addresses**, saisissez les adresses Ethereum autorisées à voter (une adresse par ligne). *Veillez à ajouter l'adresse de test que vous utilisez actuellement pour pouvoir valider le vote.*
5. Ajoutez les options de vote.
6. Cliquez sur **Deploy Vote Contract** et confirmez la transaction sur MetaMask.

### Étape 3 : Vote (Électeur)
1. Naviguez vers l'onglet **Vote Now** (ou accédez à `/vote`).
2. Sélectionnez l'élection active dans la liste des scrutins disponibles.
3. Connectez-vous avec un portefeuille figurant dans la liste autorisée.
4. Sélectionnez l'option souhaitée.
5. MetaMask affiche une invite de signature EIP-191 sécurisée et gratuite (sans aucun coût de gaz).
6. Après validation de la signature, les données sont transmises au relais Gelato, qui exécute la transaction on-chain en débitant le dépôt de sponsoring du contrat.
7. Un écran de confirmation indique la bonne validation du vote.

### Étape 4 : Analyse des Résultats
1. Consultez l'onglet **Results** (ou `/results`) pour afficher la progression en temps réel et les résultats finaux après expiration du scrutin.

---

## 📁 Structure du Projet

- `contracts/Main.sol` : Le contrat intelligent intégrant la vérification des signatures ECDSA (`recoverSigner`), le contrôle d'accès par whitelist et la distribution des frais via Gelato.
- `src/hooks/useDeployer.tsx` : Hook React gérant le déploiement du contrat intelligent avec configuration de la whitelist.
- `src/hooks/useWallet.tsx` : Hook React gérant la connexion au wallet, la génération de la signature de message EIP-191 et l'intégration du relais Gelato.
- `src/app/organize/page.tsx` : Interface d'organisation permettant de définir les options du scrutin et la whitelist.
- `src/app/vote/page.tsx` : Interface utilisateur intuitive dédiée au vote par signature cryptographique.
- `src/app/results/page.tsx` : Interface de consultation des statistiques et résultats en temps réel.
