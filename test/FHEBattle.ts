import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { deployments, ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { FHEBattle, ConfidentialGold } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

describe("FHEBattle", function () {
  let signers: Signers;
  let battle: FHEBattle;
  let gold: ConfidentialGold;
  let battleAddress: string;
  let goldAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    await deployments.fixture([]);

    const GoldDeployment = await deployments.deploy("ConfidentialGold", {
      from: signers.deployer.address,
      log: true,
    });
    goldAddress = GoldDeployment.address;
    gold = (await ethers.getContractAt("ConfidentialGold", goldAddress)) as unknown as ConfidentialGold;

    const BattleDeployment = await deployments.deploy("FHEBattle", {
      from: signers.deployer.address,
      args: [goldAddress],
      log: true,
    });
    battleAddress = BattleDeployment.address;
    battle = (await ethers.getContractAt("FHEBattle", battleAddress)) as unknown as FHEBattle;

    // authorize battle as GOLD minter
    const tx = await gold.connect(signers.deployer).authorizeMinter(battleAddress);
    await tx.wait();
  });

  it("register assigns encrypted attack power in range", async function () {
    expect(await battle.isRegistered(signers.alice.address)).to.eq(false);

    await (await battle.connect(signers.alice).register()).wait();
    expect(await battle.isRegistered(signers.alice.address)).to.eq(true);

    const encAtk = await battle.getAttack(signers.alice.address);
    expect(encAtk).to.not.eq(ethers.ZeroHash);

    const clearAtk = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encAtk,
      battleAddress,
      signers.alice,
    );
    expect(clearAtk).to.be.gte(10);
    expect(clearAtk).to.be.lte(100);
  });

  it("attack monster yields win/lose and mint rewards", async function () {
    // Register Alice
    await (await battle.connect(signers.alice).register()).wait();

    const encAtk = await battle.getAttack(signers.alice.address);
    const atk = await fhevm.userDecryptEuint(FhevmType.euint32, encAtk, battleAddress, signers.alice);

    // Create encrypted monster power = atk - 1 (ensure win)
    const encInputWin = await fhevm
      .createEncryptedInput(battleAddress, signers.alice.address)
      .add32(Math.max(0, Number(atk - 1n)))
      .encrypt();

    await (
      await battle.connect(signers.alice).attackMonster(encInputWin.handles[0], encInputWin.inputProof)
    ).wait();

    const winFlag = await battle.getLastBattleWin(signers.alice.address);
    const clearWin = await fhevm.userDecryptEbool(FhevmType.ebool, winFlag, battleAddress, signers.alice);
    expect(clearWin).to.eq(true);

    // GOLD balance should be 100
    const encBal1 = await gold.balanceOf(signers.alice.address);
    const bal1 = await fhevm.userDecryptEuint(FhevmType.euint32, encBal1, goldAddress, signers.alice);
    expect(bal1).to.eq(100);

    // Now lose: monster = atk + 1
    const looseInput = await fhevm
      .createEncryptedInput(battleAddress, signers.alice.address)
      .add32(Number(atk + 1n))
      .encrypt();

    await (
      await battle.connect(signers.alice).attackMonster(looseInput.handles[0], looseInput.inputProof)
    ).wait();

    const winFlag2 = await battle.getLastBattleWin(signers.alice.address);
    const clearWin2 = await fhevm.userDecryptEbool(FhevmType.ebool, winFlag2, battleAddress, signers.alice);
    expect(clearWin2).to.eq(false);

    // GOLD balance should now be 110 (100 + 10)
    const encBal2 = await gold.balanceOf(signers.alice.address);
    const bal2 = await fhevm.userDecryptEuint(FhevmType.euint32, encBal2, goldAddress, signers.alice);
    expect(bal2).to.eq(110);
  });
});

