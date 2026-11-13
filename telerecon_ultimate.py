#!/usr/bin/env python3
"""
telerecon_ultimate.py — Principal Asynchronous Telegram OSINT Orchestration Framework
=====================================================================================

Setup & Execution Instructions:
1. Create and activate a Python 3.10+ virtual environment:
   python3 -m venv .venv && source .venv/bin/activate
2. Install required dependencies and CLI engines:
   pip install -r requirements.txt
3. Export your Telegram MTProto API credentials (from https://my.telegram.org):
   export TG_API_ID="12345678"
   export TG_API_HASH="0123456789abcdef0123456789abcdef"
   export TG_SESSION_NAME="telerecon_operator"
   export GITHUB_TOKEN=""  # Optional: raises GitHub API rate limit from 60 to 5000 req/hr
4. Run against any single Telegram @username:
   python3 telerecon_ultimate.py @username --max-groups 15 --msg-limit 400
"""

from __future__ import annotations

import argparse
import asyncio
import datetime as dt
import hashlib
import html
import json
import logging
import os
import re
import shutil
import sys
from collections import Counter
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import quote_plus

import aiohttp
import httpx
from PIL import Image, ExifTags
import imagehash
from telethon import TelegramClient, errors, functions, types
from telethon.tl.functions.messages import GetCommonChatsRequest
from telethon.tl.functions.photos import GetUserPhotosRequest
from telethon.tl.functions.users import GetFullUserRequest

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("TeleRecon")


