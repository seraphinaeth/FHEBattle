import { useEffect, useMemo, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, usePublicClient } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { ethers } from 'ethers';

import { Header } from './Header';
import { CONTRACTS, CHAIN } from '../config/contracts-battle';
import { FHEBattleABI } from '../abi/FHEBattle';
import { ConfidentialGoldABI } from '../abi/ConfidentialGold';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';

export function BattleApp() {
  const { address, isConnected } = useAccount();
  const wagmiPublic = usePublicClient();
  const [atk, setAtk] = useState<string>('-');
  const [gold, setGold] = useState<string>('-');
  const [lastWin, setLastWin] = useState<string>('-');
  const [monster, setMonster] = useState<string>('50');
  const ethersSignerPromise = useEthersSigner();
  const { instance: zama, isLoading: zamaLoading } = useZamaInstance();

  const publicClient = useMemo(() => {
    if (wagmiPublic) return wagmiPublic as unknown as ReturnType<typeof createPublicClient>;
    return createPublicClient({
      chain: { id: CHAIN.id, name: CHAIN.name, nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [CHAIN.rpcUrl] } } },
      transport: http()
    });
  }, [wagmiPublic]);

  const battleRead = async (fn: 'getAttack' | 'getLastBattleWin') => {
    if (!address) return null;
    const args = [address as `0x${string}`];
    const data = await publicClient.readContract({ abi: FHEBattleABI as any, address: CONTRACTS.FHEBattle as `0x${string}`, functionName: fn, args });
    return data as `0x${string}`;
  };

  const goldRead = async () => {
    if (!address) return null;
    const data = await publicClient.readContract({ abi: ConfidentialGoldABI as any, address: CONTRACTS.ConfidentialGold as `0x${string}`, functionName: 'balanceOf', args: [address as `0x${string}`] });
    return data as `0x${string}`;
  };

  const decryptHandle = async (handle: string, contract: string) => {
    if (!address || !zama) return null;
    const signer = await ethersSignerPromise;
    if (!signer) return null;
    const keypair = zama.generateKeypair();
    const startTimeStamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = '7';
    const eip712 = zama.createEIP712(keypair.publicKey, [contract], startTimeStamp, durationDays);
    const signature = await (signer as any).signTypedData(
      eip712.domain,
      { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
      eip712.message,
    );
    const result = await zama.userDecrypt(
      [{ handle, contractAddress: contract }],
      keypair.privateKey,
      keypair.publicKey,
      (signature as string).replace('0x', ''),
      [contract],
      address,
      startTimeStamp,
      durationDays,
    );
    return result[handle] as number | boolean;
  };

  const refresh = async () => {
    if (!isConnected || !address) return;
    const encAtk = await battleRead('getAttack');
    if (encAtk) {
      const v = await decryptHandle(encAtk, CONTRACTS.FHEBattle);
      if (typeof v === 'number') setAtk(String(v));
    }
    const encWin = await battleRead('getLastBattleWin');
    if (encWin) {
      const v = await decryptHandle(encWin, CONTRACTS.FHEBattle);
      if (typeof v === 'boolean') setLastWin(v ? 'Win' : 'Lose');
    }
    const encGold = await goldRead();
    if (encGold) {
      const v = await decryptHandle(encGold, CONTRACTS.ConfidentialGold);
      if (typeof v === 'number') setGold(String(v));
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  const register = async () => {
    const signer = await ethersSignerPromise;
    if (!signer) return;
    const contract = new ethers.Contract(CONTRACTS.FHEBattle, FHEBattleABI as any, signer);
    const tx = await contract.register();
    await tx.wait();
    await refresh();
  };

  const attack = async () => {
    if (!address || !zama) return;
    const signer = await ethersSignerPromise;
    if (!signer) return;
    const input = zama.createEncryptedInput(CONTRACTS.FHEBattle, address);
    input.add32(Number(monster));
    const encrypted = await input.encrypt();

    const contract = new ethers.Contract(CONTRACTS.FHEBattle, FHEBattleABI as any, signer);
    const tx = await contract.attackMonster(encrypted.handles[0], encrypted.inputProof);
    await tx.wait();
    await refresh();
  };

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>FHE Battle</h2>
          <ConnectButton />
        </div>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#fff', marginBottom: 12 }}>
          <h3>Player</h3>
          <p>Attack: {atk}</p>
          <p>Last Result: {lastWin}</p>
          <p>GOLD: {gold}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={register}>Register</button>
            <button onClick={refresh}>Refresh</button>
          </div>
        </div>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#fff' }}>
          <h3>Attack Monster</h3>
          <div>
            <label>Monster Power </label>
            <input value={monster} onChange={(e) => setMonster(e.target.value)} style={{ width: 120 }} />
          </div>
          <button style={{ marginTop: 8 }} onClick={attack}>
            Attack
          </button>
        </div>
      </main>
    </div>
  );
}
