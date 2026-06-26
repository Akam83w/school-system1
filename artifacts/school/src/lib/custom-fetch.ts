let _baseUrl = "http://localhost:5173";

export const customFetch = async (config: any) => {
  const token = localStorage.getItem("school_token");

  const response = await fetch(_baseUrl + config.url, {
    method: config.method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: config.data ? JSON.stringify(config.data) : undefined,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }

  return response.json();
};
