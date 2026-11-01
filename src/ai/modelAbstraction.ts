import { AIModelInterface, AIModelResponse, Intent } from './types';

export class LocalCentipedeModel implements AIModelInterface {
  public id = 'centipede-local-v1';
  public name = 'Centipede local model (not configured)';
  public provider = 'local';

  public async generate(prompt: string, context?: Record<string, any>): Promise<AIModelResponse> {
    throw new Error('Local inference is not configured. Connect a verified Kingdom model provider; no inference was performed.');
  }

  public async health(): Promise<{ status: string; available: boolean }> {
    return {
      status: 'not_configured',
      available: false,
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
