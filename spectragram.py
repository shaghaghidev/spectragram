"""
===============================================================================
SpectraGram — Telegram Digital Footprint & Exposure Auditor
===============================================================================
Author      : Abolfazl Shaghaghi (@shaghaghidev)
Website     : https://shaghaghidev.ir
Repository  : https://github.com/shaghaghidev/spectragram
License     : MIT

Zero-Friction Local Web GUI Usage (Windows / macOS / Linux):
    1. pip install -r requirements.txt
    2. python spectragram.py
    -> Automatically launches http://127.0.0.1:8080 in your default browser.
===============================================================================
"""

from __future__ import annotations

import asyncio
import datetime as dt
import hashlib
import html
import json
import logging
import os
import re
import sys
import webbrowser
from collections import Counter
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import quote_plus

import aiohttp
from aiohttp import web
import httpx
from bs4 import BeautifulSoup
from PIL import Image, ExifTags
import imagehash
from telethon import TelegramClient, errors, types
from telethon.tl.functions.messages import GetCommonChatsRequest
from telethon.tl.functions.photos import GetUserPhotosRequest
from telethon.tl.functions.users import GetFullUserRequest

# ---------------------------------------------------------------------------
# Logging & Paths Configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] SpectraGram: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("SpectraGram")

BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.json"
SESSION_PATH = BASE_DIR / "spectragram_userbot"
REPORTS_ROOT = BASE_DIR / "reports"
REPORTS_ROOT.mkdir(parents=True, exist_ok=True)

HOST = "127.0.0.1"
PORT = int(os.environ.get("SPECTRAGRAM_PORT", "8080"))

# ---------------------------------------------------------------------------
# Empirical Constants: Data Centers & Numeric ID Creation Milestones
# ---------------------------------------------------------------------------
DC_GEOGRAPHY: Dict[int, Dict[str, str]] = {
    1: {
        "dc_id": "DC1",
        "location": "Miami, Florida, US",
        "region": "Americas Primary (US-East)",
        "ip_v4": "149.154.175.50",
        "asn": "AS62041 (Telegram Messenger Inc)",
    },
    2: {
        "dc_id": "DC2",
        "location": "Amsterdam, Netherlands",
        "region": "Europe / EMEA Primary Cluster",
        "ip_v4": "149.154.167.51",
        "asn": "AS62041 (Telegram Messenger Inc)",
    },
    3: {
        "dc_id": "DC3",
        "location": "Miami, Florida, US",
        "region": "Americas Secondary Cluster",
        "ip_v4": "149.154.175.100",
        "asn": "AS62041 (Telegram Messenger Inc)",
    },
    4: {
        "dc_id": "DC4",
        "location": "Amsterdam, Netherlands",
        "region": "Europe / EMEA High-Density Cluster",
        "ip_v4": "149.154.167.91",
        "asn": "AS62041 (Telegram Messenger Inc)",
    },
    5: {
        "dc_id": "DC5",
        "location": "Singapore",
        "region": "Asia-Pacific (APAC)",
        "ip_v4": "91.108.56.130",
        "asn": "AS62041 (Telegram Messenger Inc)",
    },
}

ID_MILESTONES: List[Tuple[int, int]] = [
    (100_000, int(dt.datetime(2013, 8, 14, tzinfo=dt.timezone.utc).timestamp())),
    (1_000_000, int(dt.datetime(2013, 10, 20, tzinfo=dt.timezone.utc).timestamp())),
    (10_000_000, int(dt.datetime(2014, 2, 25, tzinfo=dt.timezone.utc).timestamp())),
    (50_000_000, int(dt.datetime(2014, 11, 15, tzinfo=dt.timezone.utc).timestamp())),
    (100_000_000, int(dt.datetime(2015, 5, 10, tzinfo=dt.timezone.utc).timestamp())),
    (200_000_000, int(dt.datetime(2016, 3, 1, tzinfo=dt.timezone.utc).timestamp())),
    (350_000_000, int(dt.datetime(2017, 4, 12, tzinfo=dt.timezone.utc).timestamp())),
    (500_000_000, int(dt.datetime(2018, 1, 20, tzinfo=dt.timezone.utc).timestamp())),
    (750_000_000, int(dt.datetime(2019, 1, 15, tzinfo=dt.timezone.utc).timestamp())),
    (1_000_000_000, int(dt.datetime(2019, 10, 5, tzinfo=dt.timezone.utc).timestamp())),
    (1_300_000_000, int(dt.datetime(2020, 7, 18, tzinfo=dt.timezone.utc).timestamp())),
    (1_650_000_000, int(dt.datetime(2021, 1, 25, tzinfo=dt.timezone.utc).timestamp())),
    (2_100_000_000, int(dt.datetime(2021, 10, 10, tzinfo=dt.timezone.utc).timestamp())),
    (5_000_000_000, int(dt.datetime(2022, 2, 1, tzinfo=dt.timezone.utc).timestamp())),
    (5_600_000_000, int(dt.datetime(2022, 9, 15, tzinfo=dt.timezone.utc).timestamp())),
    (6_200_000_000, int(dt.datetime(2023, 5, 20, tzinfo=dt.timezone.utc).timestamp())),
    (6_800_000_000, int(dt.datetime(2024, 1, 10, tzinfo=dt.timezone.utc).timestamp())),
    (7_400_000_000, int(dt.datetime(2024, 9, 1, tzinfo=dt.timezone.utc).timestamp())),
    (8_100_000_000, int(dt.datetime(2025, 6, 15, tzinfo=dt.timezone.utc).timestamp())),
    (8_800_000_000, int(dt.datetime(2026, 4, 1, tzinfo=dt.timezone.utc).timestamp())),
]

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
URL_REGEX = re.compile(r"https?://[^\s<>\"']+|www\.[^\s<>\"']+")
HANDLE_REGEX = re.compile(r"(?<![a-zA-Z0-9._%+\-])@([a-zA-Z0-9_]{4,32})")

# Strictly filtered placeholder and bot noise tokens for Module 3
BANNED_BOT_HANDLES_AND_NOISE: Set[str] = {
    "username",
    "user",
    "users",
    "sangmata_bot",
    "sangmata_beta_bot",
    "usinfobot",
    "creationdatebot",
    "telegram",
    "support",
    "donate",
    "channel",
    "group",
    "admin",
    "botfather",
    "none",
    "null",
    "empty",
    "no_username",
}

BANNED_DISPLAY_NAME_PHRASES: Tuple[str, ...] = (
    "no data available",
    "history for user",
    "send me a user id",
    "forward a message",
    "click here",
    "subscribe to",
    "sponsored",
    "advertisement",
    "user id:",
    "usernames:",
    "names:",
)

