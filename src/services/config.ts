import type { Mode } from '../domain/types';

export const integrationConfig = {
  get passkeyMode(): Mode {
    if (typeof window !== 'undefined' && localStorage.getItem('monveil.passkey.credential.v1')) {
      return 'testnet';
    }
    return 'demo';
  },
  get chainMode(): Mode {
    if (typeof window !== 'undefined' && localStorage.getItem('monveil.wallet.connected') === 'true') {
      return 'testnet';
    }
    return 'demo';
  },
  get aiMode(): Mode {
    return 'testnet';
  },
};
