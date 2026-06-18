// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

interface IGelatoRelay {
    function feeCollector() external view returns (address);
}

contract Main is Context {
    address public organizer;
    address private _trustedForwarder;
    uint256 public votingDeadline;

    address public constant GELATO_RELAY = 0xd822d6828859157C76F43743F0638573d5603fe6;

    struct Choice {
        bytes32 name;
        uint256 count;
    }

    Choice[] public choices;
    uint256 public totalVotes;

    mapping(address => bool) public whitelist;
    mapping(address => bool) public hasVoted;

    event GasPaid(address indexed relay, uint256 amount);

    constructor(
        bytes32[] memory choiceNames, 
        address trustedForwarder_, 
        uint256 _votingDeadline,
        address[] memory whitelist_
    ) payable {
        organizer = msg.sender;
        _trustedForwarder = trustedForwarder_;
        votingDeadline = _votingDeadline;

        for (uint256 i = 0; i < choiceNames.length; i++) {
            choices.push(Choice({name: choiceNames[i], count: 0}));
        }

        for (uint256 i = 0; i < whitelist_.length; i++) {
            whitelist[whitelist_[i]] = true;
        }
    }

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

    modifier payGelato() {
        _;

        if (isTrustedForwarder(msg.sender)) {
            (uint256 fee, ) = _getGelatoFeeDetails();
            require(address(this).balance >= fee, "Insufficient sponsored gas funds");

            address collector = IGelatoRelay(GELATO_RELAY).feeCollector();
            (bool success, ) = payable(collector).call{value: fee}("");
            require(success, "Gelato fee payment failed");

            emit GasPaid(collector, fee);
        }
    }

    /**
     * @dev Extracts the fee details appended by the Gelato SyncFee forwarder.
     * Gelato appends exactly 84 bytes at the end of the calldata.
     */
    function _getGelatoFeeDetails() internal view returns (uint256 fee, address feeToken) {
        assembly {
            let size := calldatasize()
            fee := calldataload(sub(size, 84))
            feeToken := calldataload(sub(size, 52))
        }
    }

    function getMessageHash(bytes32 choiceName) public view returns (bytes32) {
        return keccak256(abi.encodePacked(choiceName, address(this)));
    }

    function getEthSignedMessageHash(bytes32 messageHash) public pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
    }

    function recoverSigner(bytes32 ethSignedMessageHash, bytes memory signature) public pure returns (address) {
        if (signature.length != 65) {
            return address(0);
        }

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        if (v < 27) {
            v += 27;
        }

        if (v != 27 && v != 28) {
            return address(0);
        }

        return ecrecover(ethSignedMessageHash, v, r, s);
    }

    function vote(bytes32 choiceName, bytes calldata signature) external payGelato {
        require(block.timestamp <= votingDeadline, "Voting period has ended");

        bytes32 messageHash = getMessageHash(choiceName);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        address voter = recoverSigner(ethSignedMessageHash, signature);

        require(voter != address(0), "Signature recovery failed");
        require(whitelist[voter], "Voter address not whitelisted");
        require(!hasVoted[voter], "Voter has already cast a vote");

        bool choiceFound = false;
        uint256 choiceIndex = 0;
        for (uint256 i = 0; i < choices.length; i++) {
            if (choices[i].name == choiceName) {
                choiceFound = true;
                choiceIndex = i;
                break;
            }
        }
        require(choiceFound, "Invalid vote choice option");

        hasVoted[voter] = true;
        choices[choiceIndex].count++;
        totalVotes++;
    }

    function withdraw() external {
        require(msg.sender == organizer, "Unauthorized withdrawal request");
        (bool success, ) = payable(organizer).call{value: address(this).balance}("");
        require(success, "Funds withdrawal failed");
    }

    function winners() public view returns (bytes32[] memory winnerNames_) {
        uint256 maxVotes = 0;
        uint256 winnerCount = 0;

        for (uint256 p = 0; p < choices.length; p++) {
            if (choices[p].count > maxVotes) {
                maxVotes = choices[p].count;
                winnerCount = 1;
            } else if (choices[p].count == maxVotes && maxVotes > 0) {
                winnerCount++;
            }
        }

        winnerNames_ = new bytes32[](winnerCount);
        uint256 index = 0;
        if (maxVotes > 0) {
            for (uint256 p = 0; p < choices.length; p++) {
                if (choices[p].count == maxVotes) {
                    winnerNames_[index] = choices[p].name;
                    index++;
                }
            }
        }
    }

    function isTie() public view returns (bool) {
        return winners().length > 1;
    }

    function getAllResults() public view returns (bytes32[] memory, uint256[] memory) {
        bytes32[] memory names = new bytes32[](choices.length);
        uint256[] memory counts = new uint256[](choices.length);
        for (uint256 i = 0; i < choices.length; i++) {
            names[i] = choices[i].name;
            counts[i] = choices[i].count;
        }
        return (names, counts);
    }
}
