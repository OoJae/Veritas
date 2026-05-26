// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Agent IDs from the Somnia testnet Agent Explorer.
library AgentIds {
    uint256 public constant LLM_PARSE_WEBSITE_ID = 12875401142070969085;
    uint256 public constant LLM_INFERENCE_ID = 12847293847561029384;
    uint256 public constant JSON_API_REQUEST_ID = 13174292974160097713;
}

/// @notice Per-agent pricing (at default subcommittee size 3).
library AgentPricing {
    uint256 public constant JSON_FETCH_COST_PER_AGENT = 0.03 ether;
    uint256 public constant LLM_INFERENCE_COST_PER_AGENT = 0.07 ether;
    uint256 public constant LLM_PARSE_WEBSITE_COST_PER_AGENT = 0.10 ether;
    uint256 public constant DEFAULT_SUBCOMMITTEE_SIZE = 3;
}

/// @notice LLM Parse Website agent method signatures.
interface ILLMParseWebsite {
    /// @notice Extract a string value from a web page using LLM extraction.
    function ExtractString(
        string calldata key,
        string calldata description,
        string[] calldata options,
        string calldata prompt,
        string calldata url,
        bool resolveUrl,
        uint8 numPages,
        uint8 confidenceThreshold
    ) external returns (string memory);

    /// @notice Extract a number from a web page using LLM extraction.
    function ExtractANumber(
        string calldata key,
        string calldata description,
        uint256 min,
        uint256 max,
        string calldata prompt,
        string calldata url,
        bool resolveUrl,
        uint8 numPages,
        uint8 confidenceThreshold
    ) external returns (uint256);
}

/// @notice LLM Inference agent method signatures.
interface ILLMInference {
    /// @notice Generate a deterministic string from a prompt with optional constrained values.
    function inferString(
        string calldata prompt,
        string calldata system,
        bool chainOfThought,
        string[] calldata allowedValues
    ) external returns (string memory);

    /// @notice Generate a deterministic number from a prompt, clamped to [min, max].
    function inferNumber(
        string calldata prompt,
        string calldata system,
        int256 minValue,
        int256 maxValue,
        bool chainOfThought
    ) external returns (int256);
}

/// @notice JSON API Request agent method signatures.
interface IJsonApiAgent {
    /// @notice Fetch a uint256 from a JSON API endpoint.
    function fetchUint(
        string calldata url,
        string calldata selector,
        uint8 decimals
    ) external returns (uint256);

    /// @notice Fetch a string from a JSON API endpoint.
    function fetchString(
        string calldata url,
        string calldata selector
    ) external returns (string memory);

    /// @notice Fetch a bool from a JSON API endpoint.
    function fetchBool(
        string calldata url,
        string calldata selector
    ) external returns (bool);
}
