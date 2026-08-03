# Database Schema

Provider: SQL Server (`172.16.128.221:1433`, database: `lpe_hub`)  
ORM: Prisma v6, client at `app/generated/prisma`  
Apply changes: `npx prisma db push` (NOT migrate dev — no shadow DB permission)

## Core Models

### User
```
id          String    cuid, PK
name        String
email       String    unique
password    String    bcrypt(12)
role        String    default "employee"  → "admin" | "employee" | "expatriate_admin"
createdAt   DateTime  default now()
deletedAt   DateTime? null = active, set = soft-deleted
```
Relations: `todos[]`, `notes[]`

### Todo
```
id          String    cuid, PK
text        String
done        Boolean   default false
createdAt   DateTime  default now()
userId      String    FK → User (cascade delete)
```

### Note
```
id          String    cuid, PK
title       String
desc        String?   NVarChar(Max)
done        Boolean   default false
createdAt   DateTime  default now()
userId      String    FK → User (cascade delete)
```
Relations: `progress[]`

### Progress
```
id          String    cuid, PK
act         String    NVarChar(Max)
tglAct      DateTime?
status      String    default "Plan"   → "Plan" | "On Progress" | "Done"
createdAt   DateTime  default now()
noteId      String    FK → Note (cascade delete)
```
Relations: `feedbacks[]`

### Feedback
```
id          String    cuid, PK
text        String    NVarChar(Max)
tglFeedback DateTime?
createdAt   DateTime  default now()
progressId  String    FK → Progress (cascade delete)
```

## Expatriate Module Models

### PermitType (master data)
```
id                 String    cuid, PK
name               String    unique
description        String?   NVarChar(Max)
forExpat           Boolean   default true   — show in expat permit dropdowns
forFamily          Boolean   default true   — show in family permit dropdowns
hasExpiry          Boolean   default true   — whether expiryDate is required/shown
isOneTime          Boolean   default false  — issued once; expired but not re-issued (e.g. eVisa)
isEPO              Boolean   default false  — one per person; marks departure/permit closure
linkedToWorkPermit Boolean   default false
order              Int       default 0      — display sort order
createdAt          DateTime  default now()
updatedAt          DateTime  @updatedAt
```

### Expatriate
```
id                 String    cuid, PK
name               String
birthPlace         String
birthDate          DateTime
gender             String    "M" | "F"
passportNo         String
passportIssuedDate DateTime
passportExpiryDate DateTime
position           String
department         String
presentAddress     String    NVarChar(Max)
permanentAddress   String    NVarChar(Max)
arrivalDate        DateTime
renewalNo          Int?      permit renewal count
photoUrl           String?   NVarChar(500)  relative path e.g. /uploads/expat/xxx.jpg
passportScanUrl    String?   NVarChar(500)
createdAt          DateTime  default now()
updatedAt          DateTime  @updatedAt
```
Relations: `permits[]`, `families[]`, `histories[]`, `passportHistories[]`

### ExpatPermit
```
id             String    cuid, PK
expatId        String    FK → Expatriate (cascade delete)
permitTypeId   String    FK → PermitType
number         String    permit document number
issuedDate     DateTime
expiryDate     DateTime? null when hasExpiry=false or isOneTime
status         String    default "active"  → "active" | "expired" | "renewed"
renewedFromId  String?   self-reference for renewal chain
scanUrl        String?   NVarChar(500)
createdAt      DateTime  default now()
updatedAt      DateTime  @updatedAt
```
Relations: `histories[]`

### ExpatFamily
```
id                 String    cuid, PK
expatId            String    FK → Expatriate (cascade delete)
name               String
gender             String
birthPlace         String
birthDate          DateTime
passportNo         String
passportIssuedDate DateTime
passportExpiryDate DateTime
familyStatus       String    "Wife" | "Husband" | "Child"
arrivalDate        DateTime
photoUrl           String?   NVarChar(500)
passportScanUrl    String?   NVarChar(500)
createdAt          DateTime  default now()
updatedAt          DateTime  @updatedAt
```
Relations: `permits[]`, `histories[]`, `passportHistories[]`

### FamilyPermit
```
id            String    cuid, PK
familyId      String    FK → ExpatFamily (cascade delete)
permitTypeId  String    FK → PermitType
number        String
issuedDate    DateTime
expiryDate    DateTime?
status        String    default "active"
renewedFromId String?
scanUrl       String?   NVarChar(500)
createdAt     DateTime  default now()
updatedAt     DateTime  @updatedAt
```
Relations: `histories[]`

## History Tables

All history tables record every CREATE/UPDATE/DELETE operation.

| Table | Tracks changes to |
|-------|-------------------|
| ExpatHistory | Expatriate |
| ExpatPermitHistory | ExpatPermit |
| ExpatFamilyHistory | ExpatFamily |
| FamilyPermitHistory | FamilyPermit |
| ExpatPassportHistory | Passport replacements (Expatriate) |
| FamilyPassportHistory | Passport replacements (ExpatFamily) |

Common history columns:
```
id        String    cuid, PK
action    String    "CREATE" | "UPDATE" | "DELETE"
changes   String    NVarChar(Max) — JSON: { field: { before, after } } or { snapshot: {...} }
changedAt DateTime  default now()
changedBy String    User.id (no FK constraint, intentional)
```

Passport history columns (ExpatPassportHistory / FamilyPassportHistory):
```
passportNo  String
issuedDate  DateTime
expiryDate  DateTime
scanUrl     String?
replacedAt  DateTime  default now()
replacedBy  String    User.id
```

## Relationship Diagram

```
User ──┬── Todo[]
       └── Note[] ── Progress[] ── Feedback[]

Expatriate ──┬── ExpatPermit[] ──── PermitType
             ├── ExpatFamily[] ──── FamilyPermit[] ── PermitType
             ├── ExpatHistory[]
             ├── ExpatPassportHistory[]
             └─ (via ExpatFamily) FamilyPassportHistory[]

ExpatPermit ── ExpatPermitHistory[]
ExpatFamily ── ExpatFamilyHistory[]
FamilyPermit ── FamilyPermitHistory[]
```

## Conventions
- All PKs use `cuid()` (not autoincrement)
- Cascade deletes on all child relationships
- `NVarChar(Max)` for free-text fields (SQL Server specific)
- `NVarChar(500)` for URL/path fields
- No hard deletes on User (soft delete via `deletedAt`)
