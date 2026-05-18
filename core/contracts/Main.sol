// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

contract Main {
    // Organizer
    address public organizer;

    struct Voter {
        bool voted; // if alredy voted
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

    // Map adress to voter struct
    mapping(address => Voter) public voters;

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

        // Add adress to whitelist
        for (uint i = 0; i < authorizedVoters.length; i++) {
            whitelist[authorizedVoters[i]] = true;
        }
    }

    // Vote for a choice
    function vote(bytes32 choiceName) external {
        require(whitelist[msg.sender], "You are not authorized to vote!");
        
        Voter storage sender = voters[msg.sender];
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