import type { Mode } from '../domain/types';

export const integrationConfig: Readonly<{
  passkeyMode: Mode;
  chainMode: Mode;
  aiMode: Mode;
}> = Object.freeze({
  passkeyMode: 'demo',
  chainMode: 'demo',
  aiMode: 'demo',
});
