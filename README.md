Update a pinned GitHub Gist to show your programming language breakdown across all your repositories — automatically, every day.

[![update gist](https://github.com/thenil3sh/lang-box/workflows/update%20gist/badge.svg)](https://github.com/thenil3sh/lang-box/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## What it looks like

```
languages

Rust           1.1 MB ████████░░░░░░░░░░░░░░░░  33.7%
Java         144.1 KB █░░░░░░░░░░░░░░░░░░░░░░░   4.2%
Kotlin         2.0 MB ██████████████▌░░░░░░░░░  60.9%
Python        37.9 KB ▎░░░░░░░░░░░░░░░░░░░░░░░   1.1%
```

The gist displays whichever languages you choose, in whatever order you choose, with real byte counts drawn from your actual repositories. Config files, build scripts, and markup are filtered out automatically — only programming languages appear.

---

## How it works

The workflow runs daily via GitHub Actions. It calls the GitHub GraphQL API to aggregate language byte counts across all your repositories (public and private), filters the results to only real programming languages, then patches your gist with an aligned bar chart.

No Ruby. No native dependencies. Runs in about 15 seconds.

---

## Setup

There are four things to do, in order. Each step depends on the previous one.

### 1. Fork this repository

Click **Fork** at the top of this page. Everything you need is already in the fork — you only configure it, not change it.

### 2. Create a public gist

> [!NOTE]
> **This step matters.** GitHub only lets you pin **public** gists to your profile. A secret gist cannot be pinned no matter what else you do.

1. Go to [gist.github.com](https://gist.github.com/).
2. Enter a filename — `languages` works well.
3. Add any placeholder content (e.g. `loading...`).
4. Click the dropdown arrow next to the green button and choose **Create public gist**.
5. After it creates, copy the ID from the URL:

   ```
   https://gist.github.com/your-username/THIS-PART-IS-THE-ID
   ```

   Save it — you will need it in the next step.

### 3. Create a GitHub personal access token

> [!NOTE]
> You need a **Classic** personal access token, not a fine-grained one. The Gists API does not support fine-grained tokens.

1. Go to [github.com/settings/tokens/new](https://github.com/settings/tokens/new).
2. Give it a name, e.g. `lang-box`.
3. Set an expiration (or choose "No expiration" if you don't want to rotate it).
4. Under **Select scopes**, check:
   - `gist` — required; allows the workflow to update your gist.
   - `repo` — optional; include this to count **private** repositories too. Without it, only public repos are counted.
5. Click **Generate token** and copy the token value. You will not see it again.

### 4. Add secrets to your forked repository

In your fork, go to **Settings → Secrets and variables → Actions**.

Add two **repository secrets** (not variables — secrets):

| Secret name | Value |
|---|---|
| `GH_TOKEN` | The personal access token from step 3 |
| `GIST_ID` | The gist ID from step 2 |

### 5. Run the workflow

1. Go to the **Actions** tab of your fork.
2. If GitHub shows a banner asking you to enable workflows, click **I understand my workflows, go ahead and enable them**.
3. In the left sidebar, click **update gist**.
4. Click **Run workflow → Run workflow**.

The run takes about 15–20 seconds. When it completes, open your gist — it will contain your language breakdown.

### 6. Pin the gist to your profile

1. Go to your GitHub profile page.
2. In the **Pinned** section, click the pencil or **Customize your pins**.
3. Switch the filter from Repositories to **Gists**.
4. Select your gist and save.

---

## Customization

All customization is done through **repository variables** (not secrets). Go to **Settings → Secrets and variables → Actions → Variables** in your fork and add any of the following:

| Variable | Default | What it does |
|---|---|---|
| `LANGUAGES` | _(empty)_ | Comma-separated list of languages to display, in that exact order. Example: `Rust,Go,TypeScript`. When empty, the top languages by byte count are shown automatically. |
| `MAX_LANGUAGES` | `8` | How many languages to show when `LANGUAGES` is not set. |
| `GIST_TITLE` | `languages` | The filename shown at the top of the gist card. |
| `EXCLUDE_LANGUAGES` | _(empty)_ | Languages to exclude even if they appear in your repos. Example: `GLSL,Nix,Shell`. |
| `EXCLUDE_REPOS` | _(empty)_ | Repository names to ignore entirely. Example: `my-fork,test-repo`. |

You do not need to set any of these to get started. The defaults work without them.

---

## Update schedule

The workflow runs every day at **00:00 UTC** automatically. You can also trigger it manually at any time from the Actions tab using **Run workflow**.

If you want to change the schedule, edit the `cron` expression in [`.github/workflows/run.yml`](.github/workflows/run.yml):

```yaml
on:
  schedule:
    - cron: "0 0 * * *"   # daily at midnight UTC
```

Standard cron syntax applies. `"0 6 * * *"` would run at 06:00 UTC, for example.

---

## Troubleshooting

<details>
<summary>The gist is not appearing under "Customize your pins"</summary>

The gist was created as **secret**. GitHub only allows pinning public gists. Create a new gist and choose **Create public gist** this time. Update the `GIST_ID` secret in your repository with the new ID and re-run the workflow.
</details>

<details>
<summary>Workflow fails with <code>Error: Bad credentials</code></summary>

The `GH_TOKEN` secret is invalid or has expired. Go to [github.com/settings/tokens](https://github.com/settings/tokens), generate a new Classic token with the `gist` scope, and update the secret in your repository's Settings → Secrets and variables → Actions.
</details>

<details>
<summary>Workflow fails with <code>404 Not Found</code></summary>

Either the `GIST_ID` is wrong, or the token's owner is different from the gist's owner. Double-check that the GIST_ID matches the ID in your gist's URL, and that the token was generated under the same GitHub account that owns the gist.
</details>

<details>
<summary>My private repositories are not being counted</summary>

The token needs the `repo` scope to access private repositories. If you created the token with only the `gist` scope, generate a new one with both `gist` and `repo` checked, and update the `GH_TOKEN` secret.
</details>

<details>
<summary>A language I write is not appearing</summary>

If <code>LANGUAGES</code> is set, check the spelling — it must match exactly, e.g. <code>TypeScript</code> not <code>typescript</code>. If <code>LANGUAGES</code> is not set, the language may appear in your repos as a data or markup type (e.g. HTML, CSS, YAML) which are filtered out by design. You can check what languages are detected by reading the workflow run logs in the Actions tab.
</details>

<details>
<summary>The gist shows languages I do not want</summary>

Set the <code>EXCLUDE_LANGUAGES</code> repository variable to a comma-separated list of language names to drop. For example: <code>Shell,Lua,GLSL</code>. If you want to show only specific languages in a specific order, set <code>LANGUAGES</code> instead.
</details>

---

## License

MIT. Originally based on [lang-box by inokawa](https://github.com/inokawa/lang-box).
