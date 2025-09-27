import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy ConfidentialGold first
  const deployedGold = await deploy("ConfidentialGold", {
    from: deployer,
    log: true,
  });
  console.log(`ConfidentialGold:`, deployedGold.address);

  // Deploy FHEBattle with GOLD address
  const deployedBattle = await deploy("FHEBattle", {
    from: deployer,
    args: [deployedGold.address],
    log: true,
  });
  console.log(`FHEBattle:`, deployedBattle.address);

  // Authorize FHEBattle as GOLD minter
  const { execute } = hre.deployments;
  await execute(
    "ConfidentialGold",
    { from: deployer, log: true },
    "authorizeMinter",
    deployedBattle.address,
  );
};
export default func;
func.id = "deploy_fhebattle"; // id required to prevent reexecution
func.tags = ["FHEBattle", "ConfidentialGold"];
