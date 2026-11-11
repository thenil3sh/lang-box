import { ApiClient } from "./api.js";
import { createContent } from "./text.js";
import { runLinguist } from "./linguist.js";

const { GH_TOKEN, GIST_ID, USERNAME, DAYS } = process.env;

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
    const days = Math.max(1, Math.min(30, Number(DAYS || 14)));

    console.log(`username is ${username}.`);
    console.log(`\n`);

    // https://docs.github.com/en/rest/reference/activity
    // GitHub API supports 300 events at max and events older than 90 days will not be fetched.
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
      console.log(`${recentPushEvents.length} push events fetched on page ${page}.`);

      for (const { repo, payload } of recentPushEvents) {
        if (!payload) continue;

        // Legacy / webhook format: payload.commits is populated
        if (Array.isArray(payload.commits) && payload.commits.length > 0) {
          for (const c of payload.commits) {
            if (c.distinct !== false && c.sha && !seenShas.has(c.sha)) {
              seenShas.add(c.sha);
              commitTargets.push({ repo: repo.name, sha: c.sha });
            }
          }
        } else if (payload.head) {
          // Modern GitHub Activity API (payload.commits stripped)
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

      if (isEnd) {
        break;
      }
    }

    console.log(`${commitTargets.length} distinct commits identified.`);

    // Fetch commit details in batches to avoid triggering secondary rate limits
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

    console.log(`${commits.length} commits fetched.`);
    console.log(`\n`);

    // https://docs.github.com/en/rest/reference/repos#compare-two-commits
    const files = commits
      // Ignore merge commits
      .filter((c) => (c.parents?.length || 0) <= 1)
      .flatMap((c) =>
        (c.files || []).map(
          ({
            filename,
            additions,
            deletions,
            changes,
            status, // added, removed, modified, renamed
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

    let content = "";
    if (files.length > 0) {
      const langs = await runLinguist(files);
      console.log(`\n`);
      langs.forEach((l) =>
        console.log(
          `${l.name}: ${l.count} files, ${l.additions + l.deletions} changes`
        )
      );
      content = createContent(langs);
    }

    if (!content || content.trim().length === 0) {
      content = `No recent commit activity in the last ${days} days.`;
    }

    console.log(`\n`);
    console.log(content);
    console.log(`\n`);

    const gist = await api.fetch(`/gists/${GIST_ID}`);
    const filename = Object.keys(gist.files)[0];
    await api.fetch(`/gists/${GIST_ID}`, "PATCH", {
      files: {
        [filename]: {
          filename: `💻 Recent coding in languages`,
          content,
        },
      },
    });

    console.log(`Update succeeded.`);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
})();
