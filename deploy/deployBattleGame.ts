import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("Deploying FHE Battle Game contracts...");
  console.log("Deployer:", deployer);

  // First deploy the GOLD token
  const deployedGoldToken = await deploy("ConfidentialGold", {
    from: deployer,
    log: true,
  });

  console.log(`ConfidentialGold contract deployed at: ${deployedGoldToken.address}`);

  // Then deploy the battle game contract
  const deployedBattleGame = await deploy("FHEBattleGame", {
    from: deployer,
    args: [deployedGoldToken.address],
    log: true,
  });

  console.log(`FHEBattleGame contract deployed at: ${deployedBattleGame.address}`);

  // Setup: Authorize the battle game contract to mint GOLD tokens
  if (hre.network.name !== "hardhat") {
    const { ethers } = hre;
    const goldToken = await ethers.getContractAt("ConfidentialGold", deployedGoldToken.address);
    
    console.log("Authorizing battle game contract to mint GOLD tokens...");
    const tx = await goldToken.authorizeMinter(deployedBattleGame.address);
    await tx.wait();
    console.log("Battle game contract authorized as minter");
  }

  console.log("\n=== Deployment Summary ===");
  console.log(`GOLD Token: ${deployedGoldToken.address}`);
  console.log(`Battle Game: ${deployedBattleGame.address}`);
  console.log("=========================\n");
};

export default func;
func.id = "deploy_battleGame";
func.tags = ["BattleGame", "GOLD"];
func.dependencies = []; // No dependencies on other deployments