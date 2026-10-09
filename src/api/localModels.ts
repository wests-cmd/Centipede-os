export interface LocalModelInfo {
  name: string;
  model?: string;
  size?: number;
  modified_at?: string;
  details?: { family?: string; parameter_size?: string; quantization_level?: string };
}

export interface LocalModelCatalog {
  models: LocalModelInfo[];
}

async function request<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`/api/v1/local-models${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  let payload: any;
  try { payload = await response.json(); } catch { payload = null; }
  if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : `Local model request failed (${response.status}).`);
  return payload as T;
}

export const localModelsApi = {
  list: () => request<LocalModelCatalog>(''),
  pull: (model: string) => request<{ status?: string }>('/pull', { model }),
  createCustom: (model: string, from: string, system: string) => request<{ status?: string }>('/custom', { model, from, system }),
  summarize: async (model: string, goal: string, content: string) =>
    (await request<{ text: string }>('/summarize', { model, goal, content })).text,
  plan: async (model: string, goal: string, content: string) =>
    (await request<{ text: string }>('/plan', { model, goal, content })).text,
  describeImage: async (model: string, prompt: string, imageBase64: string) =>
    (await request<{ text: string }>('/vision', { model, prompt, imageBase64 })).text,
};
