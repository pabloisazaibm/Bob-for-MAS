# Example Demo Brief — NOAA Ocean Buoy Fleet
# ===========================================
# This is a completed reference example showing the level of detail Bob expects.
# Use this as a template when filling in requirements/my_demo.md.
# The data below matches exactly what is loaded in the Maximo BEDFORD site.

---

## 1. Customer & Audience

**Customer name:** NOAA — National Oceanic and Atmospheric Administration

**Audience (who will be in the room):**
Director of Fleet Maintenance, Chief of Observations Division, IT Modernization Lead, Procurement Officer

**Industry / sector:** Federal Government / Environmental Science / Maritime Operations

---

## 2. What They Manage (the Asset Fleet)

**What physical assets does this customer operate and maintain?**
A network of ocean data buoys deployed across the Pacific, Atlantic, Gulf of Mexico, Arctic, Caribbean, and Great Lakes. Each buoy is a self-contained instrument platform with meteorological sensors, oceanographic sensors, a satellite communications modem (Iridium), and a battery/solar power system. Buoys operate unmanned for 12–18 months between service visits; maintenance requires boat deployment to remote ocean locations.

**Asset naming prefix:** NOAA
- Assets: NOAA-BUY-001 → NOAA-BUY-010
- Work orders: NOAA-WO-001 → NOAA-WO-010

**Specific asset types in this demo:**

| Asset # | Description | Serial # | Location |
|---|---|---|---|
| NOAA-BUY-001 | Pacific Ocean Monitoring Buoy - Station Alpha | SRN-2024-001 | SHIPPING |
| NOAA-BUY-002 | Gulf of Mexico Data Buoy - Station Bravo | SRN-2024-002 | SHIPPING |
| NOAA-BUY-003 | Atlantic Hurricane Tracking Buoy - Station Charlie | SRN-2024-003 | SHIPPING |
| NOAA-BUY-004 | Bering Sea Ice Monitoring Buoy - Station Delta | SRN-2024-004 | SHIPPING |
| NOAA-BUY-005 | Great Lakes Water Quality Buoy - Station Echo | SRN-2024-005 | SHIPPING |
| NOAA-BUY-006 | Chesapeake Bay Tidal Buoy - Station Foxtrot | SRN-2024-006 | SHIPPING |
| NOAA-BUY-007 | Caribbean Sea Wave Height Buoy - Station Golf | SRN-2024-007 | SHIPPING |
| NOAA-BUY-008 | Arctic Circle Drift Buoy - Station Hotel | SRN-2024-008 | SHIPPING |
| NOAA-BUY-009 | Coral Sea Reef Monitoring Buoy - Station India | SRN-2024-009 | SHIPPING |
| NOAA-BUY-010 | East Coast Storm Surge Buoy - Station Juliet | SRN-2024-010 | SHIPPING |

---

## 3. The Emergency Scenario (demo opening)

**High-drama failure:** Station Bravo (NOAA-BUY-002) in the Gulf of Mexico has triggered a battery failure alert during peak Atlantic hurricane season. The sensor suite is still on backup power but has a narrow maintenance window before it goes fully offline. A gap in Gulf buoy coverage during hurricane season is a national weather forecasting risk.

**Asset that fails:** NOAA-BUY-002 — Gulf of Mexico Data Buoy - Station Bravo

**Primary CM work order:** NOAA-WO-002 — Emergency Battery Pack Replacement - Gulf Buoy Bravo (Type: CM)

**Most expensive / hard-to-get part:** BATT-LI-48V — Lithium-Ion Battery Pack 48V/200Ah — $4,200 per unit

**WO-002 task steps:**
1. Confirm GPS position fix and isolate vessel approach vector
2. Power-down buoy electronics via shore-side remote command
3. Remove battery housing cover and photograph condition
4. Extract failed lithium-ion battery pack (P/N BATT-LI-48V)
5. Install replacement battery pack and torque housing bolts to 35 Nm
6. Power-on sequence, verify all sensors report nominal readings

