import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("battle:address", "Prints the FHEBattle and ConfidentialGold addresses").setAction(async function (_: TaskArguments, hre) {
  const { deployments } = hre;
  const battle = await deployments.get("FHEBattle");
  const gold = await deployments.get("ConfidentialGold");
  console.log(`FHEBattle: ${battle.address}`);
  console.log(`ConfidentialGold: ${gold.address}`);
});

task("battle:register", "Register the caller in FHEBattle")
  .addOptionalParam("address", "Optionally specify the FHEBattle address")
  .setAction(async function (args: TaskArguments, hre) {
    const { ethers, deployments,fhevm } = hre;
    await fhevm.initializeCLIApi()
    const battleDeployment = args.address ? { address: args.address } : await deployments.get("FHEBattle");
    const signers = await ethers.getSigners();
    const battle = await ethers.getContractAt("FHEBattle", battleDeployment.address);
    const tx = await battle.connect(signers[0]).register();
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("battle:attack", "Attack a monster without providing input (contract derives it)")
  .addOptionalParam("address", "Optionally specify the FHEBattle address")
  .setAction(async function (args: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const battleDeployment = args.address ? { address: args.address } : await deployments.get("FHEBattle");
    const signers = await ethers.getSigners();
    const battle = await ethers.getContractAt("FHEBattle", battleDeployment.address);
    const tx = await battle.connect(signers[0]).attackMonster();
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("battle:decrypt", "Decrypt player attack, last result, and GOLD balance")
  .addOptionalParam("battle", "FHEBattle address")
  .addOptionalParam("gold", "ConfidentialGold address")
  .setAction(async function (args: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();
    const battleDeployment = args.battle ? { address: args.battle } : await deployments.get("FHEBattle");
    const goldDeployment = args.gold ? { address: args.gold } : await deployments.get("ConfidentialGold");
    const signers = await ethers.getSigners();

    const battle = await ethers.getContractAt("FHEBattle", battleDeployment.address);
    const gold = await ethers.getContractAt("ConfidentialGold", goldDeployment.address);

    const encAtk = await battle.getAttack(signers[0].address);
    console.log(`enc attack: ${encAtk}`);
    if (encAtk !== ethers.ZeroHash) {
      const atk = await fhevm.userDecryptEuint(FhevmType.euint32, encAtk, battleDeployment.address, signers[0]);
      console.log(`attack     : ${atk}`);
    }

    const encRes = await battle.getLastBattleWin(signers[0].address);
    console.log(`enc result : ${encRes}`);
    if (encRes !== ethers.ZeroHash) {
      const res = await fhevm.userDecryptEbool(FhevmType.ebool, encRes, battleDeployment.address, signers[0]);
      console.log(`result     : ${res ? "Win" : "Lose"}`);
    }

    const encBal = await gold.confidentialBalanceOf(signers[0].address);
    console.log(`enc GOLD   : ${encBal}`);
    if (encBal !== ethers.ZeroHash) {
      const bal = await fhevm.userDecryptEuint(FhevmType.euint64, encBal, goldDeployment.address, signers[0]);
      console.log(`GOLD       : ${bal}`);
    }
  });

task("battle:simulate", "Deploy locally on hardhat network and run register/attack/decrypt")
  .setAction(async function (_: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    if (hre.network.name !== 'hardhat') {
      console.log(`Use --network hardhat to run this simulation without an external node.`);
    }

    await deployments.fixture(["FHEBattle", "ConfidentialGold"]);
    await fhevm.initializeCLIApi();

    const battleDeployment = await deployments.get("FHEBattle");
    const goldDeployment = await deployments.get("ConfidentialGold");
    const signers = await ethers.getSigners();
    const alice = signers[0];

    const battle = await ethers.getContractAt("FHEBattle", battleDeployment.address);
    const gold = await ethers.getContractAt("ConfidentialGold", goldDeployment.address);

    console.log(`FHEBattle=${battleDeployment.address}`);
    console.log(`ConfidentialGold=${goldDeployment.address}`);

    // Register
    console.log(`Registering...`);
    await (await battle.connect(alice).register()).wait();

    // Read and decrypt attack power
    const encAtk = await battle.getAttack(alice.address);
    const atk = await fhevm.userDecryptEuint(FhevmType.euint32, encAtk, battleDeployment.address, alice);
    console.log(`Attack=${atk}`);

    // Attack: contract derives monster internally
    await (await battle.connect(alice).attackMonster()).wait();
    const encGold1 = await gold.confidentialBalanceOf(alice.address);
    const gold1 = await fhevm.userDecryptEuint(FhevmType.euint64, encGold1, goldDeployment.address, alice);
    console.log(`GOLD after win=${gold1}`);

    // Attack again
    await (await battle.connect(alice).attackMonster()).wait();
    const encGold2 = await gold.confidentialBalanceOf(alice.address);
    const gold2 = await fhevm.userDecryptEuint(FhevmType.euint64, encGold2, goldDeployment.address, alice);
    console.log(`GOLD after lose=${gold2}`);
  });
