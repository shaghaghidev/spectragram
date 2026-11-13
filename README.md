# SpectraGram — Telegram Digital Footprint & Exposure Auditor

**Author:** [Abolfazl Shaghaghi (`@shaghaghidev`)](https://shaghaghidev.ir)  
**Repository:** [https://github.com/shaghaghidev/spectragram](https://github.com/shaghaghidev/spectragram)  
**Runtime:** Python 3.10+ · Windows, macOS & Linux Compatible · Built-in Local Web GUI (`http://127.0.0.1:8080`)

---

## Overview

**SpectraGram** (`spectragram.py`) is a self-contained, asynchronous Telegram digital footprint and exposure auditing framework with a zero-friction **Local Web GUI** built strictly with pure HTML5, CSS3, and Vanilla JavaScript.

Instead of requiring complex command-line flags or external compiled binaries that break on Windows, SpectraGram launches a local `aiohttp` web server on `http://127.0.0.1:8080`, walks you through one-time Telegram API authorization directly in the browser, and audits any `@username` across **7 native Python analytical modules**.

---

## Key Features & 7 Native Analytical Modules

1. **Module 1 — MTProto Entity & Server Metadata (`Telethon`)**
   - Resolves `@username` via `GetFullUserRequest`.
   - Extracts Permanent Numeric ID (`id`), `access_hash`, display name, bio/about text, public phone visibility, online/last-seen status, and account flags (`premium`, `verified`, `bot`, `scam`, `fake`, `restricted`).
   - Maps profile photo Data Center ID (`dc_id`) to physical server geography (`DC1`/`DC3`: Miami US, `DC2`/`DC4`: Amsterdam EU/EMEA, `DC5`: Singapore APAC).
   - Estimates **Account Creation Date** via piecewise linear interpolation over empirical Telegram Numeric ID milestones (2013–2026).
   - Extracts URLs, email addresses, and `@handles` from bio text using regular expressions.

2. **Module 2 — Public Web Preview Verifier (`httpx` + `BeautifulSoup4`)**
   - Fetches `https://t.me/{username}` over HTTP to verify public web visibility, OpenGraph title/description tags, and public avatar URLs.

3. **Module 3 — Historical Metadata & Bot Querying (`Telethon Conversation`)**
   - Queries `@SangMata_BOT`, `@SangMata_beta_bot`, `@usinfobot`, and `@creationdatebot` with automatic `/start` initialization, follow-up message collection, and `FloodWaitError` protection.
   - Strictly filters out bot instructions, advertisements, and placeholder tokens (`@username`, `@user`, bot handles) while keeping raw transcripts in a collapsible inspector.

4. **Module 4 — Avatar Timeline & Image Hash Forensics (`Pillow` + `imagehash`)**
   - Downloads historical profile photos via `GetUserPhotosRequest` to `./reports/<username>/avatars/`.
   - Extracts exact UTC server upload timestamps (`photo.date`), dimensions, file size, `MD5`, `SHA256`, EXIF tags, and Perceptual Hash (`pHash`).
   - Generates 1-click Reverse Image Search links (Google Lens, Yandex Images, TinEye).

5. **Module 5 — Shared Groups & Activity Timezone Estimator**
   - Executes `GetCommonChatsRequest` and samples message timestamps via `iter_messages` to build a 24-hour UTC activity histogram and infer the user's local **UTC Offset** and sleep/wake window.

6. **Module 6 — Native Async Cross-Platform Presence Check (`httpx`)**
   - Concurrently checks the target username and discovered historical usernames across **26 major platforms** (GitHub, GitLab, X, Instagram, Reddit, Medium, Keybase, Steam, DEV.to, HackerNews, PyPI, NPM, Gravatar, Linktree, Crates.io, DockerHub, HuggingFace, Kaggle, etc.) using pure async `httpx`.
   - Queries GitHub's `/users/{username}/repos` and `/events/public` endpoints to identify public repositories and commit author email exposures.

7. **Module 7 — Search Engine Launchpad & Privacy Hardening Score**
   - Generates 1-click search links for Google Dorks (`site:t.me`, external web mentions, code/paste leaks) and Telegram search indexes (TGStat, Telemetr, Lyzem, Telegago CSE).
   - Computes a **Privacy Hardening Score (0–100)** and a prioritized **Lockdown Checklist** detailing how to remediate each exposed vector in Telegram and GitHub settings.

---

## Quick Start (Windows / macOS / Linux)

### 1. Install Pure-Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Run SpectraGram (No CLI Arguments Needed)

```bash
python spectragram.py
```

- SpectraGram automatically starts `http://127.0.0.1:8080` and opens your default web browser.
- On first launch, enter your `API_ID`, `API_HASH` (from [https://my.telegram.org](https://my.telegram.org)), and phone number directly in the browser UI to authorize your local session (`config.json` is saved automatically).
- Enter any Telegram `@username` and click **Run Exposure Audit**.
- Standalone reports are saved automatically to `./reports/<username>/report.html` and `./reports/<username>/data.json`.

---

## Author & Credits

Designed and developed by **Abolfazl Shaghaghi (`@shaghaghidev`)**  
- Website & Portfolio: [https://shaghaghidev.ir](https://shaghaghidev.ir)  
- GitHub: [https://github.com/shaghaghidev/spectragram](https://github.com/shaghaghidev/spectragram)
