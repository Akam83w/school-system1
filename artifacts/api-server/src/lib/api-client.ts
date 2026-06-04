const BASE_URL = "http://localhost:3000";

export const customFetch = async (url: string, options: any = {}) => {
  const token = localStorage.getItem("school_token");

  return fetch(BASE_URL + url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
};
