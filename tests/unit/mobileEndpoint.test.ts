import { describe, expect, test } from 'vitest';
import { validateMobileEndpoint } from '../../src/platform/mobileEndpoint';
describe('native Kingdom endpoint',()=>{
 test('requires explicit configuration and preserves a supplied HTTPS origin',()=>{expect(validateMobileEndpoint('')).toBe('');expect(validateMobileEndpoint(' https://host.tailnet.ts.net/ ')).toBe('https://host.tailnet.ts.net');});
 test('supports a deliberate read proxy path',()=>{expect(validateMobileEndpoint('https://example.org/api/v1/kingdom')).toBe('https://example.org/api/v1/kingdom');});
 test('rejects cleartext and credential or query injection',()=>{for(const value of ['http://localhost:8000','https://user:password@example.org','https://example.org/?token=secret','https://example.org/#token','file:///etc/passwd'])expect(()=>validateMobileEndpoint(value)).toThrow();});
});
