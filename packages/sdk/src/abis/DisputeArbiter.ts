export const disputeArbiterAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_veritas",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "receive",
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "MAX_EVIDENCE_WINDOW",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "claimBounty",
    "inputs": [
      {
        "name": "disputeId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "disputes",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "question",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "claimant",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "respondent",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "bounty",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "verdictId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "resolved",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "winner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "createdAt",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "evidenceDeadline",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getDispute",
    "inputs": [
      {
        "name": "disputeId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct DisputeArbiter.Dispute",
        "components": [
          {
            "name": "question",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "claimant",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "respondent",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "claimantEvidenceUrls",
            "type": "string[]",
            "internalType": "string[]"
          },
          {
            "name": "respondentEvidenceUrls",
            "type": "string[]",
            "internalType": "string[]"
          },
          {
            "name": "bounty",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "verdictId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "resolved",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "winner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "createdAt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "evidenceDeadline",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasClaimed",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nextDisputeId",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "raiseDispute",
    "inputs": [
      {
        "name": "respondent",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "question",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "claimantEvidenceUrls",
        "type": "string[]",
        "internalType": "string[]"
      },
      {
        "name": "evidenceWindow",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "disputeId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "resolveCallback",
    "inputs": [
      {
        "name": "disputeId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "resolveDispute",
    "inputs": [
      {
        "name": "disputeId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "submitEvidence",
    "inputs": [
      {
        "name": "disputeId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "evidenceUrls",
        "type": "string[]",
        "internalType": "string[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "veritas",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IVeritas"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "BountyClaimed",
    "inputs": [
      {
        "name": "disputeId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "winner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DisputeRaised",
    "inputs": [
      {
        "name": "disputeId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "claimant",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "respondent",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "question",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DisputeResolved",
    "inputs": [
      {
        "name": "disputeId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "winner",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EvidenceSubmitted",
    "inputs": [
      {
        "name": "disputeId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "respondent",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ResolutionTriggered",
    "inputs": [
      {
        "name": "disputeId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "verdictId",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyClaimed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AlreadyResolved",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DisputeNotResolved",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EvidenceWindowClosed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidEvidenceWindow",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoBounty",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotRespondent",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotWinner",
    "inputs": []
  }
] as const;
