# Doctor Survey (ডাক্তার কই) - Android Field Data Collection App

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2057-black.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB.svg)](https://reactnative.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-expo--sqlite-003B57.svg)](https://docs.expo.dev/versions/latest/sdk/sqlite/)
[![Offline First](https://img.shields.io/badge/Offline-First-success.svg)](#offline-first-architecture)

A production-quality, offline-first Android field data collection application built with **React Native**, **Expo SDK 57**, **TypeScript**, and **Expo Router**. Designed specifically for field surveyors in Bangladesh to photograph doctor visiting cards, medical establishment banners, and signboards, extract bilingual Bangla and English text via OCR, capture high-precision GPS coordinates, detect duplicates, and manage relational records locally on the device.

---

## Table of Contents

- [Core Architectural Principles](#core-architectural-principles)
- [Key Features](#key-features)
- [Screens and User Workflows](#screens-and-user-workflows)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Bangla and English OCR Configuration](#bangla-and-english-ocr-configuration)
  - [1. Google Cloud Vision API](#1-google-cloud-vision-api)
  - [2. Secure Gateway (Recommended for Teams)](#2-secure-gateway-recommended-for-teams)
  - [3. Mock Vision Provider (Offline Demo)](#3-mock-vision-provider-offline-demo)
- [Database & Storage Architecture](#database--storage-architecture)
- [Backup and Restore Subsystem](#backup-and-restore-subsystem)
- [Building the Android APK](#building-the-android-apk)
  - [Option A: EAS Cloud Build (Recommended)](#option-a-eas-cloud-build-recommended)
  - [Option B: Local Android Build (CNG)](#option-b-local-android-build-cng)
- [Automated Tests and Verification](#automated-tests-and-verification)
- [Limitations and Considerations](#limitations-and-considerations)
- [License](#license)

---

## Core Architectural Principles

1. **Local Device is Single Source of Truth**: There is no mandatory backend, Directus, or cloud user account. All survey records, doctor profiles, chamber schedules, and original photographs live permanently inside the local device storage.
2. **Offline-First Resilience**: An internet connection is never required to start, draft, edit, review, or save a survey. Network-dependent features (OCR, online map tiles, reverse geocoding) degrade gracefully without blocking the data collection pipeline.
3. **Photograph Immutability**: Captured photos are permanently copied to `${documentDirectory}photos/` and stored as clean relative paths in SQLite. Original image files are never destructively overwritten, cropped, or compressed.
4. **Bilingual Unicode Preservation**: Doctor names, addresses, notes, and OCR transcripts preserve native Bengali Unicode script (`ডাঃ`, `রফিকুল`, `০-৯`) without double-encoding, garbled characters, or loss of diacritics.
5. **Lossless Backup & Restore**: Exported JSON packages embed full Base64 binary payloads for every photograph, allowing complete state migration to a new device without missing media assets.
6. **Multi-Factor Duplicate Prevention**: Real-time warnings when a phone number, BMDC registration number, doctor name, facility name, or GPS coordinate (within 100 meters) matches an existing record.

---

## Key Features

- **Relational SQLite Engine**: High-performance SQLite database (`doctor_survey.db`) managing doctors, healthcare facilities, doctor-facility chamber associations, surveys, photos, and OCR logs with foreign keys and compound indexes.
- **Bilingual OCR Subsystem**: OCR integration supporting Google Cloud Vision (`DOCUMENT_TEXT_DETECTION`), secure enterprise proxy gateways, and a deterministic mock provider.
- **Deterministic Field Extractor**: Regex-based heuristic parser capable of converting Bengali numerals (`০-৯` to `0-9`), identifying Bangladeshi mobile numbers (`013-019`), parsing BMDC registration numbers (`A-XXXXX`), detecting qualifications (`MBBS`, `FCPS`, etc.), identifying visiting hours, and extracting fees.
- **High-Accuracy GPS & Geographic System**: Capture coordinates with accuracy tracking (`<= 30m` threshold highlighted), reverse geocoding to prefill District/Division, and built-in database of all 8 Divisions and 64 Districts of Bangladesh.
- **Full Backup & Export Engine**:
  - **Complete Base64 JSON**: Entire SQLite database plus all photo binaries embedded as Base64 strings.
  - **ZIP Archive**: `survey_backup.json` metadata bundled alongside raw JPEG/PNG image files using `jszip`.
  - **Multi-Table CSV Exports**: Generates individual CSVs for `Surveys`, `Doctors`, `Facilities`, `Chamber_Schedules`, and `Photos` with `\uFEFF` UTF-8 BOM for native rendering in Microsoft Excel.
  - **Dual Restore Modes**: Supports non-destructive **Merge** mode (skips duplicate UUIDs) and **Replace All** mode (with transaction rollback safety).

---

## Screens and User Workflows

### 1. Dashboard (`/`)
- Real-time statistics computed directly from SQLite:
  - Total Surveys, Total Doctors, Total Facilities
  - Surveys Created Today, Surveys with OCR Completed, Surveys with Missing GPS
  - Device photo storage footprint (photo count and total disk megabytes)
- Quick action shortcuts: New Survey, View Surveys, Map View, Export Backup
- Feed of recently created surveys with status badges and quick navigation

### 2. New Survey Workflow (`/new-survey`)
- **Step 1: Survey Type Selection**: Doctor, Chamber, Clinic, Hospital, Diagnostic Center, Pharmacy, Other.
- **Step 2: Camera & Photo Management**: Capture new photo or pick from gallery, categorize photo (Visiting Card, Chamber Banner, Facility Signboard, Prescription, Facility Exterior, Other), preview full-screen, or add multiple photos.
- **Step 3: OCR Processing**: 1-tap extraction with real-time loading feedback, error recovery, and raw text preview.
- **Step 4: Structured Data Review & Editing**: Autofills Doctor Name (Bangla & English), Qualifications, Specialization, BMDC Number, Phone Numbers, Facility Name, Address, Division, District, Upazila, Schedule, Fee. Every field is editable.
- **Step 5: GPS Location**: 1-tap coordinate capture showing latitude, longitude, and accuracy in meters.
- **Step 6: Duplicate Warning**: Alerts user if matching doctor, facility, phone, or location (within 100m) already exists in the database.
- **Step 7: Draft or Complete Save**: Incomplete surveys can be saved as a draft at any time.

### 3. Survey History (`/surveys`)
- Real-time search across Doctor Name, Facility Name, BMDC Number, Phone, and Address (supports both Bangla and English text).
- Filters for facility types and completion status (`Draft` vs `Completed`).
- Sort by Creation Date, Doctor Name, or Facility Name.
- Actions: View Details, Edit Survey, Delete Survey (with photo cleanup confirmation).

### 4. Interactive Map View (`/map`)
- Visualizes all surveyed locations across Bangladesh using `react-native-maps`.
- Color-coded pins based on facility type with custom callouts showing doctor name, facility name, and survey count.
- Filter map pins by facility type (Hospital, Clinic, Diagnostic Center, Pharmacy, Chamber).
- Offline / No-Google-Play fallback toggle displaying an accessible list of geolocated surveys sorted by distance.

### 5. Export & Backup Screen (`/export`)
- Real-time backup package generator with live progress indicator.
- Export options:
  - **Complete JSON Backup**: Full database records + Base64 encoded photos.
  - **ZIP Archive Backup**: Structured JSON + raw image files.
  - **Spreadsheet CSV Exports**: 5 separate CSV files with UTF-8 BOM for desktop Excel.
- Import Backup tool: Select `.json` backup file via `expo-document-picker`.
- Choose between **Merge** mode or **Replace All** mode.

### 6. Settings Screen (`/settings`)
- Configure OCR Provider: **Mock Simulation**, **Google Cloud Vision**, or **Custom Secure Gateway**.
- Enter and save Google Cloud Vision API Key securely in SQLite `app_settings`.
- Configure Custom Gateway endpoint URL and request timeout (default: 30,000 ms).
- **Seed Demo Data**: Populate database with realistic surveys from Dhanmondi, Mirpur, and Uttara.
- **Wipe All Data**: Purge SQLite database and delete stored photo files with confirmation.

### 7. Survey Detail (`/survey/[id]`) & Edit (`/survey/edit/[id]`)
- Comprehensive overview of all structured fields, associated doctor details, chamber schedules, and location coordinates.
- Photo gallery with full-resolution viewer and modal to view raw extracted OCR text.
- Full edit capability that preserves original photos and relational integrity.

---

## Technology Stack

| Category | Package | Version / Purpose |
| :--- | :--- | :--- |
| **Framework** | `react-native` | `0.86.3` / Core mobile runtime |
| **Toolchain** | `expo` | `~57.0.30` / Mobile platform framework |
| **Routing** | `expo-router` | `^5.0.0` / File-based typed navigation |
| **Database** | `expo-sqlite` | Local relational database engine |
| **Camera & Media** | `expo-camera`, `expo-image-picker` | Native camera capture and gallery selection |
| **Storage** | `expo-file-system` | Persistent document storage and Base64 stream processing |
| **Location** | `expo-location` | High-accuracy GPS location and reverse geocoding |
| **Maps** | `react-native-maps` | Native Google Maps rendering on Android |
| **Backup / Share** | `expo-sharing`, `expo-document-picker`, `jszip` | System share sheet, document picker, ZIP packaging |
| **Icons & Fonts** | `@expo/vector-icons`, `expo-font` | Vector iconography and typography |

---

## Project Structure

```
survey-app-daktar-koi/
├── app/                              # Expo Router file-based screens
│   ├── (tabs)/
│   │   ├── _layout.tsx               # Bottom tabs navigation configuration
│   │   ├── index.tsx                 # Dashboard screen
│   │   ├── new-survey.tsx            # Multi-step survey workflow
│   │   ├── surveys.tsx               # Survey history list & search
│   │   ├── map.tsx                   # Map visualization & list fallback
│   │   ├── export.tsx                # Export, backup, and restore screen
│   │   └── settings.tsx              # OCR settings, API keys, seed data
│   ├── survey/
│   │   ├── [id].tsx                  # Survey detail view & raw OCR viewer
│   │   └── edit/[id].tsx             # Survey edit screen
│   ├── _layout.tsx                   # Root layout & SQLite schema initialization
│   └── +not-found.tsx                # 404 handler
├── src/
│   ├── components/                   # Modular, reusable UI components
│   │   ├── common/                   # Header, Button, Input, SelectModal, ConfirmModal, Badge, StatCard
│   │   ├── survey/                   # SurveyCard, PhotoManager, LocationSection, OcrReviewSection, DuplicateAlert
│   │   └── map/                      # SurveyMap (react-native-maps) & SurveyMapFallback
│   ├── constants/
│   │   ├── bangladeshGeo.ts          # All 8 BD Divisions & 64 Districts in Bangla and English
│   │   ├── colors.ts                 # High-contrast medical UI color scheme
│   │   └── surveyTypes.ts            # Type definitions, photo categories, status enums
│   ├── database/
│   │   ├── index.ts                  # Database singleton connection & schema migrations
│   │   ├── migrations.ts             # DDL scripts with foreign keys and compound indexes
│   │   ├── seedData.ts               # Realistic Bangladesh demo dataset
│   │   └── repositories/             # Typed SQLite CRUD repositories
│   │       ├── surveyRepository.ts   # Survey transactions & dashboard stats calculation
│   │       ├── doctorRepository.ts   # Doctor profile management
│   │       ├── facilityRepository.ts # Facility profile management
│   │       ├── doctorFacilityRepository.ts # Chamber schedule associations
│   │       ├── photoRepository.ts    # Photo metadata management
│   │       ├── ocrRepository.ts      # OCR log entries
│   │       └── settingsRepository.ts # App configurations
│   ├── hooks/                        # Custom React hooks
│   │   ├── useDashboard.ts           # Dashboard statistics subscriber
│   │   ├── useSurveys.ts             # Survey filtering, search, and deletion hook
│   │   ├── useCameraCapture.ts       # Camera and gallery selection hook
│   │   ├── useLocationCapture.ts     # GPS capture and reverse geocoding hook
│   │   └── useOCR.ts                 # OCR execution and extraction hook
│   ├── services/
│   │   ├── backup/                   # Backup & export services
│   │   │   ├── exportService.ts      # Base64 JSON, ZIP, and CSV exporters
│   │   │   ├── importService.ts      # Validation, Merge & Replace restore engines
│   │   │   └── csvExporter.ts        # UTF-8 BOM formatted multi-table CSV generator
│   │   ├── duplicate/
│   │   │   └── duplicateDetector.ts  # Phone, BMDC, Name, and GPS duplicate matcher
│   │   ├── location/
│   │   │   └── locationService.ts    # GPS coordinate grabber with accuracy indicator
│   │   ├── ocr/
│   │   │   ├── types.ts              # OCR provider interfaces
│   │   │   ├── ocrService.ts         # OCR coordinator & file loader
│   │   │   ├── structuredExtractor.ts# Deterministic Bangla/English regex field extractor
│   │   │   ├── googleVisionProvider.ts# Google Cloud Vision REST client
│   │   │   ├── customGatewayProvider.ts# Secure proxy gateway client
│   │   │   └── mockVisionProvider.ts # Deterministic offline testing provider
│   │   └── storage/
│   │       └── fileStorage.ts        # Photo file operations & Base64 stream encoder
│   ├── types/
│   │   └── index.ts                  # Domain models, database DTOs, backup payloads
│   └── utils/
│       ├── uuid.ts                   # Pure RFC4122 v4 UUID generator
│       ├── geo.ts                    # Pure Haversine distance calculator
│       └── backupValidation.ts       # Strict JSON backup schema validator
├── test/
│   ├── critical.test.ts              # Unit tests for OCR, Regex, Geo, UUID, and Backup integrity
│   └── setup.js                      # Test runner environment setup
├── app.json                          # Expo configuration & Android permissions
├── package.json                      # Project dependencies & scripts
└── tsconfig.json                     # Strict TypeScript configuration
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended, Node 20+ tested)
- npm or bun
- Android device or Android Studio Emulator (with Google Play Services)
- [Expo Go](https://expo.dev/go) or an Expo Development Build (`npx expo run:android`)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/survey-app-daktar-koi.git
cd survey-app-daktar-koi

# Install dependencies using SDK-compatible versions
npm install
```

### Starting the Development Server

```bash
# Start Metro bundler
npx expo start
```

Press `a` in the terminal to open on a connected Android device or emulator.

---

## Bangla and English OCR Configuration

The application provides a pluggable OCR architecture. You can switch providers at runtime directly from **Settings > OCR Provider**.

### 1. Google Cloud Vision API

Direct integration with Google Cloud Vision's `DOCUMENT_TEXT_DETECTION` endpoint:

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Cloud Vision API**.
3. Create an API Key under **APIs & Services > Credentials**.
4. In the mobile app, go to **Settings > OCR Configuration**.
5. Select **Google Cloud Vision** as the provider and paste your API key.
6. The key is saved locally in SQLite (`app_settings`) and is never committed to git.

### 2. Secure Gateway (Recommended for Teams)

To avoid distributing raw Google Cloud API keys inside field surveyor devices, you can point the app to a simple backend proxy gateway:

```
[Survey App]  ---> HTTPS POST (Base64 Image) ---> [Your Secure Gateway] ---> [Google Cloud Vision API]
```

1. Deploy a lightweight proxy endpoint (e.g., Express, Cloudflare Worker, FastAPI) that holds your Google Cloud Vision Service Account or API Key.
2. The proxy must accept:
   ```json
   POST /api/ocr
   Content-Type: application/json
   {
     "imageBase64": "...",
     "mimeType": "image/jpeg"
   }
   ```
3. And return:
   ```json
   {
     "rawText": "Extracted text here...",
     "confidence": 0.95
   }
   ```
4. In the app, select **Custom Secure Gateway** in Settings and enter your gateway URL (e.g., `https://ocr.example.com/api/ocr`).

### 3. Mock Vision Provider (Offline Demo)

If you have no internet access or API key:
1. Select **Mock Provider (Offline Testing)** in Settings.
2. When you run OCR on any photograph, it deterministically simulates realistic Bangla and English visiting card extraction (Dr. Rafiqul Islam, MBBS, FCPS, Dhanmondi Clinic).
3. Ideal for testing field validation, duplicate detection, and form completion offline.

---

## Database & Storage Architecture

### SQLite Schema

The local relational schema consists of 7 normalized tables:

1. **`doctors`**: Holds doctor names in Bangla & English, qualifications, specialization, BMDC registration number, primary phone, and notes.
2. **`facilities`**: Holds facility names in Bangla & English, facility type, division, district, upazila, address, phone numbers, and coordinates.
3. **`doctor_facilities`**: Junction table mapping doctors to facilities, consultation fees, visiting days, and time ranges.
4. **`surveys`**: Master survey records linking surveyor ID, survey type, status (`draft` / `completed`), notes, and GPS capture metadata (latitude, longitude, accuracy).
5. **`survey_photos`**: Relative photo file paths (`photos/{id}.jpg`), photo category, MIME type, file size, capture timestamp, and OCR status.
6. **`survey_ocr_results`**: Full raw OCR transcript, structured extraction JSON payload, confidence score, and processing timestamp.
7. **`app_settings`**: Key-value settings store for OCR provider, API keys, and gateway URLs.

### Persistent Photo Storage

- When a photo is taken or selected from the gallery, it is immediately copied to the app's persistent document directory: `${documentDirectory}photos/${photoId}.jpg`.
- The database references only the relative path `photos/${photoId}.jpg`, making the database immune to app container UUID changes across iOS/Android OS updates.
- If a survey is deleted, associated photo files are safely unlinked from disk.

---

## Backup and Restore Subsystem

### 1. Complete JSON Backup (with Base64 Photos)

- Exports every row from all 6 relational tables (`surveys`, `doctors`, `facilities`, `doctor_facilities`, `survey_photos`, `survey_ocr_results`).
- Every photograph is read from disk, converted to a Base64 string, and embedded into the JSON structure under `photos[].base64Data`.
- Restoring from this single JSON file completely recreates the SQLite database and reconstitutes all physical image files in the persistent storage directory.

### 2. ZIP Backup

- Generates an uncompressed/compressed ZIP archive containing:
  - `backup_data.json`: All relational records.
  - `photos/`: The physical binary `.jpg`/`.png` image files.

### 3. CSV Multi-Table Export

- Generates 5 distinct CSV files:
  - `surveys.csv`
  - `doctors.csv`
  - `facilities.csv`
  - `doctor_facilities.csv`
  - `survey_photos.csv`
- Prefixed with `\uFEFF` (UTF-8 Byte Order Mark) to ensure Excel on Windows and macOS correctly renders Bangla Unicode characters.

### 4. Restore Modes

- **Merge Mode**: Adds records that do not already exist in the database (matching by UUID). Skips existing records to prevent accidental overwrites.
- **Replace All Mode**: Drops all existing survey data and photos, and restores the backup state cleanly within a single atomic database transaction.

---

## Building the Android APK

### Option A: EAS Cloud Build (Recommended)

EAS Build compiles an installable Android APK without needing local Android Studio:

```bash
# 1. Install EAS CLI globally (if not already installed)
npm install -g eas-cli

# 2. Log in to your Expo account
eas login

# 3. Configure EAS project
eas build:configure

# 4. Build a standalone APK for testing on physical devices
eas build -p android --profile preview
```

When the build finishes, EAS provides a direct download link and QR code to install the APK directly onto field surveyors' Android devices.

### Option B: Local Android Build (CNG)

If you have Android Studio and the Android SDK configured locally:

```bash
# 1. Generate native android/ directory using Continuous Native Generation
npx expo prebuild --platform android

# 2. Build and run the release APK directly
npx expo run:android --variant release
```

---

## Automated Tests and Verification

The project includes unit tests verifying critical mathematical, parsing, and data integrity operations:

```bash
# Run unit tests
npm test
```

### Test Suite Coverage (`test/critical.test.ts`):
1. **Bengali Digits Conversion**: Converts `০১২৩৪৫৬৭৮৯` to `0123456789`.
2. **Bangladeshi Phone Normalization**: Normalizes `+8801712345678`, `01712-345678`, and Bengali-digit phone numbers into clean `01XXXXXXXXX` strings.
3. **Bangla Doctor Visiting Card Extraction**: Regex heuristics correctly identify doctor title (`ডাঃ`), BMDC number (`A-45678`), qualifications (`MBBS, FCPS`), visiting fee (`৮০০`), and phone numbers.
4. **English Clinic Signboard Extraction**: Correctly identifies facility name, hotline phone number, and address from signboard text.
5. **Haversine Distance Calculation**: Accurately computes geographic distance in meters between GPS coordinates.
6. **Backup Schema Validation**: Verifies JSON backup integrity and rejects corrupted payloads.
7. **UUID v4 RFC4122 Generator**: Ensures uniqueness and format compliance.
8. **Base64 Image Encoding/Decoding**: Verifies binary preservation across encode-decode cycles.
9. **Bangla Unicode String Preservation**: Confirms JSON serialization and parsing does not corrupt Bengali Unicode code points.

### Static Analysis & Type Checking

```bash
# TypeScript strict type check
npx tsc --noEmit

# ESLint check
npx eslint .
```

---

## Limitations and Considerations

1. **OCR Requires Network**: Google Cloud Vision and Custom Gateway require active internet during OCR execution. If surveyors are in remote areas without internet, they can photograph the card, save the survey as a draft, and run OCR or enter data manually offline.
2. **Online Map Tiles**: `react-native-maps` requires internet connectivity to load Google Maps vector tiles. An offline list fallback is provided on the Map screen so surveyors can always view all collected facilities sorted by distance without an active connection.
3. **Reverse Geocoding**: Address lookup via `expo-location` requires internet. If offline, the surveyor can manually select the Division and District from the searchable picker containing all 64 districts.
4. **Android Native Modules**: Features like the camera and native maps require native permissions (`CAMERA`, `ACCESS_FINE_LOCATION`). For full hardware access, always run on a physical Android device or development build.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