# 26 Native Async Cross-Platform Definitions for Module 6
NATIVE_PLATFORMS: List[Dict[str, Any]] = [
    {"name": "GitHub", "category": "Developer", "url": "https://github.com/{u}", "nf_text": "Not Found"},
    {"name": "GitLab", "category": "Developer", "url": "https://gitlab.com/{u}", "nf_text": "Sign in"},
    {"name": "X (Twitter)", "category": "Social", "url": "https://x.com/{u}", "nf_text": "This account doesn"},
    {"name": "Instagram", "category": "Social", "url": "https://www.instagram.com/{u}/", "nf_text": "Sorry, this page"},
    {"name": "Reddit", "category": "Forum", "url": "https://www.reddit.com/user/{u}/about.json", "nf_text": '"error": 404'},
    {"name": "Medium", "category": "Publishing", "url": "https://medium.com/@{u}", "nf_text": "PAGE NOT FOUND"},
    {"name": "Keybase", "category": "Crypto / Identity", "url": "https://keybase.io/{u}", "nf_text": "Keybase: 404"},
    {"name": "Steam Community", "category": "Gaming", "url": "https://steamcommunity.com/id/{u}", "nf_text": "The specified profile could not be found"},
    {"name": "DEV.to", "category": "Developer", "url": "https://dev.to/{u}", "nf_text": "This page does not exist"},
    {"name": "HackerNews", "category": "Tech Community", "url": "https://news.ycombinator.com/user?id={u}", "nf_text": "No such user"},
    {"name": "PyPI", "category": "Package Index", "url": "https://pypi.org/user/{u}/", "nf_text": "Page Not Found"},
    {"name": "NPM", "category": "Package Index", "url": "https://www.npmjs.com/~{u}", "nf_text": "Not Found"},
    {"name": "Gravatar", "category": "Identity", "url": "https://en.gravatar.com/{u}.json", "nf_text": "User not found"},
    {"name": "Linktree", "category": "Bio Link", "url": "https://linktr.ee/{u}", "nf_text": "The page you’re looking for"},
    {"name": "Crates.io", "category": "Package Index", "url": "https://crates.io/api/v1/users/{u}", "nf_text": "errors"},
    {"name": "DockerHub", "category": "Developer", "url": "https://hub.docker.com/v2/users/{u}/", "nf_text": "Not found"},
    {"name": "DockerHub Org", "category": "Developer", "url": "https://hub.docker.com/u/{u}", "nf_text": "404"},
    {"name": "HuggingFace", "category": "AI / ML", "url": "https://huggingface.co/{u}", "nf_text": "404"},
    {"name": "Kaggle", "category": "Data Science", "url": "https://www.kaggle.com/{u}", "nf_text": "404"},
    {"name": "Hashnode", "category": "Publishing", "url": "https://hashnode.com/@{u}", "nf_text": "404"},
    {"name": "Twitch", "category": "Streaming", "url": "https://www.twitch.tv/{u}", "nf_text": "Sorry. Unless you"},
    {"name": "SoundCloud", "category": "Audio", "url": "https://soundcloud.com/{u}", "nf_text": "We can’t find that user"},
    {"name": "Vimeo", "category": "Video", "url": "https://vimeo.com/{u}", "nf_text": "Sorry, we couldn"},
    {"name": "Behance", "category": "Design", "url": "https://www.behance.net/{u}", "nf_text": "Oops!"},
    {"name": "Dribbble", "category": "Design", "url": "https://dribbble.com/{u}", "nf_text": "Whoops, that page is gone"},
    {"name": "Bitbucket", "category": "Developer", "url": "https://bitbucket.org/{u}/", "nf_text": "Resource not found"},
]


# ---------------------------------------------------------------------------
# Pure Helper Functions
# ---------------------------------------------------------------------------
def interpolate_account_creation(user_id: int) -> Tuple[str, str]:
    """Piecewise linear interpolation over empirical Telegram Numeric ID milestones (2013-2026)."""
    if user_id <= ID_MILESTONES[0][0]:
        dt_obj = dt.datetime.fromtimestamp(ID_MILESTONES[0][1], tz=dt.timezone.utc)
        return dt_obj.strftime("%Y-%m-%d"), "Genesis Cohort (≤ Aug 2013 · ±14 days)"

    if user_id >= ID_MILESTONES[-1][0]:
        last_id, last_ts = ID_MILESTONES[-1]
        prev_id, prev_ts = ID_MILESTONES[-2]
        slope = (last_ts - prev_ts) / float(last_id - prev_id)
        est_ts = min(
            int(last_ts + (user_id - last_id) * slope),
            int(dt.datetime.now(dt.timezone.utc).timestamp()),
        )
        dt_obj = dt.datetime.fromtimestamp(est_ts, tz=dt.timezone.utc)
        return dt_obj.strftime("%Y-%m-%d"), "Extrapolated High-ID Cohort (±45 days)"

    for idx in range(len(ID_MILESTONES) - 1):
        low_id, low_ts = ID_MILESTONES[idx]
        high_id, high_ts = ID_MILESTONES[idx + 1]
        if low_id <= user_id <= high_id:
            ratio = (user_id - low_id) / float(high_id - low_id)
            interp_ts = int(low_ts + ratio * (high_ts - low_ts))
            dt_obj = dt.datetime.fromtimestamp(interp_ts, tz=dt.timezone.utc)
            return dt_obj.strftime("%Y-%m-%d"), "Milestone Interpolated (±21 days)"

    return "Unknown", "Insufficient Data"


def extract_bio_entities(bio_text: str) -> Dict[str, List[str]]:
    if not bio_text:
        return {"urls": [], "emails": [], "handles": []}
    urls = sorted(set(u.rstrip(".,;)") for u in URL_REGEX.findall(bio_text)))
    emails = sorted(set(e.lower() for e in EMAIL_REGEX.findall(bio_text)))
    handles = sorted(set(f"@{m}" for m in HANDLE_REGEX.findall(bio_text)))
    return {"urls": urls, "emails": emails, "handles": handles}


def estimate_timezone_from_hourly_utc(hourly_counts: List[int]) -> Dict[str, Any]:
    if len(hourly_counts) != 24 or sum(hourly_counts) == 0:
        return {
            "estimated_offset": "UTC+00:00 (Insufficient activity sample)",
            "sleep_window_utc": "01:00 – 07:00 UTC",
            "peak_hour_utc": 14,
            "confidence": "Low (0 messages sampled)",
        }

    min_sum = float("inf")
    sleep_start = 0
    for hr in range(24):
        w_sum = sum(hourly_counts[(hr + off) % 24] for off in range(6))
        if w_sum < min_sum:
            min_sum = w_sum
            sleep_start = hr

    midpoint = (sleep_start + 3) % 24
    offset = 4 - midpoint
    if offset < -11:
        offset += 24
    elif offset > 14:
        offset -= 24

    sign = "+" if offset >= 0 else "-"
    tz_str = f"UTC{sign}{abs(offset):02d}:00"
    sleep_end = (sleep_start + 6) % 24
    peak_hr = int(max(range(24), key=lambda h: hourly_counts[h]))
    total = sum(hourly_counts)
    return {
        "estimated_offset": tz_str,
        "sleep_window_utc": f"{sleep_start:02d}:00 – {sleep_end:02d}:00 UTC",
        "peak_hour_utc": peak_hr,
        "confidence": f"High ({total} msgs)" if total >= 100 else f"Moderate ({total} msgs)",
    }


def parse_filtered_bot_reply(
    raw_text: str, bot_handle: str
) -> Tuple[List[Dict[str, str]], List[Dict[str, str]]]:
    """
    Strictly filters out bot instructions, ads, and generic placeholders
    (such as @username, @user, or the bot's own handle) when parsing history.
    """
    usernames: List[Dict[str, str]] = []
    names: List[Dict[str, str]] = []
    seen_u: Set[str] = set()
    seen_n: Set[str] = set()

    date_pattern = re.compile(
        r"(\d{1,2}[./\-]\d{1,2}[./\-]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)"
    )
    section = "general"

    for line in raw_text.splitlines():
        clean = line.strip()
        if not clean:
            continue
        lower_line = clean.lower()

        if "username" in lower_line and ":" in lower_line:
            section = "usernames"
            continue
        if "name" in lower_line and "username" not in lower_line and ":" in lower_line:
            section = "names"
            continue

        if any(phrase in lower_line for phrase in BANNED_DISPLAY_NAME_PHRASES):
            continue

        date_match = date_pattern.search(clean)
        observed_at = date_match.group(1) if date_match else "Recorded Entry"

        for h_match in HANDLE_REGEX.findall(clean):
            candidate = h_match.strip().lstrip("@")
            low_c = candidate.lower()
            if (
                low_c not in BANNED_BOT_HANDLES_AND_NOISE
                and not low_c.endswith("bot")
                and low_c not in seen_u
            ):
                seen_u.add(low_c)
                usernames.append(
                    {"username": candidate, "observed_at": observed_at, "source": bot_handle}
                )

        if section == "names" and date_match:
            after_date = clean[date_match.end() :].strip(" :->\t[]().0123456789")
            if (
                after_date
                and not after_date.startswith("@")
                and "http" not in after_date.lower()
                and after_date.lower() not in BANNED_BOT_HANDLES_AND_NOISE
                and after_date not in seen_n
            ):
                seen_n.add(after_date)
                names.append(
                    {"display_name": after_date, "observed_at": observed_at, "source": bot_handle}
                )

    return usernames, names


