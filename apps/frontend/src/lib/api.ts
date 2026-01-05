export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (typeof envUrl === "string" && envUrl.length > 0) {
    return envUrl;
  }

  return "http://localhost:4000";
};

export const apiFetch = async (path: string, init?: RequestInit): Promise<Response> => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
    },
  });
};
