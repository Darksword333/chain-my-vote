pragma circom 2.0.0;

// Importation locale de Poseidon
include "circomlib/circuits/poseidon.circom";

// Composant qui recrée l'identité à partir du numéro secret
template CalculateIdentityCommitment() {
    signal input idCardNumber;
    signal output out;

    component poseidon = Poseidon(1);
    poseidon.inputs[0] <== idCardNumber;
    out <== poseidon.out;
}

// Composant qui génère l'empreinte anti-double vote
template CalculateNullifierHash() {
    signal input externalNullifier;
    signal input idCardNumber;
    signal output out;

    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== externalNullifier;
    poseidon.inputs[1] <== idCardNumber;
    out <== poseidon.out;
}

// Preuve d'inclusion simplifiée dans l'arbre de Merkle
template MerkleTreeInclusionProof(nLevels) {
    signal input leaf;
    signal input pathIndices[nLevels];
    signal input siblings[nLevels];
    signal output root;

    signal hashes[nLevels + 1];
    hashes[0] <== leaf;

    component poseidons[nLevels];

    for (var i = 0; i < nLevels; i++) {
        poseidons[i] = Poseidon(2);
        
        // Si pathIndex == 0, le voisin (sibling) est à droite, le hash actuel à gauche
        // Si pathIndex == 1, le voisin (sibling) est à gauche, le hash actuel à droite
        // Pour simplifier l'écriture sans MultiMux, on utilise une contrainte linéaire :
        poseidons[i].inputs[0] <== hashes[i] + pathIndices[i] * (siblings[i] - hashes[i]);
        poseidons[i].inputs[1] <== siblings[i] + pathIndices[i] * (hashes[i] - siblings[i]);

        hashes[i + 1] <== poseidons[i].out;
    }

    root <== hashes[nLevels];
}

// Circuit Principal pour votre système
template SemaphoreVote(nLevels) {
    // 1. INPUT PRIVÉ (Le numéro que l'étudiant tape mais qui reste caché)
    signal input idCardNumber;

    // 2. INPUTS POUR L'ARBRE (Donnés par le frontend pour prouver l'autorisation)
    signal input treePathIndices[nLevels];
    signal input treeSiblings[nLevels];

    // 3. INPUTS PUBLICS (Vus par le Smart Contract de vote)
    signal input signalHash;        // Le hachage du choix de vote (ex: hash de "Alice")
    signal input externalNullifier; // L'identifiant de l'élection (ex: 12345)

    // 4. OUTPUTS PUBLICS
    signal output root;
    signal output nullifierHash;

    // Étape A : Calculer l'empreinte de la carte d'identité (Commitment)
    component calcCommitment = CalculateIdentityCommitment();
    calcCommitment.idCardNumber <== idCardNumber;

    // Étape B : Vérifier que cette identité est dans l'arbre de l'école
    component inclusionProof = MerkleTreeInclusionProof(nLevels);
    inclusionProof.leaf <== calcCommitment.out;
    for (var i = 0; i < nLevels; i++) {
        inclusionProof.siblings[i] <== treeSiblings[i];
        inclusionProof.pathIndices[i] <== treePathIndices[i];
    }
    root <== inclusionProof.root;

    // Étape C : Lier le choix du vote (signalHash) pour empêcher l'altération
    signal dummy;
    dummy <== signalHash * signalHash;

    // Étape D : Générer le hash anti-double vote
    component calcNullifier = CalculateNullifierHash();
    calcNullifier.externalNullifier <== externalNullifier;
    calcNullifier.idCardNumber <== idCardNumber;
    nullifierHash <== calcNullifier.out;
}

// On passe à 16 niveaux pour alléger les calculs
component main {public [signalHash, externalNullifier]} = SemaphoreVote(16);