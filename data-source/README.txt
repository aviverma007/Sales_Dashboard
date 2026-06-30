Drop your latest CRM Excel export here (any *.xlsx).

When you run  npm start  the dashboard automatically converts the NEWEST
.xlsx in this folder into public/data/crm_cases.json before launching.

- You can keep old exports here; only the most recently modified one is used.
- If this folder has no .xlsx, npm start just uses the existing data.
- Header row must be row 15 (data starts row 16) — the standard report format.
