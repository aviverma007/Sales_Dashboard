# Smartworld Sales Dashboard — KPI Reference & Data Sources

**Covers:** Smartworld The Edition · Smartworld Sky Arc · Trump Residences Gurgaon
**Last updated:** 17 July 2026

> **Maintenance rule:** this file must be updated in the same commit as any change to a KPI formula, a rebuild script, a data source, or a chart's calculation logic. If you (human or Claude) change how a number is computed, update the matching section here before moving on. Treat an out-of-date doc as a bug.

---

## 1. How this document is organized

Two pages per project:

- **Overview page** — Units, Area, Sales Value, Total Project Value, Project Snapshot bar, trend charts. Source: PDRN + INVR Excel files, rebuilt into `dashboard_data.json`.
- **Demand & Collection page** — Demand raised, Collected, Outstanding, Milestone table, Tower-wise breakdown, monthly trend. Source: DAPP Excel files, rebuilt into each project's own `*_dapp_kpi.json`.

"Cr" = Crore (1,00,00,000). All monetary figures are in Indian Rupees unless stated otherwise. "W/O Tax" / "W/O GST" means before GST.

### Source file glossary

| File | Project | Contains |
|---|---|---|
| `edition_pdrn.XLSX` / `skyarc_pdrn.XLSX` / `trump_pdrn.XLSX` | each project's own | Booking/sales register — one row per booked or cancelled unit |
| `edition_invr.XLSX` / `skyarc_invr.XLSX` / `trump_invr.XLSX` | each project's own | Inventory register — one row per physical unit (Booked/Available/Management Unit) |
| `edition_dapp.XLSX` / `skyarc_dapp.XLSX` / `trump_dapp.XLSX` | each project's own | Demand & collection ledger — one row per milestone installment raised against a unit |

### Rebuild scripts

