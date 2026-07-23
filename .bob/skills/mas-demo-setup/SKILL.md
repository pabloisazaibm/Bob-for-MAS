---
name: mas-demo-setup
description: Use when a user opens this MAS Demo Framework repo for the first time, or when they want to set up a new Maximo demo environment. Guides through connection setup, environment config, use case selection, data loading, and optional demo script generation.
---

# MAS Demo Setup — Guided Onboarding

Run this flow every time a new session starts in this workspace **before doing anything else**.
Work through the stages in order. Do not skip a stage. Confirm each stage is complete before advancing.

---

## Stage 1 — Welcome & Repo Orientation

Greet the user and briefly orient them:

> "Welcome to the MAS Demo Framework. I'll walk you through setting up a complete IBM Maximo Application Suite demo environment — from connection through data loading and a demo script. This takes about 30 minutes end to end. Let's go."

Then check whether a `.env` file already exists in the workspace root.

- If `.env` does NOT exist:
  - Tell the user: "First I need to create your `.env` connection file. I'll ask you a few questions."
  - Proceed to **Stage 2**.
- If `.env` DOES exist:
  - Read the file (use `read_file` on `.env`).
  - Check whether all required fields are filled (not placeholder values containing `<`):
    - `LOGIN_BASE`, `API_BASE`, `MAXIMO_API_KEY`, `MAXIMO_SITE`, `MAXIMO_ORG`, `MAXIMO_LOCATION`, `MAXIMO_OWNER`
  - If all fields are populated, tell the user: "I found an existing `.env` with all fields set. Skipping to connection validation."
    - Skip to **Stage 3**.
  - If any field is still a placeholder, tell the user which fields need filling and proceed to **Stage 2** for those fields only.

---

## Stage 2 — Gather Connection Details

Collect the following, one at a time, using `ask_followup_question`. Do not ask for all at once.

### 2a — MAS URL

Ask:
> "What is the URL of your MAS Manage instance? This is the base URL of the Maximo UI — for example: `https://myapp.manage.mycluster.com/maximo`"

Wait for the answer. Accept any `https://` URL. Do not validate format strictly — they may not know the exact host yet.

Explain: "I'll need both the login host and the API host. On most TechZone environments these differ — the API host has `-all` in the subdomain. If you only have one URL, give me that and I'll figure out the rest during validation."

Store the URL(s) provided.

### 2b — API Key

Ask:
> "What is your Maximo API key? Generate one from: Maximo UI → top-right avatar → API Keys → Generate new key."

Store the key. Do not echo it back in full — mask it as `...XXXX` (last 4 chars only) when confirming.

### 2c — Site, Org, Location

Ask:
> "What Maximo Site ID should the demo data be loaded into? (e.g. `BEDFORD`, `SITE1`)"

Then ask:
> "What is the Org ID for that site? (e.g. `EAGLENA`)"

Then ask:
> "What location code should assets be assigned to? If you're not sure, I can look it up once the connection is validated. Type `lookup` and I'll find valid locations for you after connecting."

### 2d — Person ID (Owner)

Ask:
> "What is the Maximo Person ID that should own the work orders? This is `PERSON.PERSONID` — not the login username. They often differ (e.g. login: `jsmith`, person ID: `JOHN SMITH`). Type `lookup` and I'll find valid person IDs after connecting."

### 2e — Write the .env file

Once all fields are collected, create `.env` by copying `.env.template` and substituting the values:

```
LOGIN_BASE=<value from 2a>
API_BASE=<value from 2a — substitute -all variant if one URL was given; they can correct after validation>
MAXIMO_API_KEY=<value from 2b>
MAXIMO_SITE=<value from 2c>
MAXIMO_ORG=<value from 2c>
MAXIMO_LOCATION=<value from 2c>
MAXIMO_OWNER=<value from 2d>
```

Tell the user: "`.env` created. Proceeding to connection validation."

---

## Stage 3 — Validate the Connection

1. Call `get_instance_details`. 
   - If `instanceUrl` is empty: stop. Tell the user: "Connection failed — `instanceUrl` is empty. The most common cause is an incorrect `MAXIMO_URL` in the MCP server config. Check that `~/.bob/settings/mcp.json` has `MAXIMO_URL` set to the same value as `LOGIN_BASE` in `.env`. Then restart the MCP server and try again."
   - If `instanceUrl` is populated: report the URL back to the user. ✓

2. If the user said `lookup` for location, query Maximo now:
   - Query `mxapilocation` filtered to `siteid="<SITE>"`, select `location,description`, pageSize 10.
   - Show the results and ask the user to pick one.
   - Update `.env` with the chosen location.

3. If the user said `lookup` for person ID, query Maximo now:
   - Query `mxapiperson`, select `personid,displayname`, pageSize 10.
   - Show the results and ask the user to pick one.
   - Update `.env` with the chosen person ID.

4. Validate site exists:
   - Query `mxapilocation` with `siteid="<SITE>"` and confirm at least one result is returned.
   - If zero results: stop and tell the user the site ID appears invalid or empty.

