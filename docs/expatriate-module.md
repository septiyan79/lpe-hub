# Expatriate Module

Tracks work permits, family permits, passports, and departure for foreign employees (expatriates) at PT DNP Indonesia.

## Access Control

Role required: `"admin"` or `"expatriate_admin"`.  
Guard helper: `requireExpatAdmin()` in `app/api/expatriate/_helpers.js`.

## Pages

| Route | Description |
|-------|-------------|
| `/expatriate` | List all expatriates with permit urgency indicators |
| `/expatriate/[id]` | Expat detail: permits, family members, history |
| `/expatriate/permit-types` | Manage PermitType master data |
| `/expatriate/epo` | View expatriates with EPO issued (departed) |

## PermitType Flags

Flags on `PermitType` control behavior across the UI and API:

| Flag | Meaning |
|------|---------|
| `forExpat` | Appears in expat permit dropdowns |
| `forFamily` | Appears in family permit dropdowns |
| `hasExpiry` | Whether to show/require expiry date |
| `isOneTime` | Issued once — expired status NOT shown as urgent (e.g. eVisa) |
| `isEPO` | Exit Permit Only — one per person, marks departure. API rejects second EPO |
| `linkedToWorkPermit` | Linked lifetime logic (display purpose) |
| `order` | Sort order in dropdowns and lists |

## Business Rules

1. **EPO is unique per expat** — `POST /api/expatriate/[id]/epo` returns 409 if EPO already exists
2. **EPO validity** — `isEPO: true` permits are issued once; system marks expat as "departed"
3. **Permit forExpat/forFamily separation** — API validates the permit type is allowed for the entity type
4. **Expiry urgency** — `isOneTime: true` permits are excluded from urgent/expiring-soon counts
5. **Renewal chain** — `renewedFromId` on ExpatPermit/FamilyPermit links to the previous permit

## History Logging

Every CREATE, UPDATE, DELETE on Expatriate/ExpatPermit/ExpatFamily/FamilyPermit writes a history record.

`diffChanges(before, after)` (from `_helpers.js`) produces:
```json
{ "fieldName": { "before": "old value", "after": "new value" } }
```

For CREATE, history stores `{ "snapshot": { ...full object } }`.

History tables: `ExpatHistory`, `ExpatPermitHistory`, `ExpatFamilyHistory`, `FamilyPermitHistory`

## Passport Management

Current passport data lives on `Expatriate` / `ExpatFamily` directly:
- `passportNo`, `passportIssuedDate`, `passportExpiryDate`, `passportScanUrl`

When passport is renewed (`POST /api/expatriate/[id]/passport/renew`), the old data is archived to `ExpatPassportHistory` (or `FamilyPassportHistory` for family members).

## File Uploads

Upload routes accept `multipart/form-data`.  
Files are saved to `public/uploads/` and served via `/api/uploads/[...slug]`.

| Field | Storage path |
|-------|-------------|
| Expat photo | `public/uploads/expat/{id}-photo.{ext}` |
| Expat passport scan | `public/uploads/expat/{id}-passport.{ext}` |
| Permit scan | `public/uploads/expat-permit/{permitId}.{ext}` |

Upload helpers: `app/api/expatriate/_upload-helpers.js`

## Data Flow: Adding a New Expat

1. `POST /api/expatriate` — create expat record
2. `POST /api/expatriate/[id]/photo` — upload photo
3. `POST /api/expatriate/[id]/passport-scan` — upload passport scan
4. `POST /api/expatriate/[id]/permits` — add each permit (KITAS, MERP, etc.)
5. `POST /api/expatriate/[id]/family` — add family members
6. Family permits: `POST /api/expatriate/[id]/family/[familyId]/permits` (under family sub-routes)

## Renewal Flow

1. `POST /api/expatriate/[id]/permits` with new permit data, set `renewedFromId` to old permit ID
2. Old permit status updated to `"renewed"`
3. New permit starts fresh with `status: "active"`
