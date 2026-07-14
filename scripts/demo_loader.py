#!/usr/bin/env python3
"""
IBM Maximo Manage — Demo Data Loader
=====================================
Reusable script for IBM Customer Success Engineers.
Connects to any MAS Manage instance via REST API and bulk-creates:
  - Assets (customizable list)
  - Work Orders with task operations and planned materials

USAGE
-----
Option A (recommended): fill in .env at the repo root, then run:
    python3 scripts/demo_loader.py

Option B: set environment variables directly, then run:
    export LOGIN_BASE=https://... API_BASE=https://... MAXIMO_API_KEY=... etc.
    python3 scripts/demo_loader.py

Option C: Bob fills in the CONFIGURATION and DEMO DATA blocks below
    automatically when you use the prompt in prompts/bob_generate.md.

REQUIREMENTS
------------
Python 3.7+  (no third-party packages needed — uses stdlib only)
"""

import json
import os
import urllib.request
import urllib.error
import http.cookiejar
import ssl
import pathlib

# ── Load .env if present (simple key=value parser, no dependencies) ───────────
_env_path = pathlib.Path(__file__).parent.parent / ".env"
if _env_path.exists():
    for _line in _env_path.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _, _v = _line.partition("=")
            os.environ.setdefault(_k.strip(), _v.strip())

# =============================================================================
# CONFIGURATION — values are read from .env / environment variables first.
# Bob will fill these in directly when running via the bob_generate.md prompt.
# =============================================================================

# Login URL  — the frontend/manage host used to establish the session cookie
# Pattern:   https://<appid>.manage.<cluster>/maximo
LOGIN_BASE = os.environ.get("LOGIN_BASE",      "https://<your-manage-host>/maximo")

# API URL — where all data calls are sent (may differ from LOGIN_BASE after redirect)
# If unsure, set to the same value as LOGIN_BASE and run once;
# the error message will reveal the correct -all.manage.* hostname.
API_BASE   = os.environ.get("API_BASE",        "https://<your-api-host>/maximo")

# API key — generate in Maximo: top-right avatar → API Keys → Generate
API_KEY    = os.environ.get("MAXIMO_API_KEY",  "<your-api-key>")

# Site, Org, Location — must already exist in your Maximo instance
# Ask Bob: "Query mxapilocation for location and description at site <SITE>"
SITE       = os.environ.get("MAXIMO_SITE",     "<SITE>")        # e.g. BEDFORD
ORG        = os.environ.get("MAXIMO_ORG",      "<ORG>")         # e.g. EAGLENA
LOCATION   = os.environ.get("MAXIMO_LOCATION", "<LOCATION>")    # e.g. CENTRAL

# Owner — must be an active person in Maximo
# IMPORTANT: use PERSON.PERSONID, not the login ID — they can differ
# Ask Bob: "Query mxapiperson for personid and displayname, 10 records"
OWNER      = os.environ.get("MAXIMO_OWNER",    "<PERSON ID>")   # e.g. JOHN SMITH

# =============================================================================
# DEMO DATA — replace with your customer/industry-specific records.
# Bob generates and fills this in automatically via bob_generate.md.
# =============================================================================

# 10 assets — each must have assetnum, description, serialnum, location
# DO NOT add: vendor, assettype, status — Maximo validates these strictly
ASSETS = [
    {"assetnum": "DEMO-AST-001", "description": "Asset One Description",   "serialnum": "SN-2024-001", "location": LOCATION},
    {"assetnum": "DEMO-AST-002", "description": "Asset Two Description",   "serialnum": "SN-2024-002", "location": LOCATION},
    {"assetnum": "DEMO-AST-003", "description": "Asset Three Description", "serialnum": "SN-2024-003", "location": LOCATION},
    {"assetnum": "DEMO-AST-004", "description": "Asset Four Description",  "serialnum": "SN-2024-004", "location": LOCATION},
    {"assetnum": "DEMO-AST-005", "description": "Asset Five Description",  "serialnum": "SN-2024-005", "location": LOCATION},
    {"assetnum": "DEMO-AST-006", "description": "Asset Six Description",   "serialnum": "SN-2024-006", "location": LOCATION},
    {"assetnum": "DEMO-AST-007", "description": "Asset Seven Description", "serialnum": "SN-2024-007", "location": LOCATION},
    {"assetnum": "DEMO-AST-008", "description": "Asset Eight Description", "serialnum": "SN-2024-008", "location": LOCATION},
    {"assetnum": "DEMO-AST-009", "description": "Asset Nine Description",  "serialnum": "SN-2024-009", "location": LOCATION},
    {"assetnum": "DEMO-AST-010", "description": "Asset Ten Description",   "serialnum": "SN-2024-010", "location": LOCATION},
]

# 10 work orders — one per asset above
# worktype valid values: PM, CM, CP, EM  (check your instance with a WO query)
# wopriority: integer 1–5
# tasks: list of step description strings — become numbered task operations on the WO
# materials: list of dicts — use linetype MATERIAL (freeform); items do NOT need to
#            pre-exist in the Maximo item master
WORK_ORDERS = [
    {
        "wonum": "DEMO-WO-001", "assetnum": "DEMO-AST-001",
        "description": "Work Order One Description",
        "worktype": "PM", "wopriority": 2,
        "tasks": [
            "Task step one",
            "Task step two",
            "Task step three",
            "Task step four",
        ],
        "materials": [
            {"itemnum": "PART-001", "description": "Part One Description", "qty": 1, "unitcost": 100.00},
            {"itemnum": "PART-002", "description": "Part Two Description", "qty": 2, "unitcost": 50.00},
        ],
    },
    {
        "wonum": "DEMO-WO-002", "assetnum": "DEMO-AST-002",
        "description": "Work Order Two Description",
        "worktype": "CM", "wopriority": 1,
        "tasks": [
            "Task step one",
            "Task step two",
            "Task step three",
        ],
        "materials": [
            {"itemnum": "PART-003", "description": "Part Three Description", "qty": 1, "unitcost": 500.00},
        ],
    },
    # --- Replicate the pattern above for WOs 3–10 ---
    # Bob fills all 10 in automatically when using bob_generate.md
]

# =============================================================================
# ENGINE — do not edit below this line
# =============================================================================

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode    = ssl.CERT_NONE

jar    = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(
    urllib.request.HTTPSHandler(context=ctx),
    urllib.request.HTTPCookieProcessor(jar),
)
urllib.request.install_opener(opener)


def login():
    """Establish an authenticated session on both the login host and API host."""
    for base in [LOGIN_BASE, API_BASE]:
        req = urllib.request.Request(f"{base}/api/login?apikey={API_KEY}", method="GET")
        req.add_header("Accept", "application/json")
        try:
            with opener.open(req) as r:
                body = json.loads(r.read())
                if base == LOGIN_BASE:
                    print(f"Logged in: Maximo {body.get('maxupg', 'ok')}")
        except Exception:
            pass


def post(path, payload):
    """
    POST payload to API_BASE + path.
    Appends lean=1&_siteid=SITE to every request — required when the user's
    querywithsite=true but defaultSite is not set via UI profile.
    """
    sep = "&" if "?" in path else "?"
    url = f"{API_BASE}{path}{sep}lean=1&_siteid={SITE}&_insertsite={SITE}"
    data = json.dumps(payload).encode()
    req  = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept",       "application/json")
    req.add_header("apikey",       API_KEY)
    try:
        with opener.open(req) as r:
            body = r.read()
            return json.loads(body) if body else {"ok": True}
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ERROR {e.code}: {body[:400]}")
        return None


def create_assets():
    print(f"\n=== Creating {len(ASSETS)} Assets ===")
    for a in ASSETS:
        payload = {
            "assetnum":    a["assetnum"],
            "description": a["description"],
            "siteid":      SITE,
            "orgid":       ORG,
            "location":    a["location"],
            "serialnum":   a["serialnum"],
        }
        result = post("/api/os/mxapiasset", payload)
        if result and "assetnum" in result:
            print(f"  ✓ {result['assetnum']} created")
        elif result and "BMXAA4129E" in str(result):
            print(f"  ~ {a['assetnum']} already exists — skipped")
        elif result and result.get("ok"):
            print(f"  ✓ {a['assetnum']} created (201)")
        else:
            print(f"  ✗ {a['assetnum']} failed")


def create_work_orders():
    print(f"\n=== Creating {len(WORK_ORDERS)} Work Orders ===")
    for wo in WORK_ORDERS:
        tasks = [
            {"taskid": (i + 1) * 10, "description": desc, "istask": True, "status": "WAPPR"}
            for i, desc in enumerate(wo["tasks"])
        ]
        materials = [
            {
                "description": m["description"],
                "itemqty":     m["qty"],
                "unitcost":    m["unitcost"],
                "linetype":    "MATERIAL",   # freeform — no item master entry required
            }
            for m in wo["materials"]
        ]
        # Map any work types not valid in your instance
        worktype_map = {"MOD": "PM", "COR": "CM"}
        worktype = worktype_map.get(wo["worktype"], wo["worktype"])

        payload = {
            "wonum":       wo["wonum"],
            "description": wo["description"],
            "siteid":      SITE,
            "orgid":       ORG,
            "assetnum":    wo["assetnum"],
            "worktype":    worktype,
            "wopriority":  wo["wopriority"],
            "status":      "WAPPR",
            "location":    LOCATION,
            "woactivity":  tasks,
            "wpmaterial":  materials,
        }
        result = post("/api/os/mxapiwodetail", payload)
        if result and "wonum" in result:
            print(f"  ✓ {result['wonum']} created — {wo['description'][:55]}")
        elif result and result.get("ok"):
            print(f"  ✓ {wo['wonum']} created (201)")
        else:
            print(f"  ✗ {wo['wonum']} failed")


if __name__ == "__main__":
    print("IBM Maximo Manage — Demo Data Loader")
    print("=" * 45)
    login()
    create_assets()
    create_work_orders()
    print("\nDone.")