| Script | Rebuilds |
|---|---|
| `scripts/rebuild_overview.py` | `dashboard_data.json` Overview sections for **all three** projects at once (pdrn/invr arrays, kpiExtra per project — merged not replaced, towerData, cpVsDirect, areaSummary, cancelledUnitStatus, brokerMap, salesVsRefund, monthly rate series) |
| `scripts/rebuild_edition_json.py` | Same Overview sections, Edition-only (used when only Edition's Excel changed, to avoid touching Sky Arc/Trump) |
| `scripts/rebuild_edition_dapp_kpi.py` | `public/data/dapp_kpi.json` (Edition Demand & Collection) |
| `scripts/rebuild_skyarc_dapp_kpi.py` | `public/data/skyarc_dapp_kpi.json` (Sky Arc Demand & Collection) |
| `scripts/rebuild_trump_dapp_kpi.py` | `public/data/trump_dapp_kpi.json` (Trump Demand & Collection) |

Run the relevant `*_dapp_kpi.py` script whenever a project's DAPP Excel is refreshed — none of this is automatic, and a stale `*_dapp_kpi.json` file is the single most common source of wrong numbers on this dashboard (this happened to Trump for three weeks before it was caught).

---

## 2. Overview Page KPIs (all 3 projects, same formulas)

| KPI | Formula |
|---|---|
| Booked (Active) Units | PDRN rows where Booking Status ≠ Cancelled/blank (Sky Arc: "Temporary Surrender" also counts as active) |
| Cancelled Units | PDRN rows where Booking Status contains "Cancel" |
| Total Inventory Units | Count of all rows in `*_invr.XLSX` |
| Available Units | INVR rows where Status = "Available" |
| Management Units | INVR rows where Status = "Management Unit" |
| Booked Area (sqft) | SUM(PDRN active rows, "Super Area") |
| Carpet Area (sqft) | SUM(PDRN active rows, "Carpet"/"Carpet Area") |
| Total BSP (Sold Value) | SUM(PDRN active rows, "Total BSP Net Value") ÷ 1e7 |
| Total TCV | SUM(PDRN active rows, "TCV (With Tax)") ÷ 1e7 |
| Cancelled BSP | SUM(PDRN cancelled rows, "Total BSP Net Value") ÷ 1e7 |
| Avg Rate / sqft | Total BSP ÷ Booked Area |

**Unsold Value & Total Project Value** (changed 17 Jul 2026 — now identical formula for all 3 projects, computed live in the browser, not baked into the JSON at build time):

```
Unsold Area   = INVR rows where Status = Available or Management Unit, SUM("Total Super Area")
Target Rate   = this project's targetRate in monthlyTargets for the CURRENT calendar month
                (same source the Rate chart's own tooltip reads — always in sync with it)
Unsold Value  = Unsold Area × Target Rate  ÷ 1e7
Total Project Value = Total BSP (Sold Value) + Unsold Value
Sold % (by value)   = Total BSP ÷ Total Project Value × 100
```

This lives in `src/App.jsx`, inside the `kpiEx` useMemo (search `currentMonthTargetRate`). It supersedes three different older, inconsistent methods:
- Edition previously used a **hardcoded fixed rate of ₹21,500/sqft**.
- Sky Arc previously used its own **avg sold rate (Sold BSP ÷ Sold Area)** applied to unsold area ("Approach 2").
- Trump had **no unsold-value calculation at all** and silently fell back to a type-wise blended-rate estimate.

⚠️ The `unsoldValueCr` / `totalProjCr` / `soldPctValue` fields still stored inside `dashboard_data.json`'s `kpiExtra` / `skyarcKpiExtra` objects are **no longer read for this display** — the frontend always recomputes live using the formula above. Those stored fields are vestigial; don't trust them if you're reading the raw JSON directly.

**Current values (17 Jul 2026, target rate for Jul'26):**

| | Edition | Sky Arc | Trump |
|---|---|---|---|
| Booked units | 632 | 889 | 224 |
| Cancelled units | 75 | 125 | 25 |
| Total inventory | 956 | 947 | 298 |
| Available / Management | 272 / 52 | 49 / 9 | 74 / 0 |
| Total BSP | ₹3,670.5 Cr | ₹4,430.6 Cr | ₹2,257.7 Cr |
| Avg Rate/sqft | ₹17,811 | ₹18,423 | ₹25,703 |
| Current month Target Rate | ₹21,500 | ₹21,500 | ₹28,500 |
| Unsold Value | ₹2,300.28 Cr | ₹338.95 Cr | ₹910.47 Cr |
| Total Project Value | ₹5,970.78 Cr | ₹4,769.55 Cr | ₹3,168.17 Cr |

**Project Snapshot bar — top 2 milestone chips:** computed **live** from each project's own `milestonesUpcoming` (sorted by `totalCr` descending, top 2), not a stored value. See §4 below. This replaced a hand-maintained `projectMeta.majorMilestones` field that was stale (Sky Arc's stored chips didn't match its real top milestone; Trump had none at all).

---

## 3. Demand & Collection Page KPIs (all 3 projects, same formulas)

| KPI | Formula |
|---|---|
| Total Demand (W/O Tax) | SUM(DAPP, "Demand Amount W/O Tax") ÷ 1e7 |
| Total Received (in Bank) | SUM(DAPP, "Received Amt (in Bank)") ÷ 1e7 |
| Total Received (W/O Tax) | SUM(DAPP, "Received Amt (in Bank)" − "CGST" − "SGST") ÷ 1e7 |
| Total Outstanding | SUM(DAPP, **"Outstanding 1"**) ÷ 1e7 — **not** "Outstanding Amount" (see bug note below) |
| Advance (raw/net/GST) | Rows where Demand = 0 but Received (Bank) > 0 (money collected before SAP raised the demand); net = raw ÷ 1.05, GST = raw − net |
| GST Rate | Fixed 5% |

⚠️ **"Outstanding 1" vs "Outstanding Amount" bug (fixed 17 Jul 2026, all 3 projects + Edition's raw dapp array):** `"Outstanding 1"` is a legitimate `0` for most rows. An earlier version used `Outstanding 1 or Outstanding Amount` in Python — since `0` is falsy, this silently fell through to `"Outstanding Amount"`, a completely different and much larger column, inflating Outstanding by roughly 20–25x. Always read `"Outstanding 1"` directly with no `or` fallback.

**CLP / TLP classification (changed 17 Jul 2026 — now identical rule for all 3 projects, by milestone content, not by Payment Plan Name):**

- **CLP** — milestone references a real construction event: floor/slab number, Excavation, Structure, Occupation Certificate, Possession, Flooring, Finishing Work, External Plaster, Basement/Plinth/Top Floor; OR a hybrid "event **or** date, whichever is later/earlier" (the date is just a backstop on a real construction milestone); OR a booking-stage milestone (Booking Amount / On Allotment — first installment); OR a time offset anchored to a construction event (e.g. "24 months from Application of OC").
- **TLP** — a pure fixed calendar date with no construction anchor ("Before `<date>`"), or a day/month interval from allotment/booking with no construction anchor ("After `<X>` Days/Months of Allotment/Booking").

This replaced three different older rules:
- Edition already used content-based classification (unchanged).
- Sky Arc previously classified by whether **Payment Plan Name** contained the text "CLP" — meant the same milestone could appear as both a CLP row and a TLP row depending on which plan happened to bill it.
- Trump previously classified **everything as TLP** (its Payment Plan Names are ratio-style — "30:30:40", "35:65" — and never contain CLP/TLP text, so that field was never usable as a signal). Its real construction milestones now correctly show as CLP.

**Current headline totals (17 Jul 2026):**

| | Edition | Sky Arc | Trump |
|---|---|---|---|
| Demand (W/O Tax) | ₹1,177.11 Cr | ₹1,861.93 Cr | ₹686.63 Cr |
| Received (in Bank) | ₹1,419.07 Cr | ₹1,732.32 Cr | ₹799.15 Cr |
| Received (W/O Tax) | ₹1,360.22 Cr | ₹1,639.23 Cr | ₹764.82 Cr |
| Outstanding | ₹40.46 Cr | ₹260.78 Cr | ₹51.2 Cr |
| Advance (raw / net / GST) | ₹223.34 / ₹212.71 / ₹10.64 Cr | ₹46.05 / ₹43.86 / ₹2.19 Cr | ₹135.63 / ₹129.17 / ₹6.46 Cr |
| — of which TLP | ₹950.76 Cr demand | ₹495.86 Cr demand | ₹439.11 Cr demand |
| — of which CLP | ₹226.34 Cr demand | ₹1,366.08 Cr demand | ₹247.52 Cr demand |
| Monthly trend points | 33 | 22 | 14 |

`kpi.all.totalDemandWoTax` always exactly equals `kpi.tlp.totalDemandWoTax + kpi.clp.totalDemandWoTax` (and likewise for received/outstanding) — if it doesn't, the rebuild script has a bug; check for double-counted rows.

**Required Rate / Target Rate (Rate — Target vs Actual chart, "at risk" callout):**

```
Required Rate  = average of ALL months' targetRate for this project in monthlyTargets
                 (this is what "New required rate of X" shows)
Target Rate    = THIS CALENDAR MONTH's own targetRate in monthlyTargets
                 (this is what "against ₹X (Target Rate)" shows — matches the chart tooltip exactly)
AOP TSV        = Total BSP (Sold Value) + (Available Area × current month's Target Rate)
```
Both read straight from `monthlyTargets`, filtered by `projectFilter` and the current month's `label` — same source as the Overview page's Unsold Value calc above, so they always agree with each other.

---

## 4. Milestone Table (all 3 projects, same conventions)

- **Grouping:** by semantic short name (case-insensitive), not raw text — e.g. "On Completion of 40th Floor Slab" and "On Laying of 40th Floor Slab" both become one "40th Floor Slab" row. Per the original doc's "Milestone Table Name Normalization" rule, extended from pure case-insensitivity to include construction-keyword grouping.
- **Amount basis:** `SUM("Installment Amount")` — the **full scheduled plan value**, not "Demand Amount W/O Tax" (which is only what's been billed to date). This is deliberately a different, larger number than the headline Demand KPI — the milestone table's grand total is meant to show the whole remaining payment schedule, billed or not.
- **"Before `<date>`" milestones** (pure fixed calendar date, e.g. "On or Before 15th May 2024") keep their own exact date as a distinct row — never collapsed into one generic "Fixed-Date Installment" bucket regardless of when they're actually due. Date parsing handles ordinal suffixes (1st/2nd/3rd/4th...), multiple month-name formats, hyphenated dates ("14th-Sep-2025"), and non-breaking spaces.
- **"After `<X>` Days/Months of Allotment/Booking" milestones** (relative interval, no construction anchor) — each distinct interval (60 days ≠ 90 days) stays its own row.
- **Tower columns (T-1…T-6):** Edition uses its own T-1…T-6 tower names directly. Sky Arc maps TA→T1, TB→T2, TC→T3, TD→T4, TE→T5, TF→T6 (fixed positional mapping). Trump maps Tower-1→T1, Tower-2→T2; its combined "Tower-1 & 2" bucket contributes to the milestone's `totalCr` but isn't split into a T-column (T3–T6 stay 0 for Trump — the frontend's milestone table hardcodes 6 T-columns regardless of project).
- **Expected dates for not-yet-billed milestones:** filled in from each project's slab/construction schedule file (Edition: `Edition_Slab_Matrix.xlsx`; Sky Arc: `11__Sky_Arc_schedule_-_Update-01_Jul_26_.xlsx`; Trump: `20260702_Trump_Tower_L0.xlsx`), using the **latest tower's** finish date (MAX across towers) for each milestone. Milestones with no explicit date anywhere in the schedule are left blank rather than interpolated or guessed.

**Current milestone table stats (17 Jul 2026):**

| | Edition | Sky Arc | Trump |
|---|---|---|---|
| Milestone rows | 415 | 157 | 41 |
| Grand total (Installment Amount basis) | ₹3,732.29 Cr | ₹4,482.76 Cr | ₹2,279.66 Cr |
| Top milestone | 40th Floor Slab (₹962.47 Cr, Apr 2027) | Excavation Start (₹581.32 Cr, Jul 2025) | OC Application (₹618.88 Cr, Oct 2029) |

---

## 5. Data Quality Notes & Decisions Log

Deliberate decisions and known gaps, so future rebuilds can be checked against the same logic.

1. **Sky Arc's stored data was overstated ~2.3x before 17 Jul 2026.** The live `dashboard_data.json` had all 1,014 Sky Arc PDRN records marked ACTIVE (zero recorded as cancelled), summing to ₹10,097 Cr Sold BSP. Neither the old nor new source Excel supports this figure from any column. Fresh Excel gives 848 ACTIVE + 42 Temporary Surrender + 125 CANCELLED, true Sold BSP ₹4,430.6 Cr. Per instruction, fresh Excel is now the source of truth going forward; the root cause of the original 2x inflation was never fully identified (not a duplicate column, not TCV, not with-tax BSP).

2. **`dapp` array duplication bug (fixed 17 Jul 2026).** `rebuild_overview.py`'s `parse_dapp()` used the raw Excel "Project Name" column text instead of the canonical project key. Sky Arc's column says "Smartworld Sky Arc", Trump's says "Trump Residences Gurgaon" — neither matches the canonical `SMARTWORLD SKY ARC` / `TRUMP RESIDENCES GURGAON` keys used everywhere else, so old mis-cased rows never got replaced by the next run's dedupe filter, and a fresh batch was added every re-run. Found after two runs had already tripled Sky Arc's dapp records (35,863 instead of 11,951) and Trump's (5,755 instead of 1,921). Fixed to always use the canonical key; purged back to exact source counts. This mainly affected the Collections tab's date-filtered totals, not the precomputed `dapp_kpi.json` headline figures.

3. **`CollectionsTab` project-filter refresh bug (fixed 17 Jul 2026).** Its data-fetch `useEffect` had an empty dependency array, so changing the project filter while already on the Demand & Collection page didn't refetch — it only appeared to work when navigating via Overview first, because switching tabs remounts the component. Fixed by adding `filters.project` to the dependency array.

4. **Milestone table Installment Amount vs Demand Amount W/O Tax (fixed 17 Jul 2026, Edition originally, same fix applied to Sky Arc/Trump from the start).** The milestone table must use `"Installment Amount"` (full scheduled value); using `"Demand Amount W/O Tax"` there means every not-yet-billed milestone shows ₹0, which is uninformative and doesn't match the doc's own stated convention.

5. **Trump's `trump_dapp_kpi.json` sat stale for ~3 weeks** (last built 24 Jun, source Excel refreshed 16 Jul) before being caught and rebuilt on 17 Jul 2026. General lesson: refreshing a project's raw Excel does **not** automatically rebuild its `*_dapp_kpi.json` — the relevant script must be run explicitly every time.

6. **Known gaps — no date available, left blank rather than guessed:**
   - Edition: 20th/29th/32nd/34th Floor Slab, Flooring, Finishing Work, Possession.
   - Sky Arc: OC Application, Possession, Super Structure, several Finishing Work variants, a few small stray fixed-date milestones.
   - Trump: several small "Within X Months from Allotment" milestones with no schedule match.

7. **BHK type charts** — the "Type Wise % Sale" chart on the Overview page collapses every project's detailed unit sub-type naming (Edition: "TYPE A- 3BHK...", Sky Arc: "3BHK+UTILITY - TYPE 3", Trump: "4BHK+UTILITY (DX-ODD) TYPE-3") down to plain 2BHK/3BHK/4BHK/5BHK buckets via a `(\d)\s*BHK` regex, consistent across all three. A separate, more detailed sub-type chart (`ChartCardBHK`) elsewhere on the page is untouched and still shows the granular breakdown.

---

## 6. Monthly Targets (AOP)

All three projects now have a full 24-month AOP target table (Apr'25–Mar'27) in `dashboard_data.json`'s `monthlyTargets`, keyed by `projectFilter`. Schema: `{month, label, fy, units, areaSqft, tsvCr, targetRate, projectFilter}`.

- Edition and Sky Arc's tables were entered directly from the AOP spreadsheet and matched exactly.
- Trump's old table (23 entries) mixed actual historical bookings mislabeled as "targets" (e.g. May'25 showing 236 units/₹2,506 Cr — essentially all historical sales to date) with a flat dummy placeholder repeated for future months; replaced with the real 24-month table.

A 52-unit/₹309 Cr (Sky Arc) or 76-unit/₹949 Cr (Trump) or 336-unit/₹2,388 Cr (Edition) "carry-over to FY28" figure exists per project but isn't stored as a monthly row (same convention across all three).

---

## 7. Chart-specific fixes (not KPI formula changes, but affect what's displayed)

- **Area — Target vs Achieved chart:** bar/label values were being rounded to whole numbers via `Math.round()`, making small values (e.g. 0.15 L sqft) display as "0". Fixed to show the actual computed value.
- **TSV — Target vs Achieved chart:** the "Adjusted" projection line was removed per instruction (Units and Area charts keep theirs).
- **Rate — Target vs Actual chart:** the Target Rate (navy) line had a gap for the current quarter (was waiting on a "projection" line that's never actually rendered in this specific chart); fixed to render continuously from the current month.
- **Expected Collection per Month chart:** was rendering every month at once with no windowing, causing labels to overlap; added the same 14-month scrollable window + prev/next buttons used elsewhere.
- **Milestone table:** was rendering all rows with no height limit (400+ for Edition); added a 480px scrollable container with a sticky header.
- **Builtup Area (Project Snapshot bar):** was showing a raw comma-formatted sqft string; converted to "X.XX Lakh sq ft" to match the Saleable Area field's format.

---

## 8. Things to check whenever you touch this dashboard

1. If you refresh a project's PDRN/INVR files → re-run that project's Overview rebuild (`rebuild_overview.py` for Sky Arc/Trump, or `rebuild_edition_json.py` for Edition-only), then re-run that project's `*_dapp_kpi.py` if you also refreshed DAPP.
2. After running `rebuild_overview.py`, verify the other two projects' `kpiExtra`/`towerData`/`cancelledUnitStatus` are byte-identical to before (it processes all 3 projects at once) — a change there when you only meant to touch one project is a red flag.
3. Check `kpi.all.totalDemandWoTax == kpi.tlp.X + kpi.clp.X` (and received/outstanding) after any `*_dapp_kpi.py` run — if it doesn't reconcile exactly, something is being double-counted or dropped.
4. Confirm milestone grand total ≠ headline Demand KPI (that gap is expected — see §4) but is in a sane ballpark relative to Total BSP.
5. Update this document.