**WO-002 planned materials:**

| Part # | Description | Qty | Unit Cost |
|---|---|---|---|
| BATT-LI-48V | Lithium-Ion Battery Pack 48V/200Ah | 1 | $4,200.00 |
| SEAL-KIT-04 | Weatherproof Gasket & Seal Kit | 1 | $185.00 |
| BOLT-M12-SS | Stainless Steel M12 Bolts (pack/10) | 2 | $42.00 |
| DIAG-HARNESS | Battery Diagnostic Harness | 1 | $310.00 |

**Total estimated material cost for WO-002: ~$4,779**

---

## 4. The Preventive Maintenance Contrast

**Primary PM work order:** NOAA-WO-001 — Annual Sensor Calibration - Pacific Buoy Alpha (Type: PM)

**WO-001 task steps:**
1. Download sensor calibration log via satellite link
2. Compare pressure, temperature, and salinity readings against NIST standards
3. Apply offset corrections using calibration software v4.2
4. Run 24-hour validation data cycle and capture CSV export
5. Update calibration certificate and log in Maximo work order
6. Confirm next calibration due date — set 12-month PM trigger

**WO-001 planned materials:**

| Part # | Description | Qty | Unit Cost |
|---|---|---|---|
| CAL-REF-STD | NIST Traceable Calibration Reference Standard | 1 | $890.00 |
| CABLE-USBC-IP | IP67-rated USB-C Sensor Interface Cable | 1 | $130.00 |
| LABEL-CERT | Calibration Certificate Label Set | 1 | $22.00 |

**All 10 work orders:**

| WO # | Description | Type |
|---|---|---|
| NOAA-WO-001 | Annual Sensor Calibration - Pacific Buoy Alpha | PM |
| NOAA-WO-002 | Emergency Battery Pack Replacement - Gulf Buoy Bravo | CM ★ |
| NOAA-WO-003 | Mooring Chain Inspection and Re-tensioning - Atlantic Buoy Charlie | PM |
| NOAA-WO-004 | Ice Sensor Array Replacement - Bering Sea Buoy Delta | CM |
| NOAA-WO-005 | Water Quality Sensor Suite Cleaning - Great Lakes Buoy Echo | PM |
| NOAA-WO-006 | Tidal Pressure Gauge Recertification - Chesapeake Buoy Foxtrot | PM |
| NOAA-WO-007 | Wave Rider Sensor Realignment - Caribbean Buoy Golf | CM |
| NOAA-WO-008 | Iridium Satellite Modem Replacement - Arctic Buoy Hotel | CM |
| NOAA-WO-009 | Coral Bleaching Sensor Upgrade - Reef Buoy India | PM |
| NOAA-WO-010 | Storm Surge Sensor Annual Overhaul - East Coast Buoy Juliet | PM |

★ = primary demo WO (high-drama CM)

---

## 5. Maximo Environment

**Site ID:** BEDFORD
**Org ID:** EAGLENA
**Location:** SHIPPING
**Person ID (owner):** PABLO ISAZA

---

## 6. Tone & Talking Points

**Compliance / regulatory:** NOAA data feeds NOAA Weather Radio, NWS forecast models, and the Pacific Tsunami Warning Center. Any gap in buoy coverage is a public safety issue, not just an operational one.

**Integration the customer cares about:** Telemetry system integration — buoys transmit sensor data via Iridium satellite and GOES. NOAA wants work orders auto-created from telemetry alerts (battery low, sensor out-of-spec, modem offline).

**Expected objections:**
- "We have legacy CMMS data in an old system" → Maximo has bulk import, start with a pilot buoy class
- "We need FedRAMP" → MAS on IBM Cloud for Government is FedRAMP Moderate Authorized
- "Procurement takes too long" → GSA Schedule 70 and NASA SEWP available
