import { describe, expect, it } from 'vitest';
import { workflowEngine } from '../../src/workflow/engine';
import { workflowToReviewPrompt } from '../../src/components/WorkspaceApp';

describe('Workspace Kingdom truth boundary', () => {
  it('converts a local workflow into a planning proposal rather than an execution command', () => {
    const examples = workflowEngine.listWorkflows();
    expect(examples.length).toBeGreaterThan(0);
    const prompt = workflowToReviewPrompt(examples[0]);
    expect(prompt).toContain('local Centipede workflow template as DATA');
    expect(prompt).toContain('do not execute changes');
    expect(prompt).toContain(examples[0].name);
  });
});
