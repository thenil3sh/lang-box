<p align="center">
  <h2 align="center">💻 lang-box</h2>
  <p align="center">Update a pinned GitHub Gist to showcase your real programming languages across all your repositories.</p>
</p>

<p align="center">
  <a href="https://github.com/thenil3sh/lang-box/actions"><img src="https://github.com/thenil3sh/lang-box/workflows/update%20gist/badge.svg" alt="update gist"></a>
  <a href="https://github.com/thenil3sh/lang-box/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
</p>

---

> 📌✨ Inspired by [waka-box](https://github.com/matchai/waka-box) and the [awesome-pinned-gists](https://github.com/matchai/awesome-pinned-gists) collection.

`lang-box` queries your GitHub repositories via the GitHub GraphQL API, measures how many bytes of code you have written across all your projects, and updates a pinned GitHub Gist with a 53-character-wide aligned bar chart.

### 🌟 Why this version is better
- ⚡ **Pure Node.js & Lightning Fast**: Runs in **~15 seconds** without needing Ruby, Bundler, or native C library compilation (`libgit2`/`rugged`).
- 🎯 **Only Real Programming Languages**: Automatically filters out config, data, documentation, and build files (no Gradle, YAML, TOML, XML, JSON, Markdown, HTML, CSS, or Dockerfile noise).
- 🌐 **All Repositories (Public & Private)**: Aggregates across all repositories you own or contribute to.
- 🎨 **Custom Target List & Order**: Either automatically showcase your top languages, or specify exact target languages in your preferred order (e.g. Rust, Java, Kotlin, Python).

---

### Preview

```text
languages

Rust           1.1 MB ████████░░░░░░░░░░░░░░░░  33.7%
Java         144.1 KB █░░░░░░░░░░░░░░░░░░░░░░░   4.2%
Kotlin         2.0 MB ██████████████▌░░░░░░░░░  60.9%
Python        37.9 KB ▎░░░░░░░░░░░░░░░░░░░░░░░   1.1%
```

---

## 🚀 Setup Guide (How to Fork & Use)

### Step 1: Fork or Clone this Repo
Click the **Fork** button at the top right of this page to create your own copy.

### Step 2: Create a Public GitHub Gist
1. Go to [gist.github.com](https://gist.github.com/).
2. Enter a filename (e.g. `languages`) and any placeholder text (e.g. `initial`).
3. ⚠️ **IMPORTANT**: Click the dropdown next to the green button and select **Create public gist**.  
   > *GitHub Profile pins do NOT support secret gists. It **must** be a public gist.*
4. From the browser URL bar, copy the **Gist ID** at the end of the URL:  
   `https://gist.github.com/username/`**`c42954bf442a41bf7719c3270da9896e`**

### Step 3: Generate a Personal Access Token (PAT)
1. Go to [GitHub Token Settings (Classic)](https://github.com/settings/tokens/new).
   > *Note: You must create a **Classic Token** because fine-grained tokens do not currently support the Gists API.*
2. Give your token a descriptive name (e.g. `lang-box`).
3. Select the required scopes:
   - `gist` (**Required**: permits updating your public gist).
   - `repo` (**Optional**: check this if you want language stats from your **private repositories** included. If unchecked, only public repos are counted).
4. Click **Generate token** and copy the secret token.

### Step 4: Add Repository Secrets
In your forked repository:
1. Navigate to **Settings > Secrets and variables > Actions**.
2. Click **New repository secret**:
   - Name: `GH_TOKEN` → Value: *Paste your personal access token from Step 3*.
3. Click **New repository secret** again:
   - Name: `GIST_ID` → Value: *Paste your Gist ID from Step 2*.

### Step 5: Enable & Trigger the Workflow
1. Go to the **Actions** tab in your repository.
2. If prompted, click **I understand my workflows, go ahead and enable them**.
3. In the left sidebar, click **update gist**.
4. Click **Run workflow** → **Run workflow**.
5. Within ~20 seconds, your gist will be updated with your languages!

### Step 6: Pin the Gist to your Profile
1. Go to your GitHub profile (`https://github.com/<your-username>`).
2. In the **Pinned** section, click **Customize your pins** (or the edit icon).
3. Switch the filter from **Repositories** to **Gists**.
4. Select **`languages`** and click **Save pins**.

---

## ⚙️ Customization Options

You can customize the gist by going to **Settings > Secrets and variables > Actions > Variables** (or editing `.github/workflows/run.yml` directly):

| Variable | Default | Description |
|---|---|---|
| `LANGUAGES` | *(empty)* | Comma-separated list of languages in your desired order (e.g. `Rust,Java,Kotlin,Python` or `Python,TypeScript,Go`). If empty, automatically displays your top programming languages. |
| `MAX_LANGUAGES` | `8` | Number of top programming languages to display when `LANGUAGES` is not specified. |
| `GIST_TITLE` | `languages` | Title/filename shown at the top of the gist card. |
| `EXCLUDE_LANGUAGES` | *(empty)* | Comma-separated list of languages to exclude (e.g. `GLSL,Nix`). |
| `EXCLUDE_REPOS` | *(empty)* | Comma-separated list of repository names to ignore. |
| `GH_USERNAME` | `${{ github.actor }}` | Override GitHub username if analyzing another account's public projects. |

---

## ❓ Troubleshooting & FAQ

<details>
<summary><b>1. Why can't I see or pin the Gist to my GitHub profile?</b></summary>

GitHub Profile customization **only supports Public Gists**. If your gist was created as "Secret", it will not appear under your profile's "Customize your pins" menu. Create a new public gist, update `GIST_ID` in your repository secrets, and re-run the workflow.
</details>

<details>
<summary><b>2. Workflow fails with <code>Error: Bad credentials (401)</code></b></summary>

Your `GH_TOKEN` secret is either invalid, mistyped, or expired. Generate a new Classic Token with `gist` scope at [github.com/settings/tokens](https://github.com/settings/tokens) and update the `GH_TOKEN` secret.
</details>

<details>
<summary><b>3. Workflow fails with <code>404 Not Found</code></b></summary>

Verify that your `GIST_ID` secret matches the ID string in your gist URL, and that the token used in `GH_TOKEN` belongs to the account that owns the gist.
</details>

<details>
<summary><b>4. How often does this update?</b></summary>

The GitHub Actions workflow runs on a cron schedule every day at **00:00 UTC** (`cron: "0 0 * * *"`). You can also manually trigger an update anytime using the **Run workflow** button.
</details>

<details>
<summary><b>5. Are my private repositories included?</b></summary>

Yes, if your `GH_TOKEN` was granted the `repo` scope when generated. If you do not want private repositories included, create the token with only the `gist` scope.
</details>

---

## 📄 License

MIT © [inokawa](https://github.com/inokawa) & contributors
