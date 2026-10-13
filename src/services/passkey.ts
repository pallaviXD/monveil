/**
 * MERA PASSKEY & "ONE PASSKEY, MANY KEYS" (PRF EXTENSION) IMPLEMENTATION
 *
 * Implements genuine WebAuthn Level 3 passkey registration and authentication.
 * Implements the official WebAuthn PRF (Pseudo-Random Function) extension (hmac-create-secret)
 * for privacy-preserving, merchant-scoped receipt encryption key derivation.
 *
 * Use Case: Sensitive receipt details (item names, private order notes, tax breakdown)
 * are encrypted locally using a key derived from the user's passkey PRF output.
 * On-chain, only the privacy-preserving reportHash is committed.
 */

export interface PasskeyAccount {
  credentialId: string;
  rawId: string;
  type: 'public-key';
  algorithm: number;
  prfSupported: boolean;
  derivedKeyFingerprint?: string;
  isSimulated: boolean;
  registeredAt: number;
}

export interface EncryptedReceiptVault {
  ciphertext: string;
  iv: string;
  keyFingerprint: string;
  merchantScope: string;
  encryptedAt: number;
  /**
   * 'prf'       — key was derived from real WebAuthn PRF output (hardware-bound, passkey-scoped).
   * 'fallback'  — key was derived from a hash of merchantScope; NOT hardware-bound.
   *               This still encrypts the data but provides no passkey-level security guarantee.
   *               Always shown to the user — never labelled as PRF encryption.
   */
  keySource: 'prf' | 'fallback';
}

const STORAGE_KEYS = {
  CREDENTIAL: 'monveil.passkey.credential.v1',
} as const;

// Deterministic 32-byte salt for PRF derivation
const DEFAULT_PRF_SALT = new Uint8Array([
  0x6d, 0x6f, 0x6e, 0x76, 0x65, 0x69, 0x6c, 0x2d, // "monveil-"
  0x70, 0x61, 0x73, 0x73, 0x6b, 0x65, 0x79, 0x2d, // "passkey-"
  0x72, 0x65, 0x63, 0x65, 0x69, 0x70, 0x74, 0x2d, // "receipt-"
  0x76, 0x61, 0x75, 0x6c, 0x74, 0x2d, 0x76, 0x31, // "vault-v1"
]);

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function isPasskeySupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof window.navigator.credentials !== 'undefined'
  );
}

/**
 * Registers a genuine WebAuthn Passkey with PRF extension requested.
 */
export async function registerPasskey(userName = 'monveil-user'): Promise<PasskeyAccount> {
  if (!isPasskeySupported()) {
    return createSimulatedAccount();
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const createOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'Monveil Safe-Pay',
        id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
      },
      user: {
        id: userId,
        name: `${userName}@monveil.xyz`,
        displayName: 'Monveil Consumer User',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256 (ECDSA w/ SHA-256)
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
      extensions: {
        // Request WebAuthn PRF (One Passkey, Many Keys capability)
        prf: {
          eval: {
            first: DEFAULT_PRF_SALT,
          },
        },
      } as unknown as AuthenticationExtensionsClientInputs,
    };

    const credential = (await navigator.credentials.create({
      publicKey: createOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error('Credential creation was cancelled or returned empty.');
    }

    const clientExtensions = credential.getClientExtensionResults() as Record<string, unknown>;
    const prfResults = clientExtensions.prf as { enabled?: boolean; results?: { first?: ArrayBuffer } } | undefined;
    const prfSupported = Boolean(prfResults?.enabled || prfResults?.results?.first);

    let keyFingerprint: string | undefined;
    if (prfResults?.results?.first) {
      const prfBytes = new Uint8Array(prfResults.results.first);
      const hash = await crypto.subtle.digest('SHA-256', prfBytes);
      keyFingerprint = toBase64Url(hash).slice(0, 16);
    }

    const account: PasskeyAccount = {
      credentialId: credential.id,
      rawId: toBase64Url(credential.rawId),
      type: 'public-key',
      algorithm: -7,
      prfSupported,
      derivedKeyFingerprint: keyFingerprint,
      isSimulated: false,
      registeredAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEYS.CREDENTIAL, JSON.stringify(account));
    return account;
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === 'NotAllowedError') {
      // User explicitly dismissed the passkey prompt — propagate so UI can inform them
      throw new Error('Passkey creation was cancelled by the user.');
    }
    if (err.name === 'NotSupportedError') {
      throw new Error('This device or browser does not support the required passkey features.');
    }
    if (err.name === 'SecurityError') {
      throw new Error('Passkey registration failed due to a security restriction (RP ID mismatch or insecure context).');
    }
    // Hardware authenticator absent or other unexpected error — fall back to simulated session
    // and clearly mark it as simulated so callers can expose that to the user.
    console.warn('Passkey hardware prompt unavailable, activating simulated passkey session:', err.message);
    return createSimulatedAccount();
  }
}