5. Report: "Connection validated. Site `<SITE>` confirmed. Location `<LOCATION>` ready. Owner `<PERSON ID>` set."

---

## Stage 4 — Understand the Use Case

Ask the user what they want to build. Use `ask_followup_question` with multiple-choice options:

> "What type of demo would you like to build? Select the primary use case — we can always add more afterward."

Options:
- A) **Work Orders + Assets** — core reactive/corrective maintenance scenario
- B) **Preventive Maintenance (PM) + Job Plans** — scheduled maintenance with PM triggers and reusable job plan templates
- C) **Materials / Inventory** — parts availability, storeroom management, reorder points
- D) **Full Stack** — Assets + Work Orders + Job Plans + PM Schedules + Inventory (the complete story)
- E) **Something else** — I'll describe it

If they pick E, ask them to describe what they want to build.

Then ask:
> "Tell me about the customer and their asset fleet. Who is the customer, what industry are they in, and what physical assets do they operate and maintain?"

Then ask:
> "What naming prefix should I use for asset numbers and work order numbers? Keep it short — no spaces. For example: `ACME`, `PWR`, `USACE`."

Then ask:
> "What is the high-drama emergency scenario that will open the demo? This becomes the primary corrective work order — make it feel critical."

Optionally ask (only if the use case includes PM or Full Stack):
> "What is a routine, scheduled maintenance task for this fleet? This becomes the primary PM work order — the contrast to the emergency."

Write all collected info into `requirements/my_demo.md` using `write_file`, filling in every section. Tell the user: "`requirements/my_demo.md` updated with your demo brief."

---

## Stage 5 — Propose and Confirm the Demo Data

Based on the use case and brief from Stage 4, propose the full demo dataset **before creating anything in Maximo**:

1. List every Maximo Object Structure you plan to create records in and why.
2. Propose:
   - 10 assets with realistic descriptions and serial numbers using the chosen prefix
   - 10 work orders — a realistic mix of types (CM, PM, CP as appropriate), with task steps and planned materials
   - Job plans and PM schedules if the use case calls for them
   - Inventory records if the use case calls for them
3. Flag the primary CM work order (the high-drama opening scenario) with ★.
4. Show the proposed data as a formatted table or list.

Then explicitly ask:
> "Does this look right? Reply `yes` to proceed with loading, or tell me what to change."

Do not create any Maximo records until the user approves.

---

## Stage 6 — Build the Demo Environment

Once approved:

1. For each Object Structure (assets first, then job plans if any, then work orders, then PMs, then inventory):
   - Call `get_schema_details` to confirm field names.
   - Call `create_record` for each record.
   - Report ✓ or ✗ for each record inline as you go.
   - If any record fails, diagnose the error, fix the payload, and retry before continuing.

2. After all records are created, verify by querying Maximo:
   - Query assets filtered to site + prefix — confirm count.
   - Query work orders filtered to site + prefix — confirm count.
   - Show the first 3 of each for a visual spot-check.

3. Report: "All records created and confirmed in Maximo. [count] assets, [count] work orders[, [count] job plans, [count] PMs] loaded at site `<SITE>`."

---

## Stage 7 — Demo Script (Optional)

Ask the user:

> "Would you like me to generate a Word document demo script? It will include a scene-by-scene navigation guide, your exact record numbers, task steps, part costs, talking points, objection handling, and a pre-demo checklist — all tailored to this customer."

Options:
- A) **Yes, generate the demo script**
- B) **No thanks, I'll skip the script**

If **Yes**:
1. Update `scripts/build_docs.py` — replace all demo constants (assets, work orders, task lists, materials lists, cover page, narration, Q&A, checklist) with content specific to this customer and the exact records just loaded.
2. Run: `python3 scripts/build_docs.py`
3. Confirm both files were created in `output/`:
   - `output/MAS_Demo_Script.docx`
   - `output/CSE_How_To_Guide.docx`
4. Tell the user: "Demo script saved to `output/MAS_Demo_Script.docx`. Open it and run through the pre-demo checklist before your call."

---

## Stage 8 — Handoff

Summarise everything that was built:

> "Demo environment ready for **[CUSTOMER NAME]**.
>
> **Loaded in Maximo (`<SITE>`):**
> - [N] assets ([PREFIX]-AST-001 → [PREFIX]-AST-010)
> - [N] work orders — [N] CM, [N] PM[, [N] job plans, [N] PM schedules, [N] inventory records]
>
> **Opening hook:** [Give a 2–3 sentence opening hook the CSE should use to start the live demo — reference the primary CM work order and the high-drama scenario by name.]
>
> **What's next:** You can now use this session for anything else — additional Maximo queries, record updates, status changes, or building out another demo scenario. Just ask."

The onboarding flow is complete. The session is now open for free-form work.

---

## Notes

- Never skip a stage or move past it without confirming the result.
- If any stage fails (connection error, record creation error, script error), diagnose and fix before continuing — do not proceed past a broken stage.
- The `.env` file must never be committed to git. If the user asks to commit, remind them that `.env` is in `.gitignore` for a reason.
- When showing the API key back to the user, always mask all but the last 4 characters.
