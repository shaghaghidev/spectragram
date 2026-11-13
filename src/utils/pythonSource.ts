import readmeContent from '../../README.md?raw';

export const REQUIREMENTS_TXT_SOURCE = `# SpectraGram — Telegram Digital Footprint & Exposure Auditor
# Author: Abolfazl Shaghaghi (@shaghaghidev) | https://shaghaghidev.ir
# Repository: https://github.com/shaghaghidev/spectragram
# 100% Pure-Python / Windows-Compatible Wheels (Python 3.10+)

aiohttp>=3.9.5
httpx>=0.27.0
Telethon>=1.36.0
Pillow>=10.3.0
ImageHash>=4.3.1
beautifulsoup4>=4.12.3`;

export const README_MD_SOURCE = readmeContent;

export interface PythonModuleStage {
  id: string;
  stageNumber: string;
  title: string;
  summary: string;
  methodsUsed: string;
  codeSnippet: string;
}

export const PYTHON_STAGE_MODULES: PythonModuleStage[] = [
  {
    id: 'module-1',
    stageNumber: '01',
    title: 'MTProto Entity & Server Metadata (Telethon)',
    summary:
      'Resolves @username via GetFullUserRequest, extracts permanent Numeric ID, access_hash, DC geography (DC1-DC5), interpolates account creation date (2013-2026), and parses Bio via Regex.',
    methodsUsed: 'GetFullUserRequest · UserProfilePhoto.dc_id · Piecewise Linear Interpolation',
    codeSnippet: `# Module 1: MTProto Entity & Server Metadata
self._set_progress(1, "Module 1/7: Resolving MTProto Entity & DC Fingerprint...", clean_username)
full_resp = await client(GetFullUserRequest(clean_username))
user: types.User = full_resp.users[0]
full_user: types.UserFull = full_resp.full_user
bio_text = getattr(full_user, "about", "") or ""
bio_entities = extract_bio_entities(bio_text)

dc_id = getattr(user.photo, "dc_id", None) if isinstance(user.photo, types.UserProfilePhoto) else None
dc_meta = DC_GEOGRAPHY.get(dc_id or 0, {"dc_id": f"DC{dc_id}", "location": "Undetermined"})
est_date, est_conf = interpolate_account_creation(user.id)`,
  },
  {
    id: 'module-2',
    stageNumber: '02',
    title: 'Public Web Preview Verifier (httpx + BeautifulSoup4)',
    summary:
      'Fetches https://t.me/{username} over HTTP to cross-verify public profile visibility, OpenGraph title/description tags, and public avatar URL.',
    methodsUsed: 'httpx.AsyncClient · BeautifulSoup4 · OpenGraph Meta Parser',
    codeSnippet: `async def _module_2_web_preview(self, username: str) -> Dict[str, Any]:
    url = f"https://t.me/{username}"
    async with httpx.AsyncClient(timeout=12.0, follow_redirects=True, headers=headers) as hc:
        resp = await hc.get(url)
        soup = BeautifulSoup(resp.text, "html.parser")
        og_title = soup.find("meta", property="og:title")
        og_desc = soup.find("meta", property="og:description")
        og_image = soup.find("meta", property="og:image")
        return {
            "url": url,
            "http_status": resp.status_code,
            "public_web_resolvable": resp.status_code == 200 and bool(og_title),
            "og_title": og_title["content"] if og_title and og_title.get("content") else "",
            "og_description": og_desc["content"] if og_desc and og_desc.get("content") else "",
            "og_image": og_image["content"] if og_image and og_image.get("content") else f"https://t.me/i/userpic/320/{username}.jpg",
        }`,
  },
  {
    id: 'module-3',
    stageNumber: '03',
    title: 'Historical Metadata & Filtered Bot Querying',
    summary:
      'Queries @SangMata_BOT, @SangMata_beta_bot, @usinfobot, and @creationdatebot with /start initialization and FloodWaitError protection while strictly filtering out @username/@user placeholders and ads.',
    methodsUsed: 'client.conversation() · Strict Placeholder/Ad Filter · FloodWaitError Backoff',
    codeSnippet: `for bot_handle in ["@SangMata_BOT", "@SangMata_beta_bot", "@usinfobot", "@creationdatebot"]:
    async with client.conversation(bot_handle, timeout=14) as conv:
        await conv.send_message("/start")
        try:
            await conv.get_response(timeout=4)
        except asyncio.TimeoutError:
            pass
        await conv.send_message(str(numeric_id))
        reply = await conv.get_response(timeout=10)
        u_list, n_list = parse_filtered_bot_reply(reply.raw_text or "", bot_handle)`,
  },
  {
    id: 'module-4',
    stageNumber: '04',
    title: 'Avatar Timeline & Image Hash Forensics (Pillow + imagehash)',
    summary:
      'Downloads all profile photos via GetUserPhotosRequest into ./reports/<username>/avatars/, extracts UTC upload timestamps, MD5, SHA256, EXIF, and pHash, and generates 1-click Reverse Image Search links.',
    methodsUsed: 'GetUserPhotosRequest · PIL.Image · imagehash.phash · Lens / Yandex / TinEye',
    codeSnippet: `photos_resp = await client(GetUserPhotosRequest(user_id=user, offset=0, max_id=0, limit=50))
for idx, photo in enumerate(getattr(photos_resp, "photos", [])):
    upload_dt = photo.date.astimezone(dt.timezone.utc)
    fname = f"avatar_{idx:02d}_{photo.id}_{upload_dt:%Y%m%d_%H%M%S}.jpg"
    downloaded = await client.download_media(photo, file=str(avatars_dir / fname))
    with Image.open(downloaded) as im:
        dimensions = f"{im.width}x{im.height}"
        phash_hex = str(imagehash.phash(im))`,
  },
  {
    id: 'module-5',
    stageNumber: '05',
    title: 'Shared Groups & Activity Timezone Estimator',
    summary:
      'Executes GetCommonChatsRequest and samples group message timestamps via iter_messages to build a 24-hour UTC activity histogram and estimate local UTC offset.',
    methodsUsed: 'GetCommonChatsRequest · client.iter_messages · 24h UTC Sleep-Trough Estimator',
    codeSnippet: `common_resp = await client(GetCommonChatsRequest(user_id=user, max_id=0, limit=50))
for chat in getattr(common_resp, "chats", [])[:12]:
    async for msg in client.iter_messages(chat, from_user=user, limit=200):
        if msg.date:
            hourly_bins[msg.date.astimezone(dt.timezone.utc).hour] += 1
tz_info = estimate_timezone_from_hourly_utc(hourly_bins)`,
  },
  {
    id: 'module-6',
    stageNumber: '06',
    title: 'Native Async Cross-Platform Presence Check (httpx)',
    summary:
      'Concurrently probes 26 major platforms using pure async httpx (no external CLI binaries required) and queries GitHub /repos and /events/public for public commit email exposure.',
    methodsUsed: 'httpx.AsyncClient · asyncio.Semaphore(10) · GitHub /repos & /events/public',
    codeSnippet: `async def check_single(hc: httpx.AsyncClient, uname: str, p_spec: Dict[str, Any]) -> None:
    url = p_spec["url"].format(u=uname)
    async with semaphore:
        resp = await hc.get(url)
        if resp.status_code == 200 and p_spec["nf_text"].lower() not in resp.text[:4000].lower():
            matched_profiles.append({
                "username": uname,
                "platform": p_spec["name"],
                "category": p_spec["category"],
                "url": url,
                "http_status": resp.status_code,
            })`,
  },
  {
    id: 'module-7',
    stageNumber: '07',
    title: 'Search Launchpad & Privacy Hardening Score',
    summary:
      'Generates 1-click Google Dorks and Telegram Search Engine links alongside a 0-100 Privacy Hardening Score and actionable Lockdown Checklist.',
    methodsUsed: 'compute_privacy_hardening() · TGStat / Telemetr / Lyzem / Telegago · report.html',
    codeSnippet: `report_payload["privacy_hardening"] = compute_privacy_hardening(report_payload)
data_json_path.write_text(json.dumps(report_payload, indent=2, ensure_ascii=False), encoding="utf-8")
report_html_path.write_text(build_standalone_report_html(report_payload), encoding="utf-8")`,
  },
];
