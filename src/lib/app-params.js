export const appParams = {
  appId: 'local_app',
  token: 'local_token',
  fromUrl: typeof window !== 'undefined' ? window.location.href : '',
  functionsVersion: 'v1',
  appBaseUrl: typeof window !== 'undefined' ? window.location.origin : ''
};
