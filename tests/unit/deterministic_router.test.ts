import { describe, it, expect } from 'vitest';
import { routeQuickCommand } from '../../src/ai/deterministicRouter';

describe('Segmentor deterministic quick commands', () => {
  it('routes exact known shell destinations with no model', () => {
    expect(routeQuickCommand('  OPEN   Files  ')).toEqual({kind:'navigate',destination:'files'});
    expect(routeQuickCommand('show system status')).toEqual({kind:'navigate',destination:'command'});
    expect(routeQuickCommand('go to background work')).toEqual({kind:'navigate',destination:'background'});
  });
  it('never interprets arbitrary commands, compound requests or prototype properties', () => {
    for (const text of ['open files and delete them','open constructor','open __proto__','open https://example.com','sudo apt update','open Firefox']) {
      expect(routeQuickCommand(text)).toEqual({kind:'draft',text});
    }
    expect(routeQuickCommand('  ')).toEqual({kind:'empty'});
  });
});