def compute_privacy_hardening(report_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculates a Privacy Hardening Score (0-100, higher = better hardened)
    and generates an actionable lockdown checklist for the audited account.
    """
    score = 100
    findings: List[Dict[str, str]] = []

    ent = report_data.get("module_1_entity") or {}
    avatars = report_data.get("module_4_avatars") or []
    bot_hist = report_data.get("module_3_bot_history") or {}
    social = report_data.get("module_5_social_activity") or {}
    cross = report_data.get("module_6_cross_platform") or {}

    if ent.get("phone") and ent.get("phone") != "Hidden":
        score -= 25
        findings.append(
            {
                "severity": "High Exposure",
                "vector": "Public Phone Number Exposed",
                "observation": f"Phone number ({ent['phone']}) is visible via MTProto entity lookup.",
                "remediation": "Navigate to Telegram Settings → Privacy and Security → Phone Number → Set 'Who can see my phone number' to 'Nobody'.",
            }
        )
    else:
        findings.append(
            {
                "severity": "Hardened",
                "vector": "Phone Number Redacted",
                "observation": "Target phone number is hidden from public MTProto resolution.",
                "remediation": "Maintain 'Nobody' visibility and restrict 'Who can find me by my number' to 'My Contacts'.",
            }
        )

    bio_entities = ent.get("bio_entities") or {}
    if bio_entities.get("emails") or bio_entities.get("urls"):
        score -= 12
        findings.append(
            {
                "severity": "Medium Exposure",
                "vector": "PII / External Links in Bio",
                "observation": "Public bio contains extractable email addresses or external web URLs.",
                "remediation": "Restrict 'Bio' visibility to 'My Contacts' or remove direct personal email identifiers from public about text.",
            }
        )

    if len(avatars) > 1:
        score -= 15
        findings.append(
            {
                "severity": "Medium Exposure",
                "vector": f"Historical Avatar Trail ({len(avatars)} Photos)",
                "observation": "Older profile photos remain stored on Telegram servers with exact UTC upload timestamps and pHash signatures.",
                "remediation": "Delete legacy profile pictures from your profile gallery so only a single non-reused avatar remains.",
            }
        )

    hist_unames = bot_hist.get("historical_usernames") or []
    if len(hist_unames) > 1:
        score -= 15
        findings.append(
            {
                "severity": "Medium Exposure",
                "vector": f"Historical Username Pivot Trail ({len(hist_unames)} Handles)",
                "observation": "Historical tracking bots linked legacy handles to your permanent Numeric User ID.",
                "remediation": "Avoid reusing legacy usernames across external platforms; permanent Telegram numeric IDs persist across handle changes.",
            }
        )

    if (social.get("sampled_messages_count") or 0) > 20:
        score -= 10
        findings.append(
            {
                "severity": "Low Exposure",
                "vector": " circadian / Timezone Inference",
                "observation": f"Public group message timestamps reveal an estimated {social.get('timezone', {}).get('estimated_offset', 'UTC')} local timezone.",
                "remediation": "Use scheduled messages in public supergroups if concealing local working hours is operationally required.",
            }
        )

    gh_leaks = cross.get("github_commit_emails") or []
    if gh_leaks:
        score -= 18
        findings.append(
            {
                "severity": "High Exposure",
                "vector": f"GitHub Commit Email Exposure ({len(gh_leaks)} Leaks)",
                "observation": "Matching username on GitHub exposed personal author emails in public PushEvent commit payloads.",
                "remediation": "Enable 'Keep my email addresses private' in GitHub Settings and configure git config user.email to your @users.noreply.github.com address.",
            }
        )

    matched_profiles = cross.get("matched_profiles") or []
    if len(matched_profiles) >= 3:
        score -= 10
        findings.append(
            {
                "severity": "Medium Exposure",
                "vector": f"Cross-Platform Handle Reuse ({len(matched_profiles)} Platforms)",
                "observation": "Target handle is claimed across multiple external developer or social networks.",
                "remediation": "Compartmentalize handles across sensitive accounts so a single Telegram @username cannot be correlated across services.",
            }
        )

    final_score = max(5, min(100, score))
    grade = (
        "A (Strong Hardening)"
        if final_score >= 85
        else "B (Moderate Exposure)"
        if final_score >= 65
        else "C (Elevated Digital Footprint)"
        if final_score >= 45
        else "D (High Public Exposure)"
    )
    return {"score": final_score, "grade": grade, "checklist": findings}


# ---------------------------------------------------------------------------
# Core Application State & Native 7-Module Auditor
# ---------------------------------------------------------------------------
class SpectraGramApp:
    def __init__(self) -> None:
        self.client: Optional[TelegramClient] = None
        self.config: Dict[str, Any] = self._load_config()
        self.pending_phone: Optional[str] = None
        self.pending_phone_code_hash: Optional[str] = None
        self.progress: Dict[str, Any] = {
            "running": False,
            "stage": 0,
            "total_stages": 7,
            "label": "Idle",
            "percent": 0,
            "target": "",
        }
        self.last_report: Optional[Dict[str, Any]] = None

    def _load_config(self) -> Dict[str, Any]:
        if CONFIG_PATH.exists():
            try:
                return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            except Exception as exc:
                logger.warning("Could not parse config.json: %s", exc)
        return {}

    def _save_config(self, api_id: int, api_hash: str, phone: str) -> None:
        self.config = {"api_id": api_id, "api_hash": api_hash, "phone": phone}
        CONFIG_PATH.write_text(json.dumps(self.config, indent=2), encoding="utf-8")

    async def ensure_client(self) -> Optional[TelegramClient]:
        api_id = self.config.get("api_id")
        api_hash = self.config.get("api_hash")
        if not api_id or not api_hash:
            return None
        if self.client is None:
            self.client = TelegramClient(str(SESSION_PATH), int(api_id), str(api_hash))
        if not self.client.is_connected():
            await self.client.connect()
        return self.client

    async def get_auth_status(self) -> Dict[str, Any]:
        client = await self.ensure_client()
        if not client:
            return {"configured": False, "authorized": False}
        try:
            is_auth = await client.is_user_authorized()
            me_summary = None
            if is_auth:
                me = await client.get_me()
                if me:
                    me_summary = {
                        "id": me.id,
                        "username": getattr(me, "username", None),
                        "first_name": getattr(me, "first_name", ""),
                    }
            return {
                "configured": True,
                "authorized": bool(is_auth),
                "operator": me_summary,
                "api_id": self.config.get("api_id"),
                "phone": self.config.get("phone"),
            }
        except Exception as exc:
            return {"configured": True, "authorized": False, "error": str(exc)}

    def _set_progress(self, stage: int, label: str, target: str) -> None:
        pct = int((stage / 7.0) * 100)
        self.progress = {
            "running": stage < 7,
            "stage": stage,
            "total_stages": 7,
            "label": label,
            "percent": pct,
            "target": target,
        }

    # -----------------------------------------------------------------------
    # Full 7-Module Native Audit Pipeline
    # -----------------------------------------------------------------------
    async def run_exposure_audit(self, raw_username: str) -> Dict[str, Any]:
        clean_username = raw_username.lstrip("@").strip()
        target_dir = REPORTS_ROOT / clean_username
        avatars_dir = target_dir / "avatars"
        target_dir.mkdir(parents=True, exist_ok=True)
        avatars_dir.mkdir(parents=True, exist_ok=True)

        client = await self.ensure_client()
        if not client or not await client.is_user_authorized():
            raise RuntimeError("Telegram session is not authorized. Complete Setup first.")

        # Module 1: MTProto Entity & Server Metadata
        self._set_progress(1, "Module 1/7: Resolving MTProto Entity & DC Fingerprint...", clean_username)
        full_resp = await client(GetFullUserRequest(clean_username))
        user: types.User = full_resp.users[0]
        full_user: types.UserFull = full_resp.full_user
        bio_text = getattr(full_user, "about", "") or ""
        bio_entities = extract_bio_entities(bio_text)

        status_str = "Hidden / Approximate"
        last_seen_utc = None
        if isinstance(user.status, types.UserStatusOnline):
            status_str = "Online"
            last_seen_utc = dt.datetime.now(dt.timezone.utc).isoformat()
        elif isinstance(user.status, types.UserStatusOffline) and user.status.was_online:
            status_str = "Offline (Exact Timestamp)"
            last_seen_utc = user.status.was_online.astimezone(dt.timezone.utc).isoformat()
        elif isinstance(user.status, types.UserStatusRecently):
            status_str = "Last seen recently (1 sec – 3 days)"
        elif isinstance(user.status, types.UserStatusLastWeek):
            status_str = "Last seen within a week (3 – 7 days)"
        elif isinstance(user.status, types.UserStatusLastMonth):
            status_str = "Last seen within a month (7 – 30 days)"

        dc_id = getattr(user.photo, "dc_id", None) if isinstance(user.photo, types.UserProfilePhoto) else None
        dc_meta = DC_GEOGRAPHY.get(
            dc_id or 0,
            {
                "dc_id": f"DC{dc_id}" if dc_id else "Unassigned",
                "location": "Undetermined (No Public Photo)",
                "region": "Unknown",
                "ip_v4": "N/A",
                "asn": "AS62041",
            },
        )
        est_date, est_conf = interpolate_account_creation(user.id)

        module_1 = {
            "username": user.username or clean_username,
            "numeric_id": user.id,
            "access_hash": hex(user.access_hash or 0),
            "display_name": f"{user.first_name or ''} {user.last_name or ''}".strip(),
            "bio": bio_text,
            "phone": f"+{user.phone}" if getattr(user, "phone", None) else "Hidden",
            "status": status_str,
            "last_seen_utc": last_seen_utc,
            "dc_id": dc_id,
            "dc_meta": dc_meta,
            "estimated_creation_date": est_date,
            "creation_confidence": est_conf,
            "flags": {
                "premium": bool(getattr(user, "premium", False)),
                "verified": bool(getattr(user, "verified", False)),
                "bot": bool(getattr(user, "bot", False)),
                "scam": bool(getattr(user, "scam", False)),
                "fake": bool(getattr(user, "fake", False)),
                "restricted": bool(getattr(user, "restricted", False)),
            },
            "bio_entities": bio_entities,
        }

        # Module 2: Public Web Preview Verifier (httpx + BeautifulSoup4)
        self._set_progress(2, "Module 2/7: Verifying Public t.me Web Preview & OpenGraph...", clean_username)
        module_2 = await self._module_2_web_preview(clean_username)

        # Module 3: Historical Metadata & Bot Querying
        self._set_progress(3, "Module 3/7: Querying Historical Tracking Bots...", clean_username)
        module_3 = await self._module_3_bot_history(client, user.id)

        # Module 4: Avatar Timeline & Image Hash Forensics
        self._set_progress(4, "Module 4/7: Downloading Avatars & Computing pHash Forensics...", clean_username)
        module_4 = await self._module_4_avatars(client, user, clean_username, avatars_dir)

        # Module 5: Shared Groups & Activity Timezone Estimator
        self._set_progress(5, "Module 5/7: Analyzing Shared Groups & UTC Activity Heatmap...", clean_username)
        module_5 = await self._module_5_social_activity(client, user)

        # Module 6: Native Async Cross-Platform Presence Check (httpx)
        self._set_progress(6, "Module 6/7: Checking 26 Platforms & GitHub Commit Exposures...", clean_username)
        candidate_handles = sorted(
            {
                clean_username,
                *(item["username"] for item in module_3.get("historical_usernames", [])),
            }
        )
        module_6 = await self._module_6_cross_platform(candidate_handles)

        # Module 7: Search Engine Launchpad & Privacy Hardening Score
        self._set_progress(7, "Module 7/7: Generating Dork Launchpad & Privacy Hardening Score...", clean_username)
        dorks = self._module_7_build_dorks(candidate_handles)

        report_payload: Dict[str, Any] = {
            "project": "SpectraGram — Telegram Digital Footprint & Exposure Auditor",
            "author": {
                "name": "Abolfazl Shaghaghi",
                "handle": "@shaghaghidev",
                "website": "https://shaghaghidev.ir",
                "github": "https://github.com/shaghaghidev/spectragram",
            },
            "generated_at_utc": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "target_username": f"@{clean_username}",
            "module_1_entity": module_1,
            "module_2_web_preview": module_2,
            "module_3_bot_history": module_3,
            "module_4_avatars": module_4,
            "module_5_social_activity": module_5,
            "module_6_cross_platform": module_6,
            "module_7_dorks": dorks,
        }
        report_payload["privacy_hardening"] = compute_privacy_hardening(report_payload)

        # Save standalone copies to ./reports/<username>/data.json and report.html
        data_json_path = target_dir / "data.json"
        report_html_path = target_dir / "report.html"
        data_json_path.write_text(
            json.dumps(report_payload, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        report_html_path.write_text(
            build_standalone_report_html(report_payload), encoding="utf-8"
        )

        self.last_report = report_payload
        return report_payload

    async def _module_2_web_preview(self, username: str) -> Dict[str, Any]:
        url = f"https://t.me/{username}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"
        }
        try:
            async with httpx.AsyncClient(timeout=12.0, follow_redirects=True, headers=headers) as hc:
                resp = await hc.get(url)
                soup = BeautifulSoup(resp.text, "html.parser")
                og_title = soup.find("meta", property="og:title")
                og_desc = soup.find("meta", property="og:description")
                og_image = soup.find("meta", property="og:image")
                page_extra = soup.find("div", class_="tgme_page_extra")
                return {
                    "url": url,
                    "http_status": resp.status_code,
                    "public_web_resolvable": resp.status_code == 200 and bool(og_title),
                    "og_title": og_title["content"] if og_title and og_title.get("content") else "",
                    "og_description": og_desc["content"] if og_desc and og_desc.get("content") else "",
                    "og_image": og_image["content"] if og_image and og_image.get("content") else f"https://t.me/i/userpic/320/{username}.jpg",
                    "extra_handle_text": page_extra.get_text(strip=True) if page_extra else f"@{username}",
                }
        except Exception as exc:
            return {
                "url": url,
                "http_status": 0,
                "public_web_resolvable": False,
                "og_title": "",
                "og_description": "",
                "og_image": f"https://t.me/i/userpic/320/{username}.jpg",
                "error": str(exc),
            }

    async def _module_3_bot_history(
        self, client: TelegramClient, numeric_id: int
    ) -> Dict[str, Any]:
        bots = ["@SangMata_BOT", "@SangMata_beta_bot", "@usinfobot", "@creationdatebot"]
        transcripts: List[Dict[str, Any]] = []
        merged_usernames: List[Dict[str, str]] = []
        merged_names: List[Dict[str, str]] = []
        seen_u: Set[str] = set()
        seen_n: Set[str] = set()

        for bot_handle in bots:
            try:
                async with client.conversation(bot_handle, timeout=14) as conv:
                    await conv.send_message("/start")
                    try:
                        await conv.get_response(timeout=4)
                    except asyncio.TimeoutError:
                        logger.debug("Bot %s /start ack timed out; proceeding with ID query", bot_handle)

                    await conv.send_message(str(numeric_id))
                    reply = await conv.get_response(timeout=10)
                    raw_text = reply.raw_text or ""

                    try:
                        follow_up = await conv.get_response(timeout=3)
                        if follow_up and follow_up.raw_text:
                            raw_text += "\n" + follow_up.raw_text
                    except asyncio.TimeoutError:
                        logger.debug("No follow-up message from %s", bot_handle)

                    u_list, n_list = parse_filtered_bot_reply(raw_text, bot_handle)
                    for u_item in u_list:
                        if u_item["username"].lower() not in seen_u:
                            seen_u.add(u_item["username"].lower())
                            merged_usernames.append(u_item)
                    for n_item in n_list:
                        if n_item["display_name"] not in seen_n:
                            seen_n.add(n_item["display_name"])
                            merged_names.append(n_item)

                    transcripts.append(
                        {
                            "bot": bot_handle,
                            "responded": True,
                            "raw_text": raw_text[:2000],
                        }
                    )
            except errors.FloodWaitError as fw:
                transcripts.append(
                    {
                        "bot": bot_handle,
                        "responded": False,
                        "raw_text": f"FloodWaitError ({fw.seconds}s)",
                    }
                )
            except Exception as exc:
                transcripts.append(
                    {
                        "bot": bot_handle,
                        "responded": False,
                        "raw_text": f"No response / Timeout ({exc})",
                    }
                )

        return {
            "historical_usernames": merged_usernames,
            "historical_names": merged_names,
            "bot_transcripts": transcripts,
        }

    async def _module_4_avatars(
        self,
        client: TelegramClient,
        user: types.User,
        clean_username: str,
        avatars_dir: Path,
    ) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        try:
            photos_resp = await client(
                GetUserPhotosRequest(user_id=user, offset=0, max_id=0, limit=50)
            )
            for idx, photo in enumerate(getattr(photos_resp, "photos", [])):
                if not isinstance(photo, types.Photo):
                    continue
                is_video = bool(getattr(photo, "video_sizes", None))
                ext = "mp4" if is_video else "jpg"
                upload_dt = photo.date.astimezone(dt.timezone.utc)
                fname = f"avatar_{idx:02d}_{photo.id}_{upload_dt:%Y%m%d_%H%M%S}.{ext}"
                out_path = avatars_dir / fname

                downloaded = await client.download_media(photo, file=str(out_path))
                if not downloaded or not Path(downloaded).exists():
                    continue

                raw_bytes = Path(downloaded).read_bytes()
                md5_hex = hashlib.md5(raw_bytes).hexdigest()
                sha256_hex = hashlib.sha256(raw_bytes).hexdigest()
                phash_hex = "N/A (Video)"
                dimensions = "Video Profile"
                exif_summary: Dict[str, str] = {}

                if not is_video:
                    try:
                        with Image.open(downloaded) as im:
                            dimensions = f"{im.width}x{im.height}"
                            phash_hex = str(imagehash.phash(im))
                            for tag_id, val in (im.getexif() or {}).items():
                                exif_summary[str(ExifTags.TAGS.get(tag_id, tag_id))] = str(val)[:100]
                    except Exception as img_exc:
                        logger.debug("Image EXIF/pHash parse warning: %s", img_exc)

                pub_avatar_url = quote_plus(f"https://t.me/i/userpic/320/{clean_username}.jpg")
                results.append(
                    {
                        "index": idx,
                        "photo_id": str(photo.id),
                        "file_name": fname,
                        "local_rel_path": f"avatars/{fname}",
                        "web_url": f"/reports/{clean_username}/avatars/{fname}",
                        "uploaded_utc": upload_dt.strftime("%Y-%m-%d %H:%M:%S UTC"),
                        "dc_id": getattr(photo, "dc_id", None),
                        "dimensions": dimensions,
                        "size_bytes": len(raw_bytes),
                        "md5": md5_hex,
                        "sha256": sha256_hex,
                        "phash": phash_hex,
                        "exif": exif_summary,
                        "reverse_links": {
                            "google_lens": f"https://lens.google.com/uploadbyurl?url={pub_avatar_url}",
                            "yandex": f"https://yandex.com/images/search?rpt=imageview&url={pub_avatar_url}",
                            "tineye": f"https://tineye.com/search?url={pub_avatar_url}",
                        },
                    }
                )
        except Exception as exc:
            logger.warning("Avatar extraction warning: %s", exc)
        return results

    async def _module_5_social_activity(
        self, client: TelegramClient, user: types.User
    ) -> Dict[str, Any]:
        hourly_bins = [0] * 24
        groups_list: List[Dict[str, Any]] = []
        sampled_total = 0

        try:
            common_resp = await client(GetCommonChatsRequest(user_id=user, max_id=0, limit=50))
            for chat in getattr(common_resp, "chats", [])[:12]:
                title = getattr(chat, "title", "Shared Group")
                uname = getattr(chat, "username", None)
                msg_count = 0
                try:
                    async for msg in client.iter_messages(chat, from_user=user, limit=200):
                        if msg.date:
                            hourly_bins[msg.date.astimezone(dt.timezone.utc).hour] += 1
                            msg_count += 1
                            sampled_total += 1
                except Exception as iter_exc:
                    logger.debug("Message sampling skipped for chat %s: %s", title, iter_exc)
                groups_list.append(
                    {
                        "id": chat.id,
                        "title": title,
                        "handle": f"@{uname}" if uname else "Private Group",
                        "sampled_messages": msg_count,
                    }
                )
        except Exception as exc:
            logger.warning("Common chats warning: %s", exc)

        tz_info = estimate_timezone_from_hourly_utc(hourly_bins)
        return {
            "common_groups": groups_list,
            "sampled_messages_count": sampled_total,
            "hourly_histogram_utc": hourly_bins,
            "timezone": tz_info,
        }

    async def _module_6_cross_platform(self, usernames: List[str]) -> Dict[str, Any]:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
            "Accept": "text/html,application/json;q=0.9,*/*;q=0.8",
        }
        matched_profiles: List[Dict[str, Any]] = []
        github_repos: List[Dict[str, Any]] = []
        github_commit_emails: List[Dict[str, str]] = []

        semaphore = asyncio.Semaphore(10)

        async def check_single(hc: httpx.AsyncClient, uname: str, p_spec: Dict[str, Any]) -> None:
            url = p_spec["url"].format(u=uname)
            async with semaphore:
                try:
                    resp = await hc.get(url)
                    if resp.status_code == 200 and p_spec["nf_text"].lower() not in resp.text[:4000].lower():
                        matched_profiles.append(
                            {
                                "username": uname,
                                "platform": p_spec["name"],
                                "category": p_spec["category"],
                                "url": url,
                                "http_status": resp.status_code,
                            }
                        )
                except Exception:
                    return

        async with httpx.AsyncClient(timeout=9.0, follow_redirects=True, headers=headers) as hc:
            tasks = [
                check_single(hc, uname, p_spec)
                for uname in usernames[:3]
                for p_spec in NATIVE_PLATFORMS
            ]
            await asyncio.gather(*tasks)

            # Deep GitHub REST API check for public repos and commit author emails
            seen_emails: Set[str] = set()
            for uname in usernames[:3]:
                try:
                    r_resp = await hc.get(
                        f"https://api.github.com/users/{uname}/repos?per_page=10&sort=updated"
                    )
                    if r_resp.status_code == 200:
                        for repo in r_resp.json()[:6]:
                            github_repos.append(
                                {
                                    "username": uname,
                                    "name": repo.get("full_name", ""),
                                    "url": repo.get("html_url", ""),
                                    "language": repo.get("language") or "Text",
                                    "stars": repo.get("stargazers_count", 0),
                                }
                            )
                    e_resp = await hc.get(
                        f"https://api.github.com/users/{uname}/events/public?per_page=50"
                    )
                    if e_resp.status_code == 200:
                        for ev in e_resp.json():
                            if ev.get("type") != "PushEvent":
                                continue
                            repo_name = ev.get("repo", {}).get("name", "")
                            for c in ev.get("payload", {}).get("commits", []):
                                author = c.get("author", {})
                                email = (author.get("email") or "").strip().lower()
                                if (
                                    email
                                    and "noreply.github.com" not in email
                                    and email not in seen_emails
                                ):
                                    seen_emails.add(email)
                                    github_commit_emails.append(
                                        {
                                            "username": uname,
                                            "email": email,
                                            "author_name": author.get("name", ""),
                                            "repo": repo_name,
                                            "sha": (c.get("sha") or "")[:8],
                                        }
                                    )
                except Exception:
                    continue

        return {
            "platforms_checked_per_handle": len(NATIVE_PLATFORMS),
            "matched_profiles": sorted(matched_profiles, key=lambda x: x["platform"]),
            "github_repos": github_repos,
            "github_commit_emails": github_commit_emails,
        }

    @staticmethod
    def _module_7_build_dorks(usernames: List[str]) -> List[Dict[str, str]]:
        dorks: List[Dict[str, str]] = []
        for uname in usernames:
            q = quote_plus(uname)
            q_tme = f'site:t.me "{uname}"'
            q_ext = f'intext:"t.me/{uname}" -site:t.me'
            q_code = f'(site:github.com OR site:gitlab.com OR site:pastebin.com) "{uname}"'
            dorks.extend(
                [
                    {
                        "engine": "TGStat",
                        "category": "Telegram Analytics",
                        "title": f"TGStat Channel & Mention Search (@{uname})",
                        "query": f"@{uname}",
                        "url": f"https://tgstat.com/search?q={quote_plus('@' + uname)}",
                    },
                    {
                        "engine": "Telemetr",
                        "category": "Telegram Analytics",
                        "title": f"Telemetr Catalog Lookup (@{uname})",
                        "query": uname,
                        "url": f"https://telemetr.io/en/channels?channel={q}",
                    },
                    {
                        "engine": "Lyzem",
                        "category": "Telegram Search",
                        "title": f"Lyzem Public Message Index (@{uname})",
                        "query": uname,
                        "url": f"https://lyzem.com/search?q={q}",
                    },
                    {
                        "engine": "Telegago CSE",
                        "category": "Telegram Search",
                        "title": f"Telegago Google Custom Search (@{uname})",
                        "query": uname,
                        "url": f"https://cse.google.com/cse?cx=006368593537057042503:efxu7xprihg&q={q}",
                    },
                    {
                        "engine": "Google Dork",
                        "category": "Direct t.me Surface",
                        "title": f"Indexed t.me Links (@{uname})",
                        "query": q_tme,
                        "url": f"https://www.google.com/search?q={quote_plus(q_tme)}",
                    },
                    {
                        "engine": "Google Dork",
                        "category": "External Mentions",
                        "title": f"External Websites Linking to t.me/{uname}",
                        "query": q_ext,
                        "url": f"https://www.google.com/search?q={quote_plus(q_ext)}",
                    },
                    {
                        "engine": "Google Dork",
                        "category": "Code & Repositories",
                        "title": f"Public Code & Paste Mentions (@{uname})",
                        "query": q_code,
                        "url": f"https://www.google.com/search?q={quote_plus(q_code)}",
                    },
                ]
            )
        return dorks


# ---------------------------------------------------------------------------
# Standalone HTML Report Generator (Ultra-Clean & Minimal)
# ---------------------------------------------------------------------------
def build_standalone_report_html(data: Dict[str, Any]) -> str:
    ent = data.get("module_1_entity") or {}
    web_prev = data.get("module_2_web_preview") or {}
    bot_hist = data.get("module_3_bot_history") or {}
    avatars = data.get("module_4_avatars") or []
    social = data.get("module_5_social_activity") or {}
    cross = data.get("module_6_cross_platform") or {}
    dorks = data.get("module_7_dorks") or []
    hardening = data.get("privacy_hardening") or {}

    hourly = social.get("hourly_histogram_utc") or [0] * 24
    max_hr = max(hourly) if any(hourly) else 1
    bars_html = "".join(
        f'<div class="bar-col"><div class="bar-fill" style="height:{max(4, int((c / max_hr) * 100))}%" '
        f'title="{hr:02d}:00 UTC: {c} msgs"></div><span class="bar-lbl">{hr:02d}</span></div>'
        for hr, c in enumerate(hourly)
    )

    hist_u_rows = "".join(
        f"<tr><td class='mono'>@{html.escape(u['username'])}</td><td class='mono'>{html.escape(u['observed_at'])}</td><td>{html.escape(u['source'])}</td></tr>"
        for u in bot_hist.get("historical_usernames", [])
    ) or "<tr><td colspan='3'>No historical username changes recorded.</td></tr>"

    cross_rows = "".join(
        f"<tr><td class='mono'>@{html.escape(p['username'])}</td><td>{html.escape(p['platform'])}</td><td>{html.escape(p['category'])}</td><td><a href='{html.escape(p['url'])}' target='_blank' rel='noopener'>{html.escape(p['url'])}</a></td></tr>"
        for p in cross.get("matched_profiles", [])
    ) or "<tr><td colspan='4'>No cross-platform matches detected.</td></tr>"

    checklist_rows = "".join(
        f"<tr><td><strong>{html.escape(item['vector'])}</strong> ({html.escape(item['severity'])})</td>"
        f"<td>{html.escape(item['observation'])}</td>"
        f"<td>{html.escape(item['remediation'])}</td></tr>"
        for item in hardening.get("checklist", [])
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>SpectraGram Exposure Audit — {html.escape(data.get("target_username", ""))}</title>
<style>
  :root {{ --bg: #0b1120; --surface: #111827; --border: #1e293b; --text: #f1f5f9; --muted: #94a3b8; --accent: #38bdf8; }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; padding: 2rem; }}
  .wrap {{ max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }}
  header {{ display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--border); padding-bottom: 1rem; }}
  h1 {{ font-size: 1.45rem; font-weight: 700; }}
  h2 {{ font-size: 1.05rem; font-weight: 600; margin-bottom: 0.85rem; }}
  .panel {{ background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; }}
  .grid-2 {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.5rem; }}
  .kv {{ display: flex; justify-content: space-between; padding: 0.45rem 0; border-bottom: 1px solid var(--border); font-size: 0.88rem; }}
  .mono {{ font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; font-size: 0.82rem; }}
  .heatmap {{ display: grid; grid-template-columns: repeat(24, 1fr); gap: 4px; height: 130px; align-items: end; padding-top: 1rem; }}
  .bar-col {{ display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }}
  .bar-fill {{ width: 100%; background: var(--accent); border-radius: 2px 2px 0 0; }}
  .bar-lbl {{ font-size: 0.68rem; color: var(--muted); margin-top: 4px; font-family: monospace; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 0.85rem; }}
  th, td {{ text-align: left; padding: 0.6rem; border-bottom: 1px solid var(--border); vertical-align: top; }}
  a {{ color: var(--accent); text-decoration: none; }}
  a:hover {{ text-decoration: underline; }}
  footer {{ border-top: 1px solid var(--border); padding-top: 1.25rem; font-size: 0.8rem; color: var(--muted); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>SpectraGram Exposure Audit — {html.escape(data.get("target_username", ""))}</h1>
    <span class="mono">{html.escape(data.get("generated_at_utc", ""))} · Score: {hardening.get("score", 100)}/100</span>
  </header>
  <div class="grid-2">
    <section class="panel">
      <h2>01. MTProto Entity &amp; Server Metadata</h2>
      <div class="kv"><span>Permanent Numeric ID</span><span class="mono">{ent.get("numeric_id")}</span></div>
      <div class="kv"><span>Access Hash</span><span class="mono">{html.escape(str(ent.get("access_hash")))}</span></div>
      <div class="kv"><span>Display Name</span><span>{html.escape(str(ent.get("display_name")))}</span></div>
      <div class="kv"><span>Estimated Creation Date</span><span class="mono">{html.escape(str(ent.get("estimated_creation_date")))}</span></div>
      <div class="kv"><span>Data Center Region</span><span>{html.escape(str(ent.get("dc_meta", {}).get("location")))}</span></div>
      <div class="kv"><span>Public Web Preview (t.me)</span><span>HTTP {web_prev.get("http_status")} · {"Visible" if web_prev.get("public_web_resolvable") else "Restricted"}</span></div>
      <div class="kv"><span>Bio</span><span>{html.escape(str(ent.get("bio")))}</span></div>
    </section>
    <section class="panel">
      <h2>05. Activity Timezone Estimator ({len(avatars)} Avatars Archived)</h2>
      <div class="kv"><span>Estimated Local Timezone</span><span class="mono">{html.escape(str(social.get("timezone", {}).get("estimated_offset")))}</span></div>
      <div class="kv"><span>Estimated Sleep Window</span><span class="mono">{html.escape(str(social.get("timezone", {}).get("sleep_window_utc")))}</span></div>
      <div class="kv"><span>Sampled Group Messages</span><span class="mono">{social.get("sampled_messages_count", 0)} messages</span></div>
      <div class="heatmap">{bars_html}</div>
    </section>
  </div>
  <section class="panel">
    <h2>03. Historical Usernames (Strictly Filtered Bot Records)</h2>
    <table><thead><tr><th>Username</th><th>Observed Timestamp</th><th>Source Bot</th></tr></thead><tbody>{hist_u_rows}</tbody></table>
  </section>
  <section class="panel">
    <h2>06. Native Async Cross-Platform Presence ({cross.get("platforms_checked_per_handle", 26)} Platforms Checked)</h2>
    <table><thead><tr><th>Handle</th><th>Platform</th><th>Category</th><th>URL</th></tr></thead><tbody>{cross_rows}</tbody></table>
  </section>
  <section class="panel">
    <h2>07. Privacy Hardening Score ({hardening.get("score", 100)}/100 — {html.escape(str(hardening.get("grade", "")))}) &amp; Lockdown Checklist</h2>
    <table><thead><tr><th>Exposure Vector</th><th>Audit Observation</th><th>Recommended Lockdown Action</th></tr></thead><tbody>{checklist_rows}</tbody></table>
  </section>
  <footer>
    <span>SpectraGram — Telegram Digital Footprint &amp; Exposure Auditor</span>
    <span>Crafted by <a href="https://shaghaghidev.ir" target="_blank" rel="noopener">Abolfazl Shaghaghi (@shaghaghidev)</a> · <a href="https://github.com/shaghaghidev/spectragram" target="_blank" rel="noopener">GitHub Repository</a></span>
  </footer>
</div>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Embedded Local Web GUI (Pure HTML5 / CSS3 / Vanilla JS)
# ---------------------------------------------------------------------------
WEB_GUI_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>SpectraGram — Telegram Digital Footprint &amp; Exposure Auditor</title>
<style>
  :root {
    --bg: #0b1120;
    --surface: #111827;
    --surface-2: #0f172a;
    --border: #1e293b;
    --text: #f1f5f9;
    --muted: #94a3b8;
    --accent: #38bdf8;
    --emerald: #10b981;
    --amber: #f59e0b;
    --crimson: #ef4444;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    line-height: 1.6;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 2rem;
    border-bottom: 1px solid var(--border);
    background: rgba(15, 23, 42, 0.85);
  }
  .brand { font-size: 1.1rem; font-weight: 700; letter-spacing: -0.01em; }
  .status-txt { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.8rem; color: var(--muted); }
  main { flex: 1; max-width: 1240px; width: 100%; margin: 0 auto; padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
  .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; }
  h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.35rem; }
  h2 { font-size: 1.05rem; font-weight: 600; margin-bottom: 1rem; }
  .muted { color: var(--muted); font-size: 0.88rem; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric: tabular-nums; }
  .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-top: 1rem; }
  label { display: block; font-size: 0.78rem; color: var(--muted); margin-bottom: 0.35rem; }
  input {
    width: 100%;
    padding: 0.65rem 0.85rem;
    background: #020617;
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-size: 0.9rem;
  }
  input:focus { outline: none; border-color: var(--accent); }
  button {
    padding: 0.65rem 1.25rem;
    background: var(--accent);
    color: #020617;
    font-weight: 600;
    font-size: 0.85rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;
  }
  button:hover { opacity: 0.92; }
  .search-bar { display: flex; gap: 0.75rem; margin-top: 1rem; }
  .progress-wrap { margin-top: 1rem; display: none; }
  .progress-track { width: 100%; height: 6px; background: #020617; border-radius: 4px; overflow: hidden; margin-top: 0.4rem; }
  .progress-bar { height: 100%; background: var(--accent); width: 0%; transition: width 0.25s ease; }
  .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem; }
  .kv { display: flex; justify-content: space-between; padding: 0.45rem 0; border-bottom: 1px solid var(--border); font-size: 0.86rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
  th, td { text-align: left; padding: 0.55rem; border-bottom: 1px solid var(--border); }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  details { margin-top: 0.75rem; border: 1px solid var(--border); border-radius: 6px; padding: 0.6rem 0.85rem; background: #020617; }
  summary { cursor: pointer; font-size: 0.8rem; color: var(--muted); }
  pre { font-size: 0.76rem; color: var(--muted); white-space: pre-wrap; margin-top: 0.5rem; }
  footer {
    border-top: 1px solid var(--border);
    padding: 1.25rem 2rem;
    font-size: 0.8rem;
    color: var(--muted);
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
  }
</style>
</head>
<body>
<header>
  <div class="brand">SpectraGram</div>
  <div id="auth-indicator" class="status-txt">Checking local session...</div>
</header>
<main>
  <!-- View 1: Browser-Based Setup & Telegram API Authorization -->
  <section id="setup-view" class="panel" style="display:none;">
    <h1>Setup &amp; Telegram MTProto Authorization</h1>
    <p class="muted">Enter your Telegram API credentials from my.telegram.org. Saved locally to config.json so setup is only required once.</p>
    <div class="form-grid">
      <div><label for="api-id">API_ID</label><input id="api-id" type="text" placeholder="12345678" /></div>
      <div><label for="api-hash">API_HASH</label><input id="api-hash" type="text" placeholder="0123456789abcdef..." /></div>
      <div><label for="phone">Phone Number</label><input id="phone" type="text" placeholder="+1234567890" /></div>
    </div>
    <div style="margin-top:1rem; display:flex; gap:0.75rem; align-items:center;">
      <button id="btn-send-code" onclick="sendCode()">Send Login Code</button>
      <span id="setup-msg" class="muted"></span>
    </div>
    <div id="code-step" style="display:none; margin-top:1.25rem; padding-top:1rem; border-top:1px solid var(--border);">
      <div class="form-grid">
        <div><label for="login-code">Telegram Login Code</label><input id="login-code" type="text" placeholder="12345" /></div>
        <div><label for="twofa-pwd">2FA Password (If Enabled)</label><input id="twofa-pwd" type="password" placeholder="Optional cloud password" /></div>
      </div>
      <div style="margin-top:1rem;"><button onclick="verifyCode()">Authorize Session</button></div>
    </div>
  </section>

  <!-- View 2: One-Click Exposure Audit Bar -->
  <section id="audit-view" class="panel" style="display:none;">
    <h1>Telegram Digital Footprint &amp; Exposure Auditor</h1>
    <p class="muted">Enter a single Telegram @username to execute all 7 native analytical modules and generate a local report.</p>
    <div class="search-bar">
      <input id="target-username" class="mono" type="text" placeholder="Enter Telegram @username (e.g., @durov)" />
      <button onclick="startAudit()">Run Exposure Audit</button>
    </div>
    <div id="progress-box" class="progress-wrap">
      <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
        <span id="progress-label" class="mono">Starting...</span>
        <span id="progress-pct" class="mono">0%</span>
      </div>
      <div class="progress-track"><div id="progress-bar" class="progress-bar"></div></div>
    </div>
  </section>

  <!-- View 3: Rendered Report Container -->
  <div id="report-output"></div>
</main>
<footer>
  <span>SpectraGram — Telegram Digital Footprint &amp; Exposure Auditor</span>
  <span>Crafted by <a href="https://shaghaghidev.ir" target="_blank" rel="noopener">Abolfazl Shaghaghi (@shaghaghidev)</a> · <a href="https://github.com/shaghaghidev/spectragram" target="_blank" rel="noopener">github.com/shaghaghidev/spectragram</a></span>
</footer>
<script>
async function checkStatus() {
  const res = await fetch('/api/status');
  const data = await res.json();
  const ind = document.getElementById('auth-indicator');
  if (data.authorized) {
    ind.textContent = 'Session Authorized · ' + (data.operator?.username ? '@' + data.operator.username : 'Active');
    document.getElementById('setup-view').style.display = 'none';
    document.getElementById('audit-view').style.display = 'block';
  } else {
    ind.textContent = 'Setup Required';
    document.getElementById('setup-view').style.display = 'block';
    document.getElementById('audit-view').style.display = 'none';
  }
}
async function sendCode() {
  const api_id = document.getElementById('api-id').value.trim();
  const api_hash = document.getElementById('api-hash').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const msg = document.getElementById('setup-msg');
  msg.textContent = 'Sending code via MTProto...';
  const res = await fetch('/api/auth/send-code', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({api_id, api_hash, phone})
  });
  const data = await res.json();
  if (data.ok) {
    msg.textContent = 'Login code sent to your Telegram app.';
    document.getElementById('code-step').style.display = 'block';
  } else {
    msg.textContent = 'Error: ' + (data.error || 'Failed');
  }
}
async function verifyCode() {
  const code = document.getElementById('login-code').value.trim();
  const password = document.getElementById('twofa-pwd').value;
  const msg = document.getElementById('setup-msg');
  const res = await fetch('/api/auth/verify-code', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({code, password})
  });
  const data = await res.json();
  if (data.ok) {
    await checkStatus();
  } else {
    msg.textContent = 'Verification error: ' + (data.error || 'Invalid code');
  }
}
async function startAudit() {
  const username = document.getElementById('target-username').value.trim();
  if (!username) return;
  const pBox = document.getElementById('progress-box');
  pBox.style.display = 'block';
  const poll = setInterval(async () => {
    const r = await fetch('/api/progress');
    const p = await r.json();
    document.getElementById('progress-label').textContent = p.label;
    document.getElementById('progress-pct').textContent = p.percent + '%';
    document.getElementById('progress-bar').style.width = p.percent + '%';
  }, 500);

  const res = await fetch('/api/audit', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({username})
  });
  clearInterval(poll);
  const data = await res.json();
  if (data.ok) {
    document.getElementById('progress-label').textContent = 'Saved ./reports/' + username.replace(/^@/, '') + '/report.html';
    document.getElementById('progress-pct').textContent = '100%';
    document.getElementById('progress-bar').style.width = '100%';
    renderReport(data.report);
  } else {
    document.getElementById('progress-label').textContent = 'Audit failed: ' + (data.error || 'Unknown error');
  }
}
function renderReport(r) {
  const ent = r.module_1_entity || {};
  const wp = r.module_2_web_preview || {};
  const bh = r.module_3_bot_history || {};
  const sg = r.module_5_social_activity || {};
  const cp = r.module_6_cross_platform || {};
  const ph = r.privacy_hardening || {};
  const out = document.getElementById('report-output');

  const uRows = (bh.historical_usernames || []).map(u =>
    `<tr><td class="mono">@${u.username}</td><td class="mono">${u.observed_at}</td><td>${u.source}</td></tr>`
  ).join('') || '<tr><td colspan="3">None recorded</td></tr>';

  const cpRows = (cp.matched_profiles || []).map(p =>
    `<tr><td class="mono">@${p.username}</td><td>${p.platform}</td><td>${p.category}</td><td><a href="${p.url}" target="_blank">${p.url}</a></td></tr>`
  ).join('') || '<tr><td colspan="4">No matches</td></tr>';

  const clRows = (ph.checklist || []).map(item =>
    `<tr><td><strong>${item.vector}</strong> (${item.severity})</td><td>${item.observation}</td><td>${item.remediation}</td></tr>`
  ).join('');

  out.innerHTML = `
    <div class="grid-2" style="margin-bottom:1.5rem;">
      <section class="panel">
        <h2>01. MTProto Entity &amp; Server Metadata</h2>
        <div class="kv"><span>Handle &amp; Name</span><span>@${ent.username} · ${ent.display_name}</span></div>
        <div class="kv"><span>Permanent Numeric ID</span><span class="mono">${ent.numeric_id}</span></div>
        <div class="kv"><span>Access Hash</span><span class="mono">${ent.access_hash}</span></div>
        <div class="kv"><span>Estimated Creation</span><span class="mono">${ent.estimated_creation_date} (${ent.creation_confidence})</span></div>
        <div class="kv"><span>Data Center</span><span>${ent.dc_meta?.location || 'N/A'}</span></div>
        <div class="kv"><span>Web Preview (t.me)</span><span>HTTP ${wp.http_status} · ${wp.public_web_resolvable ? 'Visible' : 'Restricted'}</span></div>
      </section>
      <section class="panel">
        <h2>05. Shared Groups &amp; Timezone Estimator</h2>
        <div class="kv"><span>Estimated Timezone</span><span class="mono">${sg.timezone?.estimated_offset}</span></div>
        <div class="kv"><span>Sleep Window (UTC)</span><span class="mono">${sg.timezone?.sleep_window_utc}</span></div>
        <div class="kv"><span>Sampled Messages</span><span class="mono">${sg.sampled_messages_count} msgs across ${(sg.common_groups || []).length} groups</span></div>
      </section>
    </div>
    <section class="panel" style="margin-bottom:1.5rem;">
      <h2>03. Historical Usernames (Filtered Bot Records)</h2>
      <table><thead><tr><th>Username</th><th>Observed</th><th>Source Bot</th></tr></thead><tbody>${uRows}</tbody></table>
    </section>
    <section class="panel" style="margin-bottom:1.5rem;">
      <h2>06. Native Async Cross-Platform Presence</h2>
      <table><thead><tr><th>Handle</th><th>Platform</th><th>Category</th><th>URL</th></tr></thead><tbody>${cpRows}</tbody></table>
    </section>
    <section class="panel">
      <h2>07. Privacy Hardening Score (${ph.score}/100 — ${ph.grade}) &amp; Checklist</h2>
      <table><thead><tr><th>Vector</th><th>Observation</th><th>Remediation</th></tr></thead><tbody>${clRows}</tbody></table>
    </section>
  `;
}
checkStatus();
</script>
</body>
</html>
"""


# ---------------------------------------------------------------------------
# aiohttp Local Web Server Routes
# ---------------------------------------------------------------------------
def create_web_app() -> web.Application:
    spectragram = SpectraGramApp()
    app = web.Application()

    async def handle_index(_request: web.Request) -> web.Response:
        return web.Response(text=WEB_GUI_HTML, content_type="text/html")

    async def handle_status(_request: web.Request) -> web.Response:
        st = await spectragram.get_auth_status()
        return web.json_response(st)

    async def handle_progress(_request: web.Request) -> web.Response:
        return web.json_response(spectragram.progress)

    async def handle_send_code(request: web.Request) -> web.Response:
        body = await request.json()
        try:
            api_id = int(body.get("api_id", 0))
            api_hash = str(body.get("api_hash", "")).strip()
            phone = str(body.get("phone", "")).strip()
            spectragram._save_config(api_id, api_hash, phone)
            client = await spectragram.ensure_client()
            if not client:
                return web.json_response({"ok": False, "error": "Invalid API credentials"})
            sent = await client.send_code_request(phone)
            spectragram.pending_phone = phone
            spectragram.pending_phone_code_hash = sent.phone_code_hash
            return web.json_response({"ok": True})
        except Exception as exc:
            return web.json_response({"ok": False, "error": str(exc)})

    async def handle_verify_code(request: web.Request) -> web.Response:
        body = await request.json()
        code = str(body.get("code", "")).strip()
        password = str(body.get("password", ""))
        client = await spectragram.ensure_client()
        if not client or not spectragram.pending_phone:
            return web.json_response({"ok": False, "error": "Send login code first."})
        try:
            await client.sign_in(
                phone=spectragram.pending_phone,
                code=code,
                phone_code_hash=spectragram.pending_phone_code_hash,
            )
            return web.json_response({"ok": True})
        except errors.SessionPasswordNeededError:
            try:
                await client.sign_in(password=password)
                return web.json_response({"ok": True})
            except Exception as pw_exc:
                return web.json_response({"ok": False, "error": f"2FA Error: {pw_exc}"})
        except Exception as exc:
            return web.json_response({"ok": False, "error": str(exc)})

    async def handle_audit(request: web.Request) -> web.Response:
        body = await request.json()
        username = str(body.get("username", "")).strip()
        if not username:
            return web.json_response({"ok": False, "error": "Username is required."})
        try:
            report = await spectragram.run_exposure_audit(username)
            return web.json_response({"ok": True, "report": report})
        except Exception as exc:
            logger.exception("Audit execution error")
            return web.json_response({"ok": False, "error": str(exc)})

    app.router.add_get("/", handle_index)
    app.router.add_get("/api/status", handle_status)
    app.router.add_get("/api/progress", handle_progress)
    app.router.add_post("/api/auth/send-code", handle_send_code)
    app.router.add_post("/api/auth/verify-code", handle_verify_code)
    app.router.add_post("/api/audit", handle_audit)
    app.router.add_static("/reports", str(REPORTS_ROOT), show_index=False)
    return app


def main() -> None:
    url = f"http://{HOST}:{PORT}"
    logger.info("Starting SpectraGram Local Web GUI on %s", url)
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    app = create_web_app()
    runner = web.AppRunner(app)
    loop.run_until_complete(runner.setup())
    site = web.TCPSite(runner, HOST, PORT)
    loop.run_until_complete(site.start())

    try:
        webbrowser.open(url)
    except Exception as wb_exc:
        logger.debug("Browser auto-open skipped: %s", wb_exc)

    logger.info("SpectraGram is running at %s — Press Ctrl+C to stop.", url)
    try:
        loop.run_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down SpectraGram.")
    finally:
        loop.run_until_complete(runner.cleanup())


if __name__ == "__main__":
    main()
