/** Minimal stub replacing app-multi apiClient for editor image import. */
export const apiClient = {
  async post<T>(_path: string, _body?: unknown): Promise<{ data?: T; error?: string }> {
    return { error: "not_supported" };
  },
};
