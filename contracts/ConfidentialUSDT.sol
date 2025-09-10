// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {ConfidentialFungibleToken} from "@openzeppelin/confidential-contracts/token/ConfidentialFungibleToken.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract ConfidentialGold is ConfidentialFungibleToken, SepoliaConfig {
    constructor() ConfidentialFungibleToken("GOLD", "GOLD", "") {}
}
