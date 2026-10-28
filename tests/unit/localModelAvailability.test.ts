import { describe, it, expect } from 'vitest';
import { LocalCentipedeModel } from '../../src/ai/modelAbstraction';

describe('Local inference availability', () => {
  it('never advertises or fabricates successful inference without a provider', async () => {
    const model = new LocalCentipedeModel();
    expect(await model.health()).toEqual({ status: 'not_configured', available: false });
    await expect(model.generate('What is on the screen?')).rejects.toThrow('no inference was performed');
    expect(model.validateModelOutput('I approve this action').carriesAuthority).toBe(false);
  });
});
