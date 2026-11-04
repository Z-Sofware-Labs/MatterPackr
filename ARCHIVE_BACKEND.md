# MatterPackr Archive Backend

MatterPackr uses a clean, modular multi-engine backend architecture:

## 1. Engine Responsibilities

- **ZIP Engine (`backend::zip`)**:
  - Full read, write, create, add, remove, test, and extract.
  - AES-256 password encryption support.
- **7Z Engine (`native-qt` libarchive + 7-Zip SDK)**:
  - libarchive provides native 7Z creation, listing, extraction, testing,
    adding, and removal.
  - The pinned 7-Zip SDK is used only for password-protected 7Z creation.
  - Add/remove use secure temporary rebuilds and atomic replacement.
  - Password support uses in-process callbacks and never passes passwords
    through command-line arguments.
- **Libarchive Engine (`backend::libarchive`)**:
  - Full support for TAR and TAR.GZ / TGZ.
  - Single-file compression stream: GZ.
  - Extraction and inspection for ISO (ISO 9660 / Joliet / RockRidge / UDF), IMG, CAB, CPIO, and AR.
- **RARLabs unRAR Engine (planned native component)**:
  - The existing Python backend has an UnRAR handler.
  - Native Qt integration remains pending and must provide read, inspect, test,
    and extract only.
  - Redistribution requires preserving the UnRAR license and attribution.

## 2. Capabilities Summary

| Format | Engine | Open / Inspect | Extract | Create | Add / Remove | Test | Single-entry View | Password Support |
|---|---|---|---|---|---|---|---|---|
| **ZIP** | libarchive | Yes | Yes | Yes | Yes (unencrypted) | Yes | Yes | Create AES-256 encrypted ZIP |
| **7Z** | libarchive + 7-Zip SDK | Yes | Yes | Yes | Yes (unencrypted) | Yes | Yes | Create encrypted 7Z |
| **TAR / TAR.GZ** | libarchive | Yes | Yes | Yes | Yes | Yes | Yes | N/A |
| **GZ** | libarchive | Yes | Yes | Yes (1 file) | Yes (1 file) | Yes | Yes | N/A |
| **RAR** | Native UnRAR (planned) | No | No | No | No | No | No | Planned |
| **CAB / ISO / IMG / CPIO / AR** | libarchive | Yes | Yes | No | No | Yes | Yes | N/A |

## 3. Architecture Notes

All ad-hoc binary parsing code has been completely removed. Backend operations are dispatched through the native Qt archive backend. Formats other than ZIP, 7Z, TAR, and GZ operate in read-only mode (Open, Extract, Inspect, Test, and Single-entry View).
