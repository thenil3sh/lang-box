import { ApiClient } from "./api.js";
import { createContent } from "./text.js";
import { fetchAllProjectLanguages } from "./projects.js";
import { isProgrammingLanguage } from "./filter.js";

const {
  GH_TOKEN,
  GIST_ID,
  USERNAME,
  MODE = "all",
  LANGUAGES = "Rust,Java,Kotlin,Python",
  MAX_LANGUAGES = "8",
  EXCLUDE_LANGUAGES = "",
  EXCLUDE_REPOS = "",
  GIST_TITLE = "languages",
  DAYS,
} = process.env;

(async () => {
  try {
    if (!GH_TOKEN) {
      throw new Error("GH_TOKEN is not provided.");
    }
    if (!GIST_ID) {
      throw new Error("GIST_ID is not provided.");
    }
    if (!USERNAME) {
      throw new Error("USERNAME is not provided.");
    }

    const api = new ApiClient(GH_TOKEN);
    const username = USERNAME;
    const maxLangs = Math.max(1, Math.min(25, Number(MAX_LANGUAGES || 8)));
    const targetLangs = LANGUAGES
      ? LANGUAGES.split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const customExcludedLanguages = EXCLUDE_LANGUAGES.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const customExcludedRepos = EXCLUDE_REPOS.split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`Username: ${username}`);
    console.log(`Mode: ${MODE}`);
    if (targetLangs.length > 0) {
      console.log(`Target languages (strict order): ${targetLangs.join(", ")}`);
    } else {
      console.log(`Max languages to display: ${maxLangs}`);
    }

    let content = "";

    if (MODE === "recent") {
      const { runLinguist } = await import("./linguist.js");
      const days = Math.max(1, Math.min(30, Number(DAYS || 14)));
      console.log(`Fetching recent events (last ${days} days)...`);

      const maxEvents = 300;
      const perPage = 100;
      const pages = Math.ceil(maxEvents / perPage);
      const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const seenShas = new Set();
      const commitTargets = [];

      for (let page = 1; page <= pages; page++) {
        let events = [];
        try {
          events = await api.fetch(
            `/users/${username}/events?per_page=${perPage}&page=${page}`
          );
        } catch (e) {
          console.warn(`Events page ${page} fetch ended: ${e.message}`);
          break;
        }

        if (!Array.isArray(events) || events.length === 0) {
          break;
        }

        const pushEvents = events.filter(
          ({ type, actor }) => type === "PushEvent" && actor.login === username
        );

        const recentPushEvents = pushEvents.filter(
          ({ created_at }) => new Date(created_at) > fromDate
        );
        const isEnd = recentPushEvents.length < pushEvents.length;

        for (const { repo, payload } of recentPushEvents) {
          if (!payload) continue;

          if (Array.isArray(payload.commits) && payload.commits.length > 0) {
            for (const c of payload.commits) {
              if (c.distinct !== false && c.sha && !seenShas.has(c.sha)) {
                seenShas.add(c.sha);
                commitTargets.push({ repo: repo.name, sha: c.sha });
              }
            }
          } else if (payload.head) {
            let resolved = false;
            if (payload.before && !/^0+$/.test(payload.before)) {
              try {
                const comp = await api.fetch(
                  `/repos/${repo.name}/compare/${payload.before}...${payload.head}`
                );
                if (Array.isArray(comp.commits)) {
                  for (const c of comp.commits) {
                    if (c.sha && !seenShas.has(c.sha)) {
                      seenShas.add(c.sha);
                      commitTargets.push({ repo: repo.name, sha: c.sha });
                    }
                  }
                  resolved = true;
                }
              } catch (err) {
                // compare may fail if commits were rebased or force pushed
              }
            }
            if (!resolved && !seenShas.has(payload.head)) {
              seenShas.add(payload.head);
              commitTargets.push({ repo: repo.name, sha: payload.head });
            }
          }
        }

        if (isEnd) break;
      }

      console.log(`${commitTargets.length} distinct commits identified.`);

      const commits = [];
      const batchSize = 10;
      for (let i = 0; i < commitTargets.length; i += batchSize) {
        const batch = commitTargets.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(({ repo, sha }) => api.fetch(`/repos/${repo}/commits/${sha}`))
        );
        for (const res of results) {
          if (res.status === "fulfilled" && res.value) {
            commits.push(res.value);
          }
        }
      }

      const files = commits
        .filter((c) => (c.parents?.length || 0) <= 1)
        .flatMap((c) =>
          (c.files || []).map(
            ({
              filename,
              additions,
              deletions,
              changes,
              status,
              patch,
            }) => ({
              path: filename,
              additions,
              deletions,
              changes,
              status,
              patch,
            })
          )
        );

      if (files.length > 0) {
        const rawLangs = await runLinguist(files);
        // Only include recognized programming languages
        const filteredLangs = rawLangs.filter((l) =>
          isProgrammingLanguage(l.name, customExcludedLanguages)
        );

        let selectedRecent = [];
        if (targetLangs.length > 0) {
          const langMap = new Map(
            filteredLangs.map((l) => [l.name.toLowerCase(), l])
          );
          const matched = targetLangs
            .map((t) => langMap.get(t.toLowerCase()))
            .filter(Boolean);
          const targetChanges = matched.reduce(
            (acc, l) => acc + (l.additions + l.deletions),
            0
          );
          selectedRecent = matched.map((l) => ({
            ...l,
            percent:
              targetChanges > 0
                ? ((l.additions + l.deletions) / targetChanges) * 100
                : 0,
          }));
        } else {
          const totalChanges = filteredLangs.reduce(
            (acc, l) => acc + (l.additions + l.deletions),
            0
          );
          selectedRecent = filteredLangs
            .map((l) => ({
              ...l,
              percent:
                totalChanges > 0
                  ? ((l.additions + l.deletions) / totalChanges) * 100
                  : 0,
            }))
            .slice(0, maxLangs);
        }

        if (selectedRecent.length > 0) {
          content = createContent(selectedRecent);
        }
      }

      if (!content || content.trim().length === 0) {
        content = `No recent programming activity in the last ${days} days.`;
      }
    } else {
      // Default: All projects mode
      const { languages, totalBytes, repoCount } = await fetchAllProjectLanguages(
        api,
        username,
        {
          excludeRepos: customExcludedRepos,
          customExcludedLanguages,
        }
      );

      console.log(
        `\nDiscovered ${languages.length} programming languages across ${repoCount} projects (${totalBytes} total bytes):`
      );
      languages.forEach((l) =>
        console.log(` - ${l.name}: ${l.bytes} bytes (${l.percent.toFixed(1)}%)`)
      );

      let selectedLanguages = [];
      if (targetLangs.length > 0) {
        const langMap = new Map(
          languages.map((l) => [l.name.toLowerCase(), l])
        );

        const matched = targetLangs
          .map((name) => {
            const found = langMap.get(name.toLowerCase());
            return found
              ? { ...found, name: found.name }
              : { name, bytes: 0 };
          })
          .filter((l) => l.bytes > 0);

        const targetTotalBytes = matched.reduce((acc, l) => acc + l.bytes, 0);

        selectedLanguages = matched.map((l) => ({
          ...l,
          percent: targetTotalBytes > 0 ? (l.bytes / targetTotalBytes) * 100 : 0,
        }));
      } else {
        selectedLanguages = languages.slice(0, maxLangs);
      }

      if (selectedLanguages.length > 0) {
        content = createContent(selectedLanguages);
      } else {
        content = "No matching programming languages found across projects.";
      }
    }

    console.log(`\n--- Gist Content Preview ---\n${content}\n----------------------------\n`);

    const gist = await api.fetch(`/gists/${GIST_ID}`);
    const currentFilename = Object.keys(gist.files)[0];
    await api.fetch(`/gists/${GIST_ID}`, "PATCH", {
      description: GIST_TITLE,
      files: {
        [currentFilename]: {
          filename: GIST_TITLE,
          content,
        },
      },
    });

    console.log(`Update succeeded with gist filename: "${GIST_TITLE}".`);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
})();