# ---------------------------------------------------------------------------
# Constants: Telegram Data Centers & Numeric ID Creation Milestones
# ---------------------------------------------------------------------------
DC_GEOGRAPHY: Dict[int, Dict[str, str]] = {
    1: {
        "dc_id": "DC1",
        "location": "Miami, Florida, US",
        "region": "Americas (US-East)",
        "ip_v4": "149.154.175.50",
        "asn": "AS62041 (Telegram Messenger Inc)",
    },
    2: {
        "dc_id": "DC2",
        "location": "Amsterdam, Netherlands",
        "region": "Europe / Middle East / CIS",
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
        "region": "Europe High-Density Cluster",
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

# Empirically anchored Telegram Numeric User ID -> UTC Unix Epoch milestones
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
]

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
URL_REGEX = re.compile(r"https?://[^\s<>\"']+|www\.[^\s<>\"']+")
HANDLE_REGEX = re.compile(r"(?<![a-zA-Z0-9._%+\-])@([a-zA-Z0-9_]{4,32})")


# ---------------------------------------------------------------------------
# Structured Intelligence Dataclasses
# ---------------------------------------------------------------------------
@dataclass
class EntityFingerprint:
    username: str
    numeric_id: int
    access_hash: str
    first_name: str
    last_name: str
    bio: str
    phone: Optional[str]
    status_summary: str
    last_seen_utc: Optional[str]
    dc_id: Optional[int]
    dc_region: str
    dc_location: str
    dc_ipv4: str
    estimated_creation_date: str
    creation_confidence: str
    flags: Dict[str, bool]
    bio_extracted_urls: List[str] = field(default_factory=list)
    bio_extracted_emails: List[str] = field(default_factory=list)
    bio_extracted_handles: List[str] = field(default_factory=list)


@dataclass
class AvatarForensicRecord:
    index: int
    photo_id: str
    file_path: str
    media_type: str
    uploaded_utc: str
    dc_id: Optional[int]
    dimensions: str
    file_size_bytes: int
    md5: str
    sha256: str
    phash: str
    exif_summary: Dict[str, str]
    reverse_search_urls: Dict[str, str]


@dataclass
class BotHistoryResult:
    bot_handle: str
    responded: bool
    raw_reply: str
    historical_usernames: List[Dict[str, str]]
    historical_names: List[Dict[str, str]]
    error: Optional[str] = None


@dataclass
class SocialGraphSummary:
    common_chats_count: int
    common_chats: List[Dict[str, Any]]
    sampled_messages_count: int
    hourly_histogram_utc: List[int]
    estimated_timezone: str
    estimated_sleep_window_utc: str
    peak_activity_hour_utc: int
    top_interacted_accounts: List[Dict[str, Any]]


@dataclass
class CrossPlatformHit:
    username: str
    platform: str
    url: str
    source_tool: str
    category: str
    status: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class GithubCommitLeak:
    username: str
    repo_name: str
    commit_sha: str
    author_name: str
    author_email: str
    commit_message: str
    timestamp_utc: str


@dataclass
class HoleheEmailResult:
    email: str
    origin: str
    registered_services: List[str]
    total_checked: int
    execution_status: str


@dataclass
class DorkQueryItem:
    category: str
    engine: str
    title: str
    query: str
    url: str


# ---------------------------------------------------------------------------
# Pure Analytical Helpers
# ---------------------------------------------------------------------------
def interpolate_account_creation(user_id: int) -> Tuple[str, str]:
    """
    Piecewise linear interpolation over known Telegram Numeric ID milestones
    (2013-present) to estimate UTC account creation date.
    """
    if user_id <= ID_MILESTONES[0][0]:
        dt_obj = dt.datetime.fromtimestamp(ID_MILESTONES[0][1], tz=dt.timezone.utc)
        return dt_obj.strftime("%Y-%m-%d"), "Pre-August 2013 Early Adopter (±14 days)"

    if user_id >= ID_MILESTONES[-1][0]:
        last_id, last_ts = ID_MILESTONES[-1]
        prev_id, prev_ts = ID_MILESTONES[-2]
        slope = (last_ts - prev_ts) / float(last_id - prev_id)
        est_ts = int(last_ts + (user_id - last_id) * slope)
        now_ts = int(dt.datetime.now(dt.timezone.utc).timestamp())
        est_ts = min(est_ts, now_ts)
        dt_obj = dt.datetime.fromtimestamp(est_ts, tz=dt.timezone.utc)
        return dt_obj.strftime("%Y-%m-%d"), "Extrapolated High-ID Range (±45 days)"

    for idx in range(len(ID_MILESTONES) - 1):
        low_id, low_ts = ID_MILESTONES[idx]
        high_id, high_ts = ID_MILESTONES[idx + 1]
        if low_id <= user_id <= high_id:
            ratio = (user_id - low_id) / float(high_id - low_id)
            interp_ts = int(low_ts + ratio * (high_ts - low_ts))
            dt_obj = dt.datetime.fromtimestamp(interp_ts, tz=dt.timezone.utc)
            return dt_obj.strftime("%Y-%m-%d"), "Milestone Interpolated (±21 days)"

    return "Unknown", "Insufficient Data"


def extract_bio_entities(bio_text: str) -> Tuple[List[str], List[str], List[str]]:
    """Extracts URLs, emails, and @handles from a Telegram Bio string."""
    if not bio_text:
        return [], [], []
    emails = sorted(set(EMAIL_REGEX.findall(bio_text)))
    urls = sorted(set(URL_REGEX.findall(bio_text)))
    handles = sorted(set(f"@{m}" for m in HANDLE_REGEX.findall(bio_text)))
    return urls, emails, handles


def estimate_timezone_from_hourly_utc(hourly_counts: List[int]) -> Tuple[str, str, int]:
    """
    Infers local UTC offset and sleep/wake cycle from a 24-bin UTC message histogram.
    Assumes the quietest contiguous 6-hour window corresponds to 01:00–07:00 local time.
    """
    if len(hourly_counts) != 24 or sum(hourly_counts) == 0:
        return "UTC+00:00 (Insufficient message volume)", "01:00 - 07:00 UTC", 12

    min_window_sum = float("inf")
    sleep_start_utc = 0
    for start_hr in range(24):
        window_sum = sum(hourly_counts[(start_hr + offset) % 24] for offset in range(6))
        if window_sum < min_window_sum:
            min_window_sum = window_sum
            sleep_start_utc = start_hr

    # Local 04:00 AM is the midpoint of a 01:00-07:00 sleep trough
    sleep_midpoint_utc = (sleep_start_utc + 3) % 24
    raw_offset = (4 - sleep_midpoint_utc)
    if raw_offset < -11:
        raw_offset += 24
    elif raw_offset > 14:
        raw_offset -= 24

    sign = "+" if raw_offset >= 0 else "-"
    tz_label = f"UTC{sign}{abs(raw_offset):02d}:00"
    sleep_end_utc = (sleep_start_utc + 6) % 24
    sleep_window = f"{sleep_start_utc:02d}:00 - {sleep_end_utc:02d}:00 UTC"
    peak_hour_utc = int(max(range(24), key=lambda h: hourly_counts[h]))
    return tz_label, sleep_window, peak_hour_utc


# ---------------------------------------------------------------------------
# Principal Orchestrator Class
# ---------------------------------------------------------------------------
class TeleReconUltimate:
    def __init__(
        self,
        target_username: str,
        api_id: int,
        api_hash: str,
        session_name: str = "telerecon_session",
        output_root: Path = Path("./reports"),
        max_groups: int = 12,
        msg_limit: int = 300,
        github_token: Optional[str] = None,
    ) -> None:
        self.clean_username = target_username.lstrip("@").strip()
        self.api_id = api_id
        self.api_hash = api_hash
        self.session_name = session_name
        self.report_dir = output_root / self.clean_username
        self.avatars_dir = self.report_dir / "avatars"
        self.max_groups = max_groups
        self.msg_limit = msg_limit
        self.github_token = github_token or os.environ.get("GITHUB_TOKEN", "")

        self.report_dir.mkdir(parents=True, exist_ok=True)
        self.avatars_dir.mkdir(parents=True, exist_ok=True)

        self.entity_info: Optional[EntityFingerprint] = None
        self.avatars: List[AvatarForensicRecord] = []
        self.bot_history: List[BotHistoryResult] = []
        self.social_graph: Optional[SocialGraphSummary] = None
        self.cross_platform_hits: List[CrossPlatformHit] = []
        self.github_leaks: List[GithubCommitLeak] = []
        self.holehe_results: List[HoleheEmailResult] = []
        self.dork_queries: List[DorkQueryItem] = []

    # -----------------------------------------------------------------------
    # STAGE 1: Deep MTProto Entity & Server Fingerprinting
    # -----------------------------------------------------------------------
    async def stage_1_entity_fingerprint(self, client: TelegramClient) -> types.User:
        logger.info("[Stage 1/7] Executing GetFullUserRequest on @%s", self.clean_username)
        full_resp = await client(GetFullUserRequest(self.clean_username))
        user: types.User = full_resp.users[0]
        full_user: types.UserFull = full_resp.full_user

        bio_text = getattr(full_user, "about", "") or ""
        urls, emails, handles = extract_bio_entities(bio_text)

        # Status & Last Seen parsing
        status_str = "Hidden / Approximate"
        last_seen_iso: Optional[str] = None
        if isinstance(user.status, types.UserStatusOnline):
            status_str = "Online"
            last_seen_iso = dt.datetime.now(dt.timezone.utc).isoformat()
        elif isinstance(user.status, types.UserStatusOffline):
            status_str = "Offline (Exact Timestamp)"
            if user.status.was_online:
                last_seen_iso = user.status.was_online.astimezone(dt.timezone.utc).isoformat()
        elif isinstance(user.status, types.UserStatusRecently):
            status_str = "Last seen recently (1 sec - 3 days)"
        elif isinstance(user.status, types.UserStatusLastWeek):
            status_str = "Last seen within a week (3 - 7 days)"
        elif isinstance(user.status, types.UserStatusLastMonth):
            status_str = "Last seen within a month (7 - 30 days)"

        # Data Center ID from profile photo object
        dc_id: Optional[int] = None
        if isinstance(user.photo, types.UserProfilePhoto):
            dc_id = getattr(user.photo, "dc_id", None)

        dc_meta = DC_GEOGRAPHY.get(
            dc_id or 0,
            {
                "dc_id": f"DC{dc_id}" if dc_id else "Unassigned",
                "location": "Unknown (No Public Profile Photo)",
                "region": "Undetermined",
                "ip_v4": "N/A",
            },
        )

        est_date, confidence = interpolate_account_creation(user.id)

        self.entity_info = EntityFingerprint(
            username=user.username or self.clean_username,
            numeric_id=user.id,
            access_hash=hex(user.access_hash or 0),
            first_name=user.first_name or "",
            last_name=user.last_name or "",
            bio=bio_text,
            phone=f"+{user.phone}" if getattr(user, "phone", None) else None,
            status_summary=status_str,
            last_seen_utc=last_seen_iso,
            dc_id=dc_id,
            dc_region=dc_meta["region"],
            dc_location=dc_meta["location"],
            dc_ipv4=dc_meta["ip_v4"],
            estimated_creation_date=est_date,
            creation_confidence=confidence,
            flags={
                "premium": bool(getattr(user, "premium", False)),
                "verified": bool(getattr(user, "verified", False)),
                "bot": bool(getattr(user, "bot", False)),
                "scam": bool(getattr(user, "scam", False)),
                "fake": bool(getattr(user, "fake", False)),
                "restricted": bool(getattr(user, "restricted", False)),
            },
            bio_extracted_urls=urls,
            bio_extracted_emails=emails,
            bio_extracted_handles=handles,
        )
        logger.info(
            "[Stage 1/7] Resolved ID=%d | DC=%s (%s) | Est. Created=%s",
            user.id,
            dc_id,
            dc_meta["location"],
            est_date,
        )
        return user

    # -----------------------------------------------------------------------
    # STAGE 2: Avatar Timeline & Image Forensics
    # -----------------------------------------------------------------------
    async def stage_2_avatar_forensics(self, client: TelegramClient, user: types.User) -> None:
        logger.info("[Stage 2/7] Fetching historical profile photos via GetUserPhotosRequest")
        try:
            photos_resp = await client(
                GetUserPhotosRequest(user_id=user, offset=0, max_id=0, limit=100)
            )
            photos = getattr(photos_resp, "photos", [])
            logger.info("[Stage 2/7] Discovered %d profile photos/videos", len(photos))

            for idx, photo in enumerate(photos):
                if not isinstance(photo, types.Photo):
                    continue
                is_video = bool(getattr(photo, "video_sizes", None))
                ext = "mp4" if is_video else "jpg"
                upload_dt = photo.date.astimezone(dt.timezone.utc)
                ts_slug = upload_dt.strftime("%Y%m%d_%H%M%S")
                out_path = self.avatars_dir / f"avatar_{idx:02d}_{photo.id}_{ts_slug}.{ext}"

                downloaded = await client.download_media(photo, file=str(out_path))
                if not downloaded or not Path(downloaded).exists():
                    continue

                file_bytes = Path(downloaded).read_bytes()
                md5_hex = hashlib.md5(file_bytes).hexdigest()
                sha256_hex = hashlib.sha256(file_bytes).hexdigest()

                phash_hex = "N/A (Video Stream)"
                dimensions = "Video Profile"
                exif_data: Dict[str, str] = {}

                if not is_video:
                    try:
                        img_path = Path(downloaded)
                        with Image.open(img_path) as im:
                            dimensions = f"{im.width}x{im.height}"
                            phash_hex = str(imagehash.phash(im))
                            raw_exif = im.getexif()
                            if raw_exif:
                                for tag_id, val in raw_exif.items():
                                    tag_name = str(ExifTags.TAGS.get(tag_id, tag_id))
                                    exif_data[tag_name] = str(val)[:120]
                    except Exception as img_err:
                        logger.warning("PIL analysis warning on %s: %s", downloaded, img_err)

                # Generate 1-Click Reverse Image Search & Hash Pivot URLs
                reverse_urls = {
                    "yandex": f"https://yandex.com/images/search?rpt=imageview&text={phash_hex}",
                    "google_lens": f"https://lens.google.com/uploadbyurl?url=https://t.me/i/userpic/320/{self.clean_username}.jpg",
                    "tineye": f"https://tineye.com/search?url=https://t.me/i/userpic/320/{self.clean_username}.jpg",
                }

                self.avatars.append(
                    AvatarForensicRecord(
                        index=idx,
                        photo_id=str(photo.id),
                        file_path=f"avatars/{Path(downloaded).name}",
                        media_type="video/mp4" if is_video else "image/jpeg",
                        uploaded_utc=upload_dt.strftime("%Y-%m-%d %H:%M:%S UTC"),
                        dc_id=getattr(photo, "dc_id", None),
                        dimensions=dimensions,
                        file_size_bytes=len(file_bytes),
                        md5=md5_hex,
                        sha256=sha256_hex,
                        phash=phash_hex,
                        exif_summary=exif_data,
                        reverse_search_urls=reverse_urls,
                    )
                )
        except errors.FloodWaitError as fw:
            logger.warning("[Stage 2/7] FloodWaitError (%ds) during avatar retrieval", fw.seconds)
        except Exception as exc:
            logger.error("[Stage 2/7] Avatar extraction error: %s", exc)

    # -----------------------------------------------------------------------
    # STAGE 3: Automated OSINT Bot Interrogation
    # -----------------------------------------------------------------------
    async def stage_3_bot_interrogation(self, client: TelegramClient, numeric_id: int) -> None:
        logger.info("[Stage 3/7] Interrogating OSINT tracking bots for ID %d", numeric_id)
        tracking_bots = ["@SangMata_beta_bot", "@SangMata_BOT", "@usinfobot"]

        for bot_handle in tracking_bots:
            try:
                async with client.conversation(bot_handle, timeout=18) as conv:
                    await conv.send_message(str(numeric_id))
                    reply = await conv.get_response()
                    raw_text = reply.raw_text or ""

                    # Wait briefly in case bot sends a second follow-up message
                    try:
                        second_reply = await conv.get_response(timeout=4)
                        if second_reply and second_reply.raw_text:
                            raw_text += "\n" + second_reply.raw_text
                    except asyncio.TimeoutError:
                        pass

                    usernames, names = self._parse_bot_history_text(raw_text, bot_handle)
                    self.bot_history.append(
                        BotHistoryResult(
                            bot_handle=bot_handle,
                            responded=True,
                            raw_reply=raw_text[:2000],
                            historical_usernames=usernames,
                            historical_names=names,
                        )
                    )
                    logger.info(
                        "[Stage 3/7] %s returned %d historical usernames and %d names",
                        bot_handle,
                        len(usernames),
                        len(names),
                    )
            except asyncio.TimeoutError:
                logger.warning("[Stage 3/7] Bot %s timed out after 18s", bot_handle)
                self.bot_history.append(
                    BotHistoryResult(
                        bot_handle=bot_handle,
                        responded=False,
                        raw_reply="",
                        historical_usernames=[],
                        historical_names=[],
                        error="Conversation timeout (18s)",
                    )
                )
            except errors.FloodWaitError as fw:
                logger.warning("[Stage 3/7] FloodWait (%ds) on %s", fw.seconds, bot_handle)
                if fw.seconds <= 30:
                    await asyncio.sleep(fw.seconds)
                self.bot_history.append(
                    BotHistoryResult(
                        bot_handle=bot_handle,
                        responded=False,
                        raw_reply="",
                        historical_usernames=[],
                        historical_names=[],
                        error=f"FloodWaitError ({fw.seconds}s)",
                    )
                )
            except Exception as exc:
                logger.warning("[Stage 3/7] Could not query %s: %s", bot_handle, exc)
                self.bot_history.append(
                    BotHistoryResult(
                        bot_handle=bot_handle,
                        responded=False,
                        raw_reply="",
                        historical_usernames=[],
                        historical_names=[],
                        error=str(exc),
                    )
                )

    @staticmethod
    def _parse_bot_history_text(
        raw_text: str, source_bot: str
    ) -> Tuple[List[Dict[str, str]], List[Dict[str, str]]]:
        """Regex parser extracting timestamped usernames and display names from SangMata/usinfobot."""
        usernames: List[Dict[str, str]] = []
        names: List[Dict[str, str]] = []
        seen_unames: Set[str] = set()
        seen_names: Set[str] = set()

        date_pattern = re.compile(
            r"(\d{1,2}[./\-]\d{1,2}[./\-]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)"
        )
        section = "general"

        for line in raw_text.splitlines():
            clean_line = line.strip()
            if not clean_line:
                continue
            low = clean_line.lower()
            if "username" in low:
                section = "usernames"
            elif "name" in low and "username" not in low:
                section = "names"

            date_match = date_pattern.search(clean_line)
            observed_date = date_match.group(1) if date_match else "Historical Record"

            for handle_match in HANDLE_REGEX.findall(clean_line):
                candidate = handle_match.strip().lstrip("@")
                if candidate.lower() not in {"sangmata_bot", "sangmata_beta_bot", "usinfobot"}:
                    if candidate.lower() not in seen_unames:
                        seen_unames.add(candidate.lower())
                        usernames.append(
                            {
                                "username": candidate,
                                "observed_at": observed_date,
                                "source": source_bot,
                            }
                        )

            if section == "names" and date_match:
                after_date = clean_line[date_match.end() :].strip(" :->\t[]()")
                if after_date and not after_date.startswith("@") and after_date not in seen_names:
                    seen_names.add(after_date)
                    names.append(
                        {
                            "display_name": after_date,
                            "observed_at": observed_date,
                            "source": source_bot,
                        }
                    )

        return usernames, names

    # -----------------------------------------------------------------------
    # STAGE 4: Common Groups, Social Graph & Timezone Estimation
    # -----------------------------------------------------------------------
    async def stage_4_social_graph_and_timezone(
        self, client: TelegramClient, user: types.User
    ) -> None:
        logger.info("[Stage 4/7] Querying shared groups and sampling temporal activity")
        hourly_bins = [0] * 24
        reply_counter: Counter[int] = Counter()
        peer_names: Dict[int, str] = {}
        common_chats_list: List[Dict[str, Any]] = []
        total_sampled = 0

        try:
            common_resp = await client(GetCommonChatsRequest(user_id=user, max_id=0, limit=100))
            chats = getattr(common_resp, "chats", [])

            for chat in chats[: self.max_groups]:
                chat_title = getattr(chat, "title", "Private Group")
                chat_username = getattr(chat, "username", None)
                participants_count = getattr(chat, "participants_count", None)
                common_chats_list.append(
                    {
                        "id": chat.id,
                        "title": chat_title,
                        "username": f"@{chat_username}" if chat_username else "Private/Invite",
                        "participants_count": participants_count,
                    }
                )

                try:
                    async for msg in client.iter_messages(
                        chat, from_user=user, limit=self.msg_limit
                    ):
                        if msg.date:
                            utc_hr = msg.date.astimezone(dt.timezone.utc).hour
                            hourly_bins[utc_hr] += 1
                            total_sampled += 1

                        if msg.reply_to and getattr(msg.reply_to, "reply_to_msg_id", None):
                            try:
                                parent = await msg.get_reply_message()
                                if parent and parent.sender_id and parent.sender_id != user.id:
                                    reply_counter[parent.sender_id] += 1
                                    if parent.sender_id not in peer_names and parent.sender:
                                        sender_uname = getattr(parent.sender, "username", None)
                                        sender_fn = getattr(parent.sender, "first_name", "")
                                        peer_names[parent.sender_id] = (
                                            f"@{sender_uname}"
                                            if sender_uname
                                            else (sender_fn or f"ID:{parent.sender_id}")
                                        )
                            except Exception:
                                continue
                except errors.FloodWaitError as fw:
                    logger.warning("[Stage 4/7] FloodWait (%ds) on group %s", fw.seconds, chat_title)
                    break
                except Exception as chat_err:
                    logger.debug("Skipping message sampling in %s: %s", chat_title, chat_err)

        except Exception as exc:
            logger.error("[Stage 4/7] GetCommonChatsRequest failed: %s", exc)

        tz_est, sleep_win, peak_hr = estimate_timezone_from_hourly_utc(hourly_bins)
        top_peers = [
            {
                "peer_id": pid,
                "handle": peer_names.get(pid, f"ID:{pid}"),
                "interactions": count,
            }
            for pid, count in reply_counter.most_common(10)
        ]

        self.social_graph = SocialGraphSummary(
            common_chats_count=len(common_chats_list),
            common_chats=common_chats_list,
            sampled_messages_count=total_sampled,
            hourly_histogram_utc=hourly_bins,
            estimated_timezone=tz_est,
            estimated_sleep_window_utc=sleep_win,
            peak_activity_hour_utc=peak_hr,
            top_interacted_accounts=top_peers,
        )

    # -----------------------------------------------------------------------
    # STAGE 5: Multi-Username Pivot (Maigret + Sherlock + GitHub Leaks)
    # -----------------------------------------------------------------------
    def get_all_candidate_usernames(self) -> List[str]:
        candidates: Set[str] = {self.clean_username}
        if self.entity_info and self.entity_info.username:
            candidates.add(self.entity_info.username.lstrip("@"))
        for bot_res in self.bot_history:
            for item in bot_res.historical_usernames:
                uname = item.get("username", "").lstrip("@").strip()
                if uname:
                    candidates.add(uname)
        return sorted(candidates)

    async def stage_5_multi_username_pivot(self) -> None:
        usernames = self.get_all_candidate_usernames()
        logger.info("[Stage 5/7] Pivoting across %d usernames: %s", len(usernames), usernames)

        for uname in usernames:
            await self._run_maigret(uname)
            await self._run_sherlock(uname)
            await self._query_github_events_leaks(uname)

    async def _run_maigret(self, username: str) -> None:
        if not shutil.which("maigret"):
            logger.warning("[Stage 5/7] 'maigret' binary not found in PATH; skipping CLI run")
            return

        out_dir = self.report_dir / "maigret_raw"
        out_dir.mkdir(exist_ok=True)
        cmd = [
            "maigret",
            username,
            "--json",
            "simple",
            "--folderoutput",
            str(out_dir),
            "--timeout",
            "10",
            "--no-color",
        ]
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await asyncio.wait_for(proc.communicate(), timeout=95)
        except Exception as exc:
            logger.warning("[Stage 5/7] Maigret execution warning for %s: %s", username, exc)

        for json_file in out_dir.glob(f"*{username}*.json"):
            try:
                data = json.loads(json_file.read_text(encoding="utf-8"))
                for site_name, site_info in data.items():
                    status_obj = site_info.get("status", {})
                    state = (
                        status_obj.get("status")
                        if isinstance(status_obj, dict)
                        else site_info.get("status")
                    )
                    if str(state).lower() in {"claimed", "found"}:
                        tags = status_obj.get("tags", []) if isinstance(status_obj, dict) else []
                        self.cross_platform_hits.append(
                            CrossPlatformHit(
                                username=username,
                                platform=site_name,
                                url=site_info.get("url_user", ""),
                                source_tool="Maigret",
                                category=tags[0] if tags else "Social / Web",
                                status="Claimed",
                                metadata=status_obj.get("ids_data", {})
                                if isinstance(status_obj, dict)
                                else {},
                            )
                        )
            except Exception as parse_err:
                logger.debug("Maigret JSON parse warning: %s", parse_err)

    async def _run_sherlock(self, username: str) -> None:
        if not shutil.which("sherlock"):
            logger.warning("[Stage 5/7] 'sherlock' binary not found in PATH; skipping CLI run")
            return

        json_out = self.report_dir / f"sherlock_{username}.json"
        cmd = [
            "sherlock",
            username,
            "--timeout",
            "8",
            "--json",
            str(json_out),
            "--nsfw",
        ]
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await asyncio.wait_for(proc.communicate(), timeout=80)
            if json_out.exists():
                raw = json.loads(json_out.read_text(encoding="utf-8"))
                existing_urls = {h.url for h in self.cross_platform_hits}
                for platform, details in raw.items():
                    if isinstance(details, dict) and details.get("url_user"):
                        u_url = details["url_user"]
                        if u_url not in existing_urls:
                            self.cross_platform_hits.append(
                                CrossPlatformHit(
                                    username=username,
                                    platform=platform,
                                    url=u_url,
                                    source_tool="Sherlock",
                                    category="OSINT Enumeration",
                                    status="Claimed",
                                )
                            )
        except Exception as exc:
            logger.warning("[Stage 5/7] Sherlock execution warning for %s: %s", username, exc)

    async def _query_github_events_leaks(self, username: str) -> None:
        headers = {"Accept": "application/vnd.github+json", "User-Agent": "TeleRecon-OSINT/2.0"}
        if self.github_token:
            headers["Authorization"] = f"Bearer {self.github_token}"

        user_url = f"https://api.github.com/users/{username}"
        events_url = f"https://api.github.com/users/{username}/events/public?per_page=100"

        try:
            async with httpx.AsyncClient(timeout=15.0, headers=headers) as http_client:
                u_resp = await http_client.get(user_url)
                if u_resp.status_code != 200:
                    return

                u_data = u_resp.json()
                gh_html_url = u_data.get("html_url", f"https://github.com/{username}")
                if not any(h.url == gh_html_url for h in self.cross_platform_hits):
                    self.cross_platform_hits.append(
                        CrossPlatformHit(
                            username=username,
                            platform="GitHub",
                            url=gh_html_url,
                            source_tool="GitHub REST API",
                            category="Developer / Code",
                            status="Verified",
                            metadata={
                                "public_repos": u_data.get("public_repos"),
                                "followers": u_data.get("followers"),
                                "location": u_data.get("location"),
                            },
                        )
                    )

                ev_resp = await http_client.get(events_url)
                if ev_resp.status_code != 200:
                    return

                seen_commits: Set[str] = set()
                for event in ev_resp.json():
                    if event.get("type") != "PushEvent":
                        continue
                    repo_name = event.get("repo", {}).get("name", "unknown/repo")
                    created_at = event.get("created_at", "")
                    commits = event.get("payload", {}).get("commits", [])
                    for commit in commits:
                        author = commit.get("author", {})
                        email = (author.get("email") or "").strip().lower()
                        sha = (commit.get("sha") or "")[:8]
                        if (
                            email
                            and "noreply.github.com" not in email
                            and f"{sha}:{email}" not in seen_commits
                        ):
                            seen_commits.add(f"{sha}:{email}")
                            self.github_leaks.append(
                                GithubCommitLeak(
                                    username=username,
                                    repo_name=repo_name,
                                    commit_sha=sha,
                                    author_name=author.get("name", ""),
                                    author_email=email,
                                    commit_message=(commit.get("message") or "").splitlines()[0][
                                        :100
                                    ],
                                    timestamp_utc=created_at,
                                )
                            )
        except Exception as exc:
            logger.warning("[Stage 5/7] GitHub commit pivot warning for %s: %s", username, exc)

    # -----------------------------------------------------------------------
    # STAGE 6: Email Enumeration Pivot (Holehe)
    # -----------------------------------------------------------------------
    def build_candidate_emails(self) -> List[Tuple[str, str]]:
        """Combines leaked/bio emails with deterministic username@domain permutations."""
        email_map: Dict[str, str] = {}

        if self.entity_info:
            for bio_email in self.entity_info.bio_extracted_emails:
                email_map[bio_email.lower()] = "Telegram Bio Extraction"

        for leak in self.github_leaks:
            email_map[leak.author_email.lower()] = f"GitHub Commit ({leak.repo_name})"

        for uname in self.get_all_candidate_usernames():
            clean_u = re.sub(r"[^a-zA-Z0-9._\-]", "", uname).lower()
            if len(clean_u) >= 3:
                for domain in ("gmail.com", "proton.me"):
                    cand = f"{clean_u}@{domain}"
                    if cand not in email_map:
                        email_map[cand] = f"Username Permutation (@{uname})"

        return sorted(email_map.items(), key=lambda x: x[0])

    async def stage_6_holehe_email_pivot(self) -> None:
        candidates = self.build_candidate_emails()
        logger.info("[Stage 6/7] Running Holehe enumeration on %d candidate emails", len(candidates))

        holehe_bin = shutil.which("holehe")
        ansi_escape = re.compile(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")

        for email, origin in candidates:
            if not holehe_bin:
                self.holehe_results.append(
                    HoleheEmailResult(
                        email=email,
                        origin=origin,
                        registered_services=[],
                        total_checked=0,
                        execution_status="Skipped (holehe CLI not in PATH)",
                    )
                )
                continue

            try:
                proc = await asyncio.create_subprocess_exec(
                    holehe_bin,
                    email,
                    "--only-used",
                    "--no-color",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout_b, _ = await asyncio.wait_for(proc.communicate(), timeout=65)
                clean_out = ansi_escape.sub("", stdout_b.decode("utf-8", errors="replace"))

                services: List[str] = []
                for line in clean_out.splitlines():
                    stripped = line.strip()
                    if stripped.startswith("[+]") and "Email used" not in stripped:
                        svc = stripped.replace("[+]", "").strip().split()[0]
                        if svc and svc not in services:
                            services.append(svc)

                self.holehe_results.append(
                    HoleheEmailResult(
                        email=email,
                        origin=origin,
                        registered_services=sorted(services),
                        total_checked=121,
                        execution_status="Completed",
                    )
                )
            except Exception as exc:
                logger.warning("[Stage 6/7] Holehe error for %s: %s", email, exc)
                self.holehe_results.append(
                    HoleheEmailResult(
                        email=email,
                        origin=origin,
                        registered_services=[],
                        total_checked=0,
                        execution_status=f"Error ({exc})",
                    )
                )

    # -----------------------------------------------------------------------
    # STAGE 7: Deep Telegram Search Indexes & Google Dorks
    # -----------------------------------------------------------------------
    def stage_7_generate_dorks(self) -> None:
        logger.info("[Stage 7/7] Generating Telegram Search Indexes and OSINT Dorks")
        usernames = self.get_all_candidate_usernames()

        for uname in usernames:
            q_uname = quote_plus(uname)
            # 1. Public Telegram Search Engines
            self.dork_queries.extend(
                [
                    DorkQueryItem(
                        category="Telegram Search Index",
                        engine="Lyzem",
                        title=f"Lyzem Indexed Messages & Channels (@{uname})",
                        query=uname,
                        url=f"https://lyzem.com/search?q={q_uname}",
                    ),
                    DorkQueryItem(
                        category="Telegram Search Index",
                        engine="TGStat",
                        title=f"TGStat Channel & Mention Analytics (@{uname})",
                        query=f"@{uname}",
                        url=f"https://tgstat.com/search?q={quote_plus('@' + uname)}",
                    ),
                    DorkQueryItem(
                        category="Telegram Search Index",
                        engine="Telemetr",
                        title=f"Telemetr Catalog & Cross-Channel Mentions (@{uname})",
                        query=uname,
                        url=f"https://telemetr.io/en/channels?channel={q_uname}",
                    ),
                    DorkQueryItem(
                        category="Telegram Search Index",
                        engine="Telegago (Google CSE)",
                        title=f"Telegago Deep Public Telegram CSE (@{uname})",
                        query=uname,
                        url=f"https://cse.google.com/cse?cx=006368593537057042503:efxu7xprihg&q={q_uname}",
                    ),
                ]
            )

            # 2. Categorized Google Dorks
            dork_specs = [
                (
                    "Direct Telegram Surface",
                    f"Direct t.me Links & Post Previews (@{uname})",
                    f'site:t.me "{uname}"',
                ),
                (
                    "External Web Mentions",
                    f"Third-Party Web Pages Linking to t.me/{uname}",
                    f'intext:"t.me/{uname}" -site:t.me',
                ),
                (
                    "Code & Paste Leaks",
                    f"GitHub / GitLab / Pastebin Mentions (@{uname})",
                    f'(site:github.com OR site:gitlab.com OR site:pastebin.com) "{uname}"',
                ),
                (
                    "Document & Archive Leaks",
                    f"Public PDF / XLSX / JSON Config Exposures (@{uname})",
                    f'"{uname}" (filetype:pdf OR filetype:xlsx OR filetype:json OR filetype:log)',
                ),
            ]
            for cat, title, raw_query in dork_specs:
                self.dork_queries.append(
                    DorkQueryItem(
                        category=cat,
                        engine="Google Dork",
                        title=title,
                        query=raw_query,
                        url=f"https://www.google.com/search?q={quote_plus(raw_query)}",
                    )
                )

    # -----------------------------------------------------------------------
    # REPORTING ENGINE: JSON + Standalone Interactive HTML Dashboard
    # -----------------------------------------------------------------------
    def export_reports(self) -> Tuple[Path, Path]:
        payload = {
            "generated_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
            "target_input": f"@{self.clean_username}",
            "entity_fingerprint": asdict(self.entity_info) if self.entity_info else None,
            "avatar_timeline": [asdict(a) for a in self.avatars],
            "bot_interrogation": [asdict(b) for b in self.bot_history],
            "social_graph_and_timezone": asdict(self.social_graph) if self.social_graph else None,
            "cross_platform_profiles": [asdict(c) for c in self.cross_platform_hits],
            "github_commit_leaks": [asdict(g) for g in self.github_leaks],
            "holehe_email_pivots": [asdict(h) for h in self.holehe_results],
            "osint_dork_launchpad": [asdict(d) for d in self.dork_queries],
        }

        json_path = self.report_dir / "intelligence.json"
        json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

        html_path = self.report_dir / "index.html"
        html_path.write_text(self._build_standalone_html(payload), encoding="utf-8")

        logger.info("Saved structured JSON report -> %s", json_path)
        logger.info("Saved interactive HTML dashboard -> %s", html_path)
        return json_path, html_path

    def _build_standalone_html(self, data: Dict[str, Any]) -> str:
        ent = data.get("entity_fingerprint") or {}
        sg = data.get("social_graph_and_timezone") or {}
        hourly = sg.get("hourly_histogram_utc") or [0] * 24
        max_hr = max(hourly) if any(hourly) else 1

        heatmap_bars = "".join(
            f'<div class="bar-col"><div class="bar-fill" style="height:{int((val / max_hr) * 100)}%" '
            f'title="{hr:02d}:00 UTC: {val} msgs"></div><span class="bar-lbl">{hr:02d}</span></div>'
            for hr, val in enumerate(hourly)
        )

        avatars_html = "".join(
            f'<div class="card">'
            f'<img src="{html.escape(av["file_path"])}" alt="Avatar {av["index"]}" class="avatar-img"/>'
            f'<div class="meta-line">{html.escape(av["uploaded_utc"])} · DC{av.get("dc_id") or "?"} · {html.escape(av["dimensions"])}</div>'
            f'<div class="mono-hash">pHash: {html.escape(av["phash"])}</div>'
            f'<div class="mono-hash">SHA256: {html.escape(av["sha256"][:24])}...</div>'
            f'<div class="btn-row">'
            f'<a href="{html.escape(av["reverse_search_urls"]["yandex"])}" target="_blank" rel="noopener">Yandex</a>'
            f'<a href="{html.escape(av["reverse_search_urls"]["google_lens"])}" target="_blank" rel="noopener">Google Lens</a>'
            f'<a href="{html.escape(av["reverse_search_urls"]["tineye"])}" target="_blank" rel="noopener">TinEye</a>'
            f"</div></div>"
            for av in data.get("avatar_timeline", [])
        ) or "<p class='muted'>No public avatars retrieved.</p>"

        profiles_rows = "".join(
            f"<tr><td>@{html.escape(p['username'])}</td>"
            f"<td>{html.escape(p['platform'])}</td>"
            f"<td>{html.escape(p['source_tool'])}</td>"
            f"<td><a href='{html.escape(p['url'])}' target='_blank' rel='noopener'>{html.escape(p['url'])}</a></td></tr>"
            for p in data.get("cross_platform_profiles", [])
        )

        dorks_html = "".join(
            f"<div class='dork-row'>"
            f"<div><strong>{html.escape(d['engine'])}</strong> · {html.escape(d['title'])}"
            f"<div class='mono-hash'>{html.escape(d['query'])}</div></div>"
            f"<a class='btn-link' href='{html.escape(d['url'])}' target='_blank' rel='noopener'>Launch Query</a>"
            f"</div>"
            for d in data.get("osint_dork_launchpad", [])
        )

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>TeleRecon OSINT Report — @{html.escape(self.clean_username)}</title>
<style>
  :root {{ --bg: #0b1120; --surface: #111827; --border: #1e293b; --text: #f1f5f9; --muted: #94a3b8; --accent: #38bdf8; }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; padding: 2rem; }}
  .container {{ max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; }}
  header {{ display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--border); padding-bottom: 1rem; }}
  h1 {{ font-size: 1.75rem; font-weight: 700; }}
  h2 {{ font-size: 1.15rem; font-weight: 600; margin-bottom: 1rem; color: var(--text); }}
  .panel {{ background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; }}
  .grid-2 {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.5rem; }}
  .grid-3 {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; }}
  .kv-row {{ display: flex; justify-content: space-between; padding: 0.45rem 0; border-bottom: 1px solid var(--border); font-size: 0.9rem; }}
  .mono-hash {{ font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.8rem; color: var(--muted); font-variant-numeric: tabular-nums; }}
  .heatmap {{ display: grid; grid-template-columns: repeat(24, 1fr); gap: 4px; height: 140px; align-items: end; padding-top: 1rem; }}
  .bar-col {{ display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }}
  .bar-fill {{ width: 100%; background: var(--accent); border-radius: 2px 2px 0 0; min-height: 2px; }}
  .bar-lbl {{ font-size: 0.7rem; color: var(--muted); margin-top: 4px; font-family: monospace; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 0.88rem; }}
  th, td {{ text-align: left; padding: 0.6rem; border-bottom: 1px solid var(--border); }}
  a {{ color: var(--accent); text-decoration: none; }}
  a:hover {{ text-decoration: underline; }}
  .avatar-img {{ width: 100%; height: 220px; object-fit: cover; border-radius: 6px; margin-bottom: 0.5rem; }}
  .btn-row {{ display: flex; gap: 0.75rem; margin-top: 0.5rem; font-size: 0.82rem; }}
  .dork-row {{ display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border); }}
  .btn-link {{ padding: 0.35rem 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.8rem; white-space: nowrap; }}
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>TeleRecon OSINT Intelligence Report — @{html.escape(self.clean_username)}</h1>
    <span class="mono-hash">Generated: {html.escape(data["generated_at_utc"])}</span>
  </header>
  <div class="grid-2">
    <section class="panel">
      <h2>01. Identity &amp; MTProto Server Fingerprint</h2>
      <div class="kv-row"><span>Permanent Numeric ID</span><span class="mono-hash">{ent.get("numeric_id", "N/A")}</span></div>
      <div class="kv-row"><span>Access Hash</span><span class="mono-hash">{html.escape(str(ent.get("access_hash", "N/A")))}</span></div>
      <div class="kv-row"><span>Display Name</span><span>{html.escape((ent.get("first_name", "") + " " + ent.get("last_name", "")).strip())}</span></div>
      <div class="kv-row"><span>Estimated Creation Date</span><span class="mono-hash">{html.escape(str(ent.get("estimated_creation_date", "N/A")))} ({html.escape(str(ent.get("creation_confidence", "")))})</span></div>
      <div class="kv-row"><span>Data Center Region</span><span>DC{ent.get("dc_id") or "?"} · {html.escape(str(ent.get("dc_location", "Unknown")))}</span></div>
      <div class="kv-row"><span>Last Seen Status</span><span>{html.escape(str(ent.get("status_summary", "Unknown")))}</span></div>
      <div class="kv-row"><span>Bio / About</span><span>{html.escape(str(ent.get("bio", "")))}</span></div>
    </section>
    <section class="panel">
      <h2>04. Activity Heatmap &amp; Timezone Estimation</h2>
      <div class="kv-row"><span>Estimated Local Timezone</span><span class="mono-hash">{html.escape(str(sg.get("estimated_timezone", "N/A")))}</span></div>
      <div class="kv-row"><span>Estimated Sleep Window</span><span class="mono-hash">{html.escape(str(sg.get("estimated_sleep_window_utc", "N/A")))}</span></div>
      <div class="kv-row"><span>Shared Groups / Sampled Msgs</span><span class="mono-hash">{sg.get("common_chats_count", 0)} groups / {sg.get("sampled_messages_count", 0)} msgs</span></div>
      <div class="heatmap">{heatmap_bars}</div>
    </section>
  </div>
  <section class="panel">
    <h2>02. Historical Avatar Timeline &amp; pHash Forensics</h2>
    <div class="grid-3">{avatars_html}</div>
  </section>
  <section class="panel">
    <h2>05. Cross-Platform Enumeration (Maigret / Sherlock / GitHub)</h2>
    <table>
      <thead><tr><th>Username</th><th>Platform</th><th>Source</th><th>Profile URL</th></tr></thead>
      <tbody>{profiles_rows}</tbody>
    </table>
  </section>
  <section class="panel">
    <h2>07. 1-Click OSINT Search &amp; Google Dork Launchpad</h2>
    {dorks_html}
  </section>
</div>
</body>
</html>"""

    # -----------------------------------------------------------------------
    # Master Execution Pipeline
    # -----------------------------------------------------------------------
    async def run_pipeline(self) -> Tuple[Path, Path]:
        async with TelegramClient(self.session_name, self.api_id, self.api_hash) as client:
            user = await self.stage_1_entity_fingerprint(client)
            await self.stage_2_avatar_forensics(client, user)
            await self.stage_3_bot_interrogation(client, user.id)
            await self.stage_4_social_graph_and_timezone(client, user)

        await self.stage_5_multi_username_pivot()
        await self.stage_6_holehe_email_pivot()
        self.stage_7_generate_dorks()
        return self.export_reports()


# ---------------------------------------------------------------------------
# CLI Entrypoint
# ---------------------------------------------------------------------------
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="TeleRecon Ultimate — 7-Stage Asynchronous Telegram OSINT Framework"
    )
    parser.add_argument("username", help="Target Telegram @username (e.g., @durov)")
    parser.add_argument(
        "--api-id",
        type=int,
        default=int(os.environ.get("TG_API_ID", "0")),
        help="Telegram MTProto API ID (or set TG_API_ID env var)",
    )
    parser.add_argument(
        "--api-hash",
        type=str,
        default=os.environ.get("TG_API_HASH", ""),
        help="Telegram MTProto API Hash (or set TG_API_HASH env var)",
    )
    parser.add_argument(
        "--session",
        type=str,
        default=os.environ.get("TG_SESSION_NAME", "telerecon_operator"),
        help="Telethon local session filename",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("./reports"),
        help="Base output directory for reports (default: ./reports)",
    )
    parser.add_argument(
        "--max-groups",
        type=int,
        default=12,
        help="Max common groups to sample for activity heatmap",
    )
    parser.add_argument(
        "--msg-limit",
        type=int,
        default=300,
        help="Max messages per shared group to sample for timezone estimation",
    )
    return parser.parse_args()


async def async_main() -> int:
    args = parse_args()
    if not args.api_id or not args.api_hash:
        logger.error(
            "Missing Telegram API credentials. Provide --api-id and --api-hash "
            "or export TG_API_ID and TG_API_HASH environment variables."
        )
        return 1

    orchestrator = TeleReconUltimate(
        target_username=args.username,
        api_id=args.api_id,
        api_hash=args.api_hash,
        session_name=args.session,
        output_root=args.output_dir,
        max_groups=args.max_groups,
        msg_limit=args.msg_limit,
    )
    await orchestrator.run_pipeline()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(asyncio.run(async_main()))
    except KeyboardInterrupt:
        logger.info("Interrupted by operator.")
        sys.exit(130)
