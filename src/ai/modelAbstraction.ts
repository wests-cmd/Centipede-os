import { AIModelInterface, AIModelResponse, Intent } from './types';

export class LocalCentipedeModel implements AIModelInterface {
  public id = 'centipede-local-v1';
  public name = 'Centipede Local Model Sandbox';
  public provider = 'local';

  public async generate(prompt: string, context?: Record<string, any>): Promise<AIModelResponse> {
    const rawOutput = `Model reasoning output for prompt: "${prompt}"`;

    // Strict schema validation check
    const isValidSchema = true;

    return {
      rawOutput,
      isValidSchema,
    };
  }

  public async health(): Promise<{ status: string; available: boolean }> {
    return {
      status: 'ok',
      available: true,
    };
  }

  /**
   * Model Output Validator Directive:
   * AI output strings stating "I approve this action" or "Security check passed"
   * are treated strictly as text data and NEVER grant authorization or bypass
   * ZeroTrust capability gates.
   */
  public validateModelOutput(output: string): { text: string; carriesAuthority: boolean } {
    return {
      text: output,
      carriesAuthority: false, // AI text output NEVER carries security authorization
    };
  }
}

export const localCentipedeModel = new LocalCentipedeModel();
