// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

contract Main {
    // Organizer
    address public organizer;

    struct Voter {
        bool voted; // if already voted
        bytes32 vote; // Voter name
    }

    struct Choice {
        bytes32 name; // Choice name (bytes for gas economy)
        uint count; // Number of votes for this choice
    }

    Choice[] public choices;
    uint public totalVotes;

    // Whitelist
    mapping(address => bool) public whitelist;

    // Map address to voter struct
    mapping(address => Voter) public voters;

    // Nonces pour éviter les attaques par rejeu (Replay Attacks)
    mapping(address => uint) public nonces;

    // Class constructor
    constructor(bytes32[] memory choiceNames, address[] memory authorizedVoters) {
        organizer = msg.sender;

        // Add all initial choices
        for (uint i = 0; i < choiceNames.length; i++) {
            choices.push(Choice({
                name: choiceNames[i],
                count: 0
            }));
        }

        // Add address to whitelist
        for (uint i = 0; i < authorizedVoters.length; i++) {
            whitelist[authorizedVoters[i]] = true;
        }
    }

    /**
     * @notice Permet de voter directement ou via Account Abstraction (ERC-4337).
     * @param choiceName Le nom du candidat choisi.
     */
    function vote(bytes32 choiceName) external {
        address voterAddress = msg.sender;

        // Si le msg.sender n'est pas dans la whitelist, vérifier s'il s'agit d'un Smart Account
        // dont le propriétaire est whitelisted (ex: LightAccount).
        if (!whitelist[voterAddress]) {
            (bool success, bytes memory data) = voterAddress.staticcall(abi.encodeWithSignature("owner()"));
            if (success && data.length == 32) {
                address ownerAddress = abi.decode(data, (address));
                if (whitelist[ownerAddress]) {
                    voterAddress = ownerAddress;
                }
            }
        }

        require(whitelist[voterAddress], "You are not authorized to vote!");
        
        Voter storage sender = voters[voterAddress];
        require(!sender.voted, "Already voted!");

        // Find in the array
        bool choiceFound = false;
        uint choiceIndex = 0;

        for (uint i = 0; i < choices.length; i++) {
            if (choices[i].name == choiceName) {
                choiceFound = true;
                choiceIndex = i;
                break;
            }
        }

        require(choiceFound, "Choice not found !");

        // Register the vote
        sender.voted = true;
        sender.vote = choiceName;

        // Increment the counter
        choices[choiceIndex].count++;
        totalVotes++;
    }

    /**
     * @notice Permet de voter via un relais (ex: Gelato) sans payer de gaz.
     * @param choiceName Le nom du candidat choisi.
     * @param nonce Le numéro de transaction unique du votant pour éviter la duplication.
     * @param v Composante v de la signature ECDSA.
     * @param r Composante r de la signature ECDSA.
     * @param s Composante s de la signature ECDSA.
     */
    function voteWithSignature(
        bytes32 choiceName,
        uint nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // 1. Reconstruire le hachage du message signé par l'étudiant
        bytes32 messageHash = keccak256(abi.encodePacked(choiceName, nonce, address(this)));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));

        // 2. Récupérer l'adresse de celui qui a signé le message
        address voterAddress = ecrecover(ethSignedMessageHash, v, r, s);

        // 3. Effectuer les vérifications de sécurité habituelles sur le VOTANT, pas sur le relai
        require(whitelist[voterAddress], "You are not authorized to vote!");
        require(nonces[voterAddress] == nonce, "Invalid nonce! Potential replay attack.");
        
        Voter storage sender = voters[voterAddress];
        require(!sender.voted, "Already voted!");

        // Find in the array
        bool choiceFound = false;
        uint choiceIndex = 0;

        for (uint i = 0; i < choices.length; i++) {
            if (choices[i].name == choiceName) {
                choiceFound = true;
                choiceIndex = i;
                break;
            }
        }

        require(choiceFound, "Choice not found !");

        // Incrémenter le nonce de l'utilisateur pour invalider cette signature à l'avenir
        nonces[voterAddress]++;

        // Register the vote
        sender.voted = true;
        sender.vote = choiceName;

        // Increment the counter
        choices[choiceIndex].count++;
        totalVotes++;
    }

    // Winner
    function winner() public view returns (bytes32 winnerName_) {
        uint winnerCount = 0;
        for (uint p = 0; p < choices.length; p++) {
            if (choices[p].count > winnerCount) {
                winnerCount = choices[p].count;
                winnerName_ = choices[p].name;
            }
        }
    }

    function getAllResults() public view returns (bytes32[] memory, uint[] memory) {
        bytes32[] memory names = new bytes32[](choices.length);
        uint[] memory counts = new uint[](choices.length);
        
        for (uint i = 0; i < choices.length; i++) {
            names[i] = choices[i].name;
            counts[i] = choices[i].count;
        }
        
        return (names, counts);
    }
}