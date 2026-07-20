Bob for MAS — Demo Framework
IBM Customer Success Engineering
═══════════════════════════════════════════════════════════════

WHAT THIS IS
────────────
A self-service toolkit that lets CSEs spin up a fully loaded IBM Maximo
Application Suite demo environment in ~30 minutes using IBM Bob.

You fill in a one-page brief about your customer (industry, asset types,
the emergency scenario you want to open with). You paste one prompt into
Bob. Bob generates realistic assets and work orders, loads them directly
into your Maximo instance via REST API, and produces a Word doc demo script
referencing your exact record numbers — no placeholders, no manual data entry.


GETTING STARTED
───────────────
Everything you need is in GitHub:

  https://github.com/pabloisazaibm/Bob-for-MAS

Start with the README.md — the 5-step quickstart is the whole process.


WHAT YOU NEED BEFORE YOU START
────────────────────────────────
  • IBM Bob with the maximo-mcp MCP server configured
  • A MAS Manage instance with API access (TechZone GTM demo works)
  • Python 3 installed on your machine
  • Your Maximo API key (Maximo UI → avatar → API Keys → Generate)
  • Default Insert Site set in your Maximo user profile
    (avatar → Profile → Default Insert Site)
    — this is the #1 setup step people miss; without it every POST fails


THE 5-STEP PROCESS
──────────────────
  1. Clone the repo and copy .env.template to .env — fill in 6 values
     (Maximo URL, API key, site, org, location, person ID)

  2. Open requirements/my_demo.md and answer 6 questions about your customer
     (there's a completed NOAA example in requirements/example_noaa.md)

  3. Open prompts/bob_generate.md, copy the entire contents, paste into Bob

  4. Bob validates your connection, generates the data, loads it into Maximo,
     and produces output/MAS_Demo_Script.docx — watch it run

  5. Verify in Maximo (Assets and Work Orders), open your demo script, present


WHAT BOB GENERATES
──────────────────
  • 10 industry-specific assets with serial numbers and locations
  • 10 work orders — mix of CM (corrective/emergency) and PM (preventive)
    each with 4–6 task steps and 3–4 planned materials with realistic costs
  • output/MAS_Demo_Script.docx — a full presenter guide containing:
      - Complete asset and work order reference tables (exact record numbers)
      - Scene-by-scene navigation: what to click, what to say
      - Task steps and material costs for your featured work orders
      - Opening hook tailored to your customer's industry
      - Objection handling and Q&A
      - 12-item pre-demo checklist


REPO STRUCTURE
──────────────
  README.md                     5-step quickstart and troubleshooting
  .env.template                 Copy to .env, fill in your Maximo connection
  requirements/my_demo.md       Fill this in — your demo brief
  requirements/example_noaa.md  Completed reference example (NOAA buoy fleet)
  prompts/bob_generate.md       Paste this into Bob to generate everything
  scripts/demo_loader.py        Maximo REST API loader engine
  scripts/build_docs.py         Word doc generator
  output/                       Generated files land here (gitignored)


COMMON ISSUES
─────────────
  "null is not a valid site"     → Set Default Insert Site in Maximo UI
  "302 redirect on every call"   → Use the manage subdomain, not home/nav URL
  "instanceUrl empty" in Bob     → Env var must be MAXIMO_URL (not MAXIMO_BASE_URL)
  "Person does not exist"        → Use PERSON.PERSONID, not the login ID
  "Location X is not valid"      → Ask Bob: Query mxapilocation at your site
  "Work Type MOD not valid"      → Valid types: PM, CM, CP, EM


QUESTIONS
─────────
Contact Pablo Isaza — pabloisaza@ibm.com
