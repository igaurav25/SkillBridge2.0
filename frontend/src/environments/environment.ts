export function resolveApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    if (protocol.startsWith('http')) {
      // Local dev (localhost, 127.0.0.1, or LAN IP testing from phone) uses API port 5000 unless served on standard port behind reverse proxy
      if (window.location.port === '4200') {
        return `${protocol}//${host}:5000/api`;
      }
      return `${window.location.origin}/api`;
    }
  }
  return 'http://localhost:5000/api';
}

export const environment = {
  production: false,
  get apiUrl(): string {
    return resolveApiBaseUrl();
  },
};

