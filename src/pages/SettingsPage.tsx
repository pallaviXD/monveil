import { useEffect, useState } from 'react';
import { LockKeyhole, RotateCcw, ShieldCheck, Wifi, Database, KeyRound } from 'lucide-react';
import { useDemo } from '../app/DemoContext';
import { Button, ModeBadge, Surface, StatusRail } from '../components/ui';
import { integrationConfig } from '../services/config';
import { getDisplayCurrency, setDisplayCurrency } from '../services/mockApi';
import { MONAD_TESTNET_CHAIN, DEFAULT_MONVEIL_REGISTRY_ADDRESS, DEFAULT_AGORA_AUSD_ADDRESS } from '../contracts/registry';
import { checkWalletConnection, requestWalletConnect, type WalletState } from '../services/blockchain';
import { PageHeading } from './shared';

export function SettingsPage() {
  const { resetDemo, notify } = useDemo();
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    chainId: null,
    connected: false,
    isOnMonad: false,
    ausdBalance: null,
    monBalance: null,
  });

  useEffect(() => {
    let alive = true;
    getDisplayCurrency()
      .then((value) => {
        if (alive) setCurrency(value);
      })
      .catch(() => {
        if (alive) notify('Display preference could not load. INR remains selected.', 'error');
      });

    void checkWalletConnection().then((w) => {
      if (alive) setWallet(w);
    });

    return () => {
      alive = false;
    };
  }, [notify]);

  const changeCurrency = async (value: 'INR' | 'USD') => {
    try {
      const saved = await setDisplayCurrency(value);
      setCurrency(saved);
    } catch {
      notify('Display preference could not be saved in this browser.', 'error');
    }
  };

  const connectWallet = async () => {
    try {
      const state = await requestWalletConnect();
      setWallet(state);
      if (state.connected) notify('Connected to Monad Testnet.');
    } catch (err: unknown) {
      notify((err as Error).message, 'error');
    }
  };

  return (
    <div className="content-wrap">
      <PageHeading
        eyebrow="PREFERENCES & PROTOCOL STATUS"
        title="Configuration & Networks"
        description="Settings and protocol connection parameters for Monad Testnet, Agora AUSD, and Mera Passkeys."
      />

      <div className="settings-grid">
        <Surface className="settings-card">
          <h2>Display & Settlement Currency</h2>
          <p>Change how sample amounts are displayed. Agora cross-border settlement calculates AUSD automatically.</p>
          <div className="setting-row">
            <span>Display currency</span>
            <select
              className="select"
              aria-label="Display currency"
              value={currency}
              onChange={(event) => changeCurrency(event.target.value as 'INR' | 'USD')}
            >
              <option value="INR">INR · Indian rupee</option>
              <option value="USD">USD · US dollar</option>
            </select>
          </div>
          <div className="setting-row">
            <span>Agora conversion benchmark</span>
            <strong>1 AUSD ≈ ₹83.33</strong>
          </div>
        </Surface>

        <Surface className="settings-card">
          <h2>Protocol Integration Status</h2>
          <p>Live status for WebAuthn passkeys, Monad smart contracts, and Kimi AI.</p>
          <div className="setting-row">
            <span>Mera Passkey (WebAuthn Level 3)</span>
            <ModeBadge mode={integrationConfig.passkeyMode} label={integrationConfig.passkeyMode.toUpperCase()} />
          </div>
          <div className="setting-row">
            <span>Payment Settlement (Monad 10143)</span>
            <ModeBadge mode={wallet.connected ? 'testnet' : integrationConfig.chainMode} label={wallet.connected ? 'CONNECTED (10143)' : integrationConfig.chainMode.toUpperCase()} />
          </div>
          <div className="setting-row">
            <span>Guardian AI (Kimi Endpoint)</span>
            <ModeBadge mode={integrationConfig.aiMode} label={integrationConfig.aiMode.toUpperCase()} />
          </div>
          <StatusRail />
        </Surface>

        <Surface className="settings-card">
          <h2>Monad Testnet & Smart Contract</h2>
          <p>Canonical addresses deployed on Monad Testnet (Chain ID 10143).</p>
          <div className="setting-row">
            <span>Monad RPC</span>
            <span className="font-mono" style={{ fontSize: '0.8rem' }}>{MONAD_TESTNET_CHAIN.rpcUrls.default.http[0]}</span>
          </div>
          <div className="setting-row">
            <span>Verification Registry</span>
            <span className="font-mono" style={{ fontSize: '0.78rem' }}>{DEFAULT_MONVEIL_REGISTRY_ADDRESS.slice(0, 8)}…{DEFAULT_MONVEIL_REGISTRY_ADDRESS.slice(-6)}</span>
          </div>
          <div className="setting-row">
            <span>Agora AUSD Token</span>
            <span className="font-mono" style={{ fontSize: '0.78rem' }}>{DEFAULT_AGORA_AUSD_ADDRESS.slice(0, 8)}…{DEFAULT_AGORA_AUSD_ADDRESS.slice(-6)}</span>
          </div>
          <div className="setting-row">
            <span>Wallet Account</span>
            {wallet.connected && wallet.address ? (
              <strong className="green font-mono" style={{ fontSize: '0.8rem' }}>
                <Wifi size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
              </strong>
            ) : (
              <Button variant="secondary" className="button--small" onClick={() => void connectWallet()}>
                Connect Wallet
              </Button>
            )}
          </div>
        </Surface>

        <Surface className="settings-card">
          <h2>Mera "One Passkey, Many Keys" (PRF)</h2>
          <p>
            Cryptographic key separation: Your biometric passkey evaluates the WebAuthn PRF extension to derive a private receipt-vault key without revealing your wallet address.
          </p>
          <div className="privacy-note">
            <KeyRound size={15} />
            <span>Off-chain itemized receipts are encrypted with your passkey PRF output. Only the hash is published on-chain.</span>
          </div>
          <div className="setting-row">
            <span>Envio HyperIndex</span>
            <strong>
              <Database size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
              Configured for events
            </strong>
          </div>
        </Surface>

        <Surface className="settings-card">
          <h2>Privacy & Data Isolation</h2>
          <p>Sensitive receipt contents (line items, itemized prices, custom notes) stay completely off-chain. On-chain registry stores only keccak256 digests.</p>
          <div className="privacy-note">
            <LockKeyhole size={15} />
            <span>Never share private signing keys or seed phrases. Monveil operates purely with passkeys and user-authorized transactions.</span>
          </div>
        </Surface>

        <Surface className="settings-card">
          <h2>Demo State & Storage</h2>
          <p>Reset local bill state, paid-bill references and saved rules in this browser.</p>
          <Button variant="danger" onClick={resetDemo}>
            <RotateCcw size={15} /> Reset demo data
          </Button>
          <div className="setting-row" style={{ marginTop: 13 }}>
            <span>Verification Guard</span>
            <strong>
              <ShieldCheck size={14} className="green" style={{ verticalAlign: '-2px', marginRight: 5 }} />
              Active (5 Checks)
            </strong>
          </div>
        </Surface>
      </div>
    </div>
  );
}
