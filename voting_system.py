from collections import Counter
from web3 import Web3

# ==========================================
# PARTIE 1 : CALCULETTE DE DÉPOUILLEMENT
# ==========================================
def depouillement_local(liste_votes):
    total_votes = len(liste_votes)
    resultats = Counter(liste_votes)
    gagnant = resultats.most_common(1)[0][0] 
    
    print("=== RÉSULTATS DU DÉPOUILLEMENT LOCAL ===")
    print(f"Total des votes : {total_votes}")
    for candidat, voix in resultats.items():
        pourcentage = (voix / total_votes) * 100
        print(f"{candidat} : {voix} voix ({pourcentage:.2f}%)")
    print(f"🏆 Le gagnant local est : {gagnant}\n")
    return resultats, gagnant

# ==========================================
# PARTIE 2 : AUDIT BLOCKCHAIN SEPOLIA
# ==========================================
w3 = Web3(Web3.HTTPProvider('https://ethereum-sepolia-rpc.publicnode.com'))
ADRESSE_CONTRAT = '0x0d7f9dcc6B9c42534577B222269955b63ace9905'

ABI_CONTRAT = [
	{
		"inputs": [{"internalType": "bytes32[]","name": "choiceNames","type": "bytes32[]"}],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [{"internalType": "bytes32","name": "choiceName","type": "bytes32"}],
		"name": "vote",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [{"internalType": "uint256","name": "","type": "uint256"}],
		"name": "choices",
		"outputs": [
			{"internalType": "bytes32","name": "name","type": "bytes32"},
			{"internalType": "uint256","name": "count","type": "uint256"}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "organizer",
		"outputs": [{"internalType": "address","name": "","type": "address"}],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [{"internalType": "address","name": "","type": "address"}],
		"name": "voters",
		"outputs": [
			{"internalType": "bool","name": "voted","type": "bool"},
			{"internalType": "bytes32","name": "vote","type": "bytes32"}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "winner",
		"outputs": [{"internalType": "bytes32","name": "winnerName_","type": "bytes32"}],
		"stateMutability": "view",
		"type": "function"
	}
]

def audit_blockchain():
    print("=== DÉBUT DE L'AUDIT BLOCKCHAIN ===")
    
    if not w3.is_connected():
        print("Erreur : Impossible de se connecter à Sepolia.")
        return

    # On relie Python à ton contrat
    contrat = w3.eth.contract(address=ADRESSE_CONTRAT, abi=ABI_CONTRAT)
    
    # On va lire le résultat sur la blockchain
    gagnant_hex = contrat.functions.winner().call()
    
    # On nettoie le texte (on enlève les zéros inutiles du bytes32)
    gagnant_clair = gagnant_hex.decode('utf-8').rstrip('\x00')
    
    # Vérification si quelqu'un a voté
    if gagnant_clair == "":
        print("La blockchain indique qu'il n'y a pas encore de gagnant (0 vote enregistré sur le contrat).")
    else:
        print(f"D'après la blockchain Sepolia, le gagnant officiel est : {gagnant_clair}")

# ==========================================
# EXÉCUTION DU SCRIPT
# ==========================================
votes_test = ["Alice", "Bob", "Alice", "Blanc", "Bob", "Alice"]
depouillement_local(votes_test)
audit_blockchain()