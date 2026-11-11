import { isProgrammingLanguage } from "./filter.js";

/**
 * Fetches all repositories for the user and computes total bytes per programming language.
 *
 * @param {import("./api.js").ApiClient} api
 * @param {string} username
 * @param {object} [options]
 * @returns {Promise<{ languages: Array<{ name: string, bytes: number, percent: number }>, totalBytes: number, repoCount: number }>}
 */
export const fetchAllProjectLanguages = async (api, username, options = {}) => {
  const {
    includeForks = false,
    ownerAffiliations = ["OWNER", "COLLABORATOR", "ORGANIZATION_MEMBER"],
    excludeRepos = [],
    customExcludedLanguages = [],
  } = options;

  const rawBytes = {};
  let totalRepoCount = 0;
  let hasNextPage = true;
  let cursor = null;

  console.log(`Fetching projects for user: ${username}...`);

  while (hasNextPage) {
    const query = `
      query($login: String!, $cursor: String, $affiliations: [RepositoryAffiliation]) {
        user(login: $login) {
          repositories(
            first: 100
            after: $cursor
            isFork: ${includeForks ? "null" : "false"}
            ownerAffiliations: $affiliations
          ) {
            pageInfo {
              hasNextPage
              endCursor
            }
            totalCount
            nodes {
              nameWithOwner
              isFork
              languages(first: 30, orderBy: { field: SIZE, direction: DESC }) {
                edges {
                  size
                  node {
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;

    const res = await api.fetch("/graphql", "POST", {
      query,
      variables: {
        login: username,
        cursor,
        affiliations: ownerAffiliations,
      },
    });

    if (res.errors && res.errors.length > 0) {
      throw new Error(res.errors.map((e) => e.message).join("; "));
    }

    const reposData = res.data?.user?.repositories;
    if (!reposData) break;

    const repos = reposData.nodes || [];
    for (const repo of repos) {
      if (!includeForks && repo.isFork) continue;

      const [owner, repoName] = repo.nameWithOwner.split("/");
      if (
        excludeRepos.includes(repo.nameWithOwner) ||
        excludeRepos.includes(repoName)
      ) {
        continue;
      }

      totalRepoCount++;

      for (const edge of repo.languages?.edges || []) {
        const lang = edge.node?.name;
        const size = edge.size || 0;
        if (!lang || size <= 0) continue;

        if (!isProgrammingLanguage(lang, customExcludedLanguages)) {
          continue;
        }

        rawBytes[lang] = (rawBytes[lang] || 0) + size;
      }
    }

    hasNextPage = Boolean(reposData.pageInfo?.hasNextPage);
    cursor = reposData.pageInfo?.endCursor || null;
  }

  console.log(`Analyzed ${totalRepoCount} repositories.`);

  const totalBytes = Object.values(rawBytes).reduce((acc, v) => acc + v, 0);

  const languages = Object.entries(rawBytes)
    .map(([name, bytes]) => ({
      name,
      bytes,
      percent: totalBytes > 0 ? (bytes / totalBytes) * 100 : 0,
    }))
    .sort((a, b) => b.bytes - a.bytes);

  return { languages, totalBytes, repoCount: totalRepoCount };
};
