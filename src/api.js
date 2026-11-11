import fetch from "node-fetch";

export class ApiClient {
  constructor(token) {
    this.token = token;
  }

  fetch = async (path, method = "GET", body) => {
    const url = path.startsWith("http") ? path : `https://api.github.com${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `bearer ${this.token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || `HTTP ${res.status}: ${res.statusText}`);
    }
    return json;
  };

  fetchGq = async (query, variables) => {
    const json = await this.fetch("/graphql", "POST", { query, variables });
    if (json.errors && json.errors.length > 0) {
      throw new Error(json.errors.map((e) => e.message).join("; "));
    }
    return json;
  };
}
