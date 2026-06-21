// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "./Verifier.sol";

/**
 * @title Main
 * @dev Voting management with automatic relay payment (Gelato SyncFee)
 * and Zero-Knowledge Proof based authorization (Semaphore).
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

// Interface to pay Gelato
interface IGelatoRelay {
    function feeCollector() external view returns (address);
}

contract Main is Context {
    address public organizer;
    address private _trustedForwarder;
    uint public votingDeadline;

    // Official Gelato Relay address for payment (checksum correct)
    address public constant GELATO_RELAY = 0xd822d6828859157C76F43743F0638573d5603fe6; // Sepolia Example

    struct Choice {
        bytes32 name;
        uint count;
    }

    Choice[] public choices;
    uint public totalVotes;

    // ZKP State
    uint256 public merkleRoot;
    uint256 public externalNullifier;
    mapping(uint256 => bool) public nullifierHashes;
    Groth16Verifier public verifier;

    // Event to track gas payment
    event GasPaid(address relay, uint amount);

    constructor(
        bytes32[] memory choiceNames, 
        address trustedForwarder_, 
        uint _votingDeadline,
        uint256 _merkleRoot,
        uint256 _externalNullifier,
        address _verifierAddress
    ) payable {
        organizer = msg.sender;
        _trustedForwarder = trustedForwarder_;
        votingDeadline = _votingDeadline;
        merkleRoot = _merkleRoot;
        externalNullifier = _externalNullifier;
        verifier = Groth16Verifier(_verifierAddress);

        for (uint i = 0; i < choiceNames.length; i++) {
            choices.push(Choice({name: choiceNames[i], count: 0}));
        }
    }

    // Receive more ETH if needed
    receive() external payable {}

    function isTrustedForwarder(address forwarder) public view virtual returns (bool) {
        return forwarder == _trustedForwarder;
    }

    function _msgSender() internal view virtual override returns (address sender) {
        if (isTrustedForwarder(msg.sender)) {
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            return super._msgSender();
        }
    }

    // Modifier to pay Gelato at the end of the vote
    modifier payGelato() {
        _; // Execute the vote first

        // If it comes from the forwarder, pay the Gelato collector
        if (isTrustedForwarder(msg.sender)) {
            uint fee;
            address feeToken;

            (fee, feeToken) = _getGelatoFeeDetails();

            require(address(this).balance >= fee, "Not enough ETH in the contract!");

            // Pay the collector
            address collector = IGelatoRelay(GELATO_RELAY).feeCollector();
            (bool success, ) = payable(collector).call{value: fee}("");
            require(success, "Gelato payment failed");

            emit GasPaid(collector, fee);
        }
    }

    // Internal function to extract fees from calldata (specific to Gelato SyncFee)
    function _getGelatoFeeDetails() internal view returns (uint fee, address feeToken) {
        assembly {
            let size := calldatasize()
            fee := calldataload(sub(size, 84)) // 20 (user) + 32 (token) + 32 (fee)
            feeToken := calldataload(sub(size, 52)) // 20 (user) + 32 (token)
        }
    }

    // Vote function with auto payment and ZK proof verification
    function voteZK(
        bytes32 choiceName,
        uint256 nullifierHash,
        uint256 root,
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c
    ) external payGelato {
        require(block.timestamp <= votingDeadline, "Voting has ended!");
        require(root == merkleRoot, "Invalid Merkle root");
        require(!nullifierHashes[nullifierHash], "Already voted!");

        bool choiceFound = false;
        uint choiceIndex = 0;
        for (uint i = 0; i < choices.length; i++) {
            if (choices[i].name == choiceName) {
                choiceFound = true;
                choiceIndex = i;
                break;
            }
        }
        require(choiceFound, "Choice does not exist!");

        // Derive signalHash consistently with the frontend
        uint256 signalHash = uint256(keccak256(abi.encodePacked(choiceName))) >> 8;

        // Build public inputs: [root, nullifierHash, signalHash, externalNullifier]
        uint[4] memory input = [root, nullifierHash, signalHash, externalNullifier];
        
        // Verify ZK Proof
        require(verifier.verifyProof(a, b, c, input), "Invalid ZK proof");

        nullifierHashes[nullifierHash] = true;
        choices[choiceIndex].count++;
        totalVotes++;
    }

    // For the organizer to withdraw the surplus at the end
    function withdraw() external {
        require(msg.sender == organizer, "Only the organizer can withdraw!");
        (bool success, ) = payable(organizer).call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }

    function winners() public view returns (bytes32[] memory winnerNames_) {
        uint winnerCount = 0;
        uint numWinners = 0;

        for (uint p = 0; p < choices.length; p++) {
            if (choices[p].count > winnerCount) {
                winnerCount = choices[p].count;
                numWinners = 1;
            } else if (choices[p].count == winnerCount && winnerCount > 0) {
                numWinners++;
            }
        }

        winnerNames_ = new bytes32[](numWinners);
        uint index = 0;
        if (winnerCount > 0) {
            for (uint p = 0; p < choices.length; p++) {
                if (choices[p].count == winnerCount) {
                    winnerNames_[index] = choices[p].name;
                    index++;
                }
            }
        }
    }

    function isTie() public view returns (bool) {
        return winners().length > 1;
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