import { useEffect, useMemo, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, usePublicClient } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { ethers } from 'ethers';

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
  const [encAtk, setEncAtk] = useState<`0x${string}` | null>(null);
  const [encWin, setEncWin] = useState<`0x${string}` | null>(null);
  const [encGold, setEncGold] = useState<`0x${string}` | null>(null);
  const [registered, setRegistered] = useState<boolean>(false);
  const [txError, setTxError] = useState<string | null>(null);
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
    const data = await publicClient.readContract({
      abi: ConfidentialGoldABI as any,
      address: CONTRACTS.ConfidentialGold as `0x${string}`,
      functionName: 'confidentialBalanceOf',
      args: [address as `0x${string}`],
    });
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

  const isAllZeroCiphertext = (data?: `0x${string}` | null) => {
    if (!data) return false;
    const hex = data.toLowerCase();
    if (!hex.startsWith('0x')) return false;
    const body = hex.slice(2);
    if (body.length === 0) return false;
    return /^0+$/.test(body);
  };

  const refresh = async () => {
    if (!isConnected || !address) return;
    setTxError(null);
    setAtk('-');
    setGold('-');
    setLastWin('-');
    // registration status
    try {
      const r = (await publicClient.readContract({
        abi: FHEBattleABI as any,
        address: CONTRACTS.FHEBattle as `0x${string}`,
        functionName: 'isRegistered',
        args: [address as `0x${string}`],
      })) as boolean;
      setRegistered(Boolean(r));
    } catch {
      setRegistered(false);
    }
    const a = await battleRead('getAttack');
    setEncAtk(a ?? null);
    const w = await battleRead('getLastBattleWin');
    setEncWin(w ?? null);
    const g = await goldRead();
    setEncGold(g ?? null);
  };

  const decryptAll = async () => {
    if (!address) return;
    // Attack
    if (isAllZeroCiphertext(encAtk)) {
      setAtk('0');
    } else if (encAtk) {
      const v = await decryptHandle(encAtk, CONTRACTS.FHEBattle);
      if (typeof v === 'number') setAtk(String(v));
    }
    // Last win
    if (isAllZeroCiphertext(encWin)) {
      setLastWin('0');
    } else if (encWin) {
      const v = await decryptHandle(encWin, CONTRACTS.FHEBattle);
      if (typeof v === 'boolean') setLastWin(v ? 'Win' : 'Lose');
    }
    // Gold
    if (isAllZeroCiphertext(encGold)) {
      setGold('0');
    } else if (encGold) {
      const v = await decryptHandle(encGold, CONTRACTS.ConfidentialGold);
      if (typeof v === 'number') setGold(String(v));
    }
  };

  useEffect(() => {
    // Load encrypted values only; do not decrypt automatically
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  const register = async () => {
    const signer = await ethersSignerPromise;
    if (!signer) return;
    const contract = new ethers.Contract(CONTRACTS.FHEBattle, FHEBattleABI as any, signer);
    const tx = await contract.register();
    await tx.wait();
    // After registration, only refresh encrypted values; do not auto-decrypt
    await refresh();
  };

  const attack = async () => {
    if (!address) return;
    const signer = await ethersSignerPromise;
    if (!signer) return;
    const contract = new ethers.Contract(CONTRACTS.FHEBattle, FHEBattleABI as any, signer);
    try {
      setTxError(null);
      const tx = await contract.attackMonster();
      await tx.wait();
      await refresh();
    } catch (e: any) {
      const msg: string = e?.message || String(e);
      if (/Not registered/i.test(msg)) {
        setTxError('You must register before attacking.');
      } else if (/missing revert data|CALL_EXCEPTION/i.test(msg)) {
        setTxError('Attack failed. Please ensure frontend ABI/addresses match the deployed contracts.');
      } else {
        setTxError(msg);
      }
    }
  };

  return (
    <div className="app">
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
          <p>Status: {registered ? 'Registered' : 'Not Registered'}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={register}>Register</button>
            <button onClick={refresh}>Refresh</button>
            <button onClick={decryptAll} disabled={!zama || zamaLoading}>
              Decrypt
            </button>
          </div>
          {txError ? (
            <p style={{ color: '#b91c1c', marginTop: 8 }}>{txError}</p>
          ) : null}
        </div>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#fff' }}>
          <h3>Attack Monster</h3>
          <div>Monster power is chosen by contract</div>
          <button style={{ marginTop: 8 }} onClick={attack} disabled={!registered}>
            Attack
          </button>
        </div>
      </main>
    </div>
  );
}