/**
 * Authenticates with an existing Passkey and derives PRF key material.
 */
export async function authenticatePasskey(): Promise<{
  account: PasskeyAccount;
  prfKey?: CryptoKey;
}> {
  if (!isPasskeySupported()) {
    const simulated = createSimulatedAccount();
    return { account: simulated };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CREDENTIAL);
    const existing: PasskeyAccount | null = saved ? JSON.parse(saved) : null;

    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const requestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
      userVerification: 'preferred',
      timeout: 60000,
      allowCredentials: existing?.rawId
        ? [{ id: fromBase64Url(existing.rawId), type: 'public-key' }]
        : undefined,
      extensions: {
        // Evaluate PRF to derive encryption key
        prf: {
          eval: {
            first: DEFAULT_PRF_SALT,
          },
        },
      } as unknown as AuthenticationExtensionsClientInputs,
    };

    const assertion = (await navigator.credentials.get({
      publicKey: requestOptions,
    })) as PublicKeyCredential | null;

    if (!assertion) {
      throw new Error('Passkey authentication was cancelled.');
    }

    const clientExtensions = assertion.getClientExtensionResults() as Record<string, unknown>;
    const prfResults = clientExtensions.prf as { results?: { first?: ArrayBuffer } } | undefined;
    let prfKey: CryptoKey | undefined;
    let fingerprint: string | undefined;

    if (prfResults?.results?.first) {
      const rawPrf = new Uint8Array(prfResults.results.first);
      prfKey = await crypto.subtle.importKey(
        'raw',
        rawPrf,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      const hash = await crypto.subtle.digest('SHA-256', rawPrf);
      fingerprint = toBase64Url(hash).slice(0, 16);
    }

    const account: PasskeyAccount = {
      credentialId: assertion.id,
      rawId: toBase64Url(assertion.rawId),
      type: 'public-key',
      algorithm: -7,
      prfSupported: Boolean(prfResults?.results?.first),
      derivedKeyFingerprint: fingerprint ?? existing?.derivedKeyFingerprint,
      isSimulated: false,
      registeredAt: existing?.registeredAt ?? Date.now(),
    };

    localStorage.setItem(STORAGE_KEYS.CREDENTIAL, JSON.stringify(account));
    return { account, prfKey };
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === 'NotAllowedError') {
      // User explicitly dismissed — do not silently simulate; let the caller decide
      throw new Error('Passkey authentication was cancelled by the user.');
    }
    if (err.name === 'NotSupportedError') {
      throw new Error('This browser or authenticator does not support the required passkey features.');
    }
    if (err.name === 'SecurityError') {
      throw new Error('Passkey authentication failed due to a security restriction.');
    }
    // Other unexpected errors (e.g. no authenticator available) — fall back to simulated session
    console.warn('Passkey authentication unavailable, falling back to simulated session:', err.message);
    const simulated = createSimulatedAccount();
    return { account: simulated };
  }
}

/**
 * Encrypts private receipt payload using PRF-derived key material or a deterministic fallback.
 *
 * When `key` is provided it came from a real WebAuthn PRF evaluation → keySource='prf'.
 * When `key` is absent, a key is derived from a hash of merchantScope → keySource='fallback'.
 * The fallback still encrypts the data but is NOT hardware-bound and NOT passkey-scoped.
 * The caller must surface keySource to the user so they know which protection level was applied.
 */
export async function encryptReceiptWithPrf(
  receiptData: Record<string, unknown>,
  merchantScope = 'default-merchant',
  key?: CryptoKey
): Promise<EncryptedReceiptVault> {
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(receiptData));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  let cryptoKey = key;
  const keySource: 'prf' | 'fallback' = key ? 'prf' : 'fallback';

  if (!cryptoKey) {
    // Fallback: deterministic AES key from merchant scope hash.
    // This is NOT hardware-bound. It does not provide PRF-level security.
    const rawKey = await crypto.subtle.digest(
      'SHA-256',
      enc.encode(`monveil-vault-key-${merchantScope}`)
    );
    cryptoKey = await crypto.subtle.importKey(
      'raw',
      rawKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    plaintext
  );

  return {
    ciphertext: toBase64Url(ciphertextBuffer),
    iv: toBase64Url(iv.buffer),
    keyFingerprint: toBase64Url(await crypto.subtle.digest('SHA-256', enc.encode(merchantScope))).slice(0, 12),
    merchantScope,
    encryptedAt: Date.now(),
    keySource,
  };
}

function createSimulatedAccount(): PasskeyAccount {
  return {
    credentialId: `sim-passkey-${Date.now().toString(36)}`,
    rawId: `sim-raw-${Date.now().toString(36)}`,
    type: 'public-key',
    algorithm: -7,
    prfSupported: true,
    derivedKeyFingerprint: 'prf-demo-7f8e',
    isSimulated: true,
    registeredAt: Date.now(),
  };
}
