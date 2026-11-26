import { SECURITY_OPTIONS, type NetworkSecurity } from './types';

export { SECURITY_OPTIONS };

export function securityLabel(security: NetworkSecurity): string {
  return SECURITY_OPTIONS.find((o) => o.value === security)?.label ?? security;
}
