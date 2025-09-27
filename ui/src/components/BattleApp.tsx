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
import './BattleApp.css';

export function BattleApp() {
  const { address, isConnected } = useAccount();
  const wagmiPublic = usePublicClient();
  const [atk, setAtk] = useState<string>('***');
  const [gold, setGold] = useState<string>('***');
  const [lastWin, setLastWin] = useState<string>('***');
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

  // Single-call batch decrypt is implemented in decryptAll()

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
    setAtk('***');
    setGold('***');
    setLastWin('***');
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
    if (!address || !zama) return;
    const signer = await ethersSignerPromise;
    if (!signer) return;

    try {
      setTxError(null);
      type Item = { handle: string; contractAddress: string };
      const items: Item[] = [];
      console.log("decryptAll:",encAtk,encGold,encWin);
      
      // Prepare batch and handle zero-ciphertexts immediately
      if (encAtk) {
        if (isAllZeroCiphertext(encAtk)) {
          setAtk('0');
        } else {
          items.push({ handle: encAtk, contractAddress: CONTRACTS.FHEBattle });
        }
      }
      if (encWin) {
        if (isAllZeroCiphertext(encWin)) {
          setLastWin('0');
        } else {
          items.push({ handle: encWin, contractAddress: CONTRACTS.FHEBattle });
        }
      }
      if (encGold) {
        if (isAllZeroCiphertext(encGold)) {
          setGold('0');
        } else {
          items.push({ handle: encGold, contractAddress: CONTRACTS.ConfidentialGold });
        }
      }

      if (items.length === 0) return;

      const keypair = zama.generateKeypair();
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';
      const contracts = Array.from(new Set(items.map((i) => i.contractAddress)));
      const eip712 = zama.createEIP712(keypair.publicKey, contracts, startTimeStamp, durationDays);
      const signature = await (signer as any).signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );

      const result = await zama.userDecrypt(
        items,
        keypair.privateKey,
        keypair.publicKey,
        (signature as string).replace('0x', ''),
        contracts,
        address,
        startTimeStamp,
        durationDays,
      );
      console.log("decryptAll result:",result);
      
      // Map results
      if (encAtk && result[encAtk] !== undefined) {
        const v = result[encAtk];
        console.log("attack:",v);
        setAtk(String(v));
      }
      if (encWin && result[encWin] !== undefined) {
        const v = result[encWin] as boolean | string | number;
        if (typeof v === 'boolean') setLastWin(v ? 'Win' : 'Lose');
        // If relayer encodes boolean as string/number, fall back to truthy check
        else setLastWin(v ? 'Win' : 'Lose');
      }
      if (encGold && result[encGold] !== undefined) {
        const v = result[encGold];
        setGold(String(v));
      }
    } catch (e: any) {
      const msg: string = e?.message || String(e);
      setTxError(`Decryption failed: ${msg}`);
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
    <div className="battle-app">
      <main className="battle-main">
        {/* Header Section */}
        <div className="battle-header">
          <h1 className="battle-title">⚔️ FHE BATTLE</h1>
          <ConnectButton />
        </div>

        {/* Player Information Card */}
        <div className="battle-card player-card">
          <h2 className="card-title">🛡️ Player Statistics</h2>

          <div className="player-stats">
            <div className="stat-item">
              <div className="stat-label">Attack Power</div>
              <div className={`stat-value attack ${atk === '***' ? 'encrypted' : ''}`}>
                {atk === '***' ? '🔒 Encrypted' : `⚔️ ${atk}`}
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-label">Last Battle</div>
              <div className={`stat-value ${
                lastWin === 'Win' ? 'result-win' :
                lastWin === 'Lose' ? 'result-lose' :
                'encrypted'
              }`}>
                {lastWin === '***' ? '🔒 Encrypted' :
                 lastWin === 'Win' ? '🏆 Victory' :
                 lastWin === 'Lose' ? '💀 Defeat' : lastWin}
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-label">Gold Balance</div>
              <div className={`stat-value gold ${gold === '***' ? 'encrypted' : ''}`}>
                {gold === '***' ? '🔒 Encrypted' : `💰 ${gold}`}
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-label">Registration</div>
              <div className={`status-indicator ${registered ? 'status-registered' : 'status-unregistered'}`}>
                {registered ? '✅ Registered' : '❌ Unregistered'}
              </div>
            </div>
          </div>

          <div className="button-group">
            {!registered && (
              <button
                className="battle-button button-primary"
                onClick={register}
                disabled={!isConnected}
              >
                🎮 Register
              </button>
            )}

            <button
              className="battle-button button-secondary"
              onClick={refresh}
              disabled={!isConnected}
            >
              🔄 Refresh
            </button>

            <button
              className={`battle-button ${
                encAtk || encWin || encGold ? 'button-success' : 'button-secondary'
              }`}
              onClick={decryptAll}
              disabled={!zama || zamaLoading || !isConnected}
            >
              {zamaLoading ? '⏳ Loading...' : '🔓 Decrypt'}
            </button>
          </div>

          {txError && (
            <div className="error-message">
              {txError}
            </div>
          )}
        </div>

        {/* Monster Battle Card */}
        <div className="battle-card monster-card">
          <h2 className="card-title">🐉 Monster Arena</h2>

          <div className="monster-description">
            Enter the arena and face fierce monsters! Each battle tests your courage and skill.
            Victory rewards you with precious GOLD, but defeat teaches valuable lessons.
          </div>

          <div className="button-group">
            {registered ? (
              <button
                className="battle-button button-danger"
                onClick={attack}
                disabled={!isConnected}
              >
                ⚔️ Attack Monster
              </button>
            ) : (
              <button
                className="battle-button button-disabled"
                disabled
              >
                🔒 Register First
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
