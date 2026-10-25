# MatterPackr Archive Backend

MatterPackr uses a clean, modular multi-engine backend architecture:

## 1. Engine Responsibilities

- **ZIP Engine (`backend::zip`)**:
  - Full read, write, create, add, remove, test, and extract.
  - AES-256 password encryption support.
- **7Z Engine (`backend::sevenz`)**:
  - Full read, write, create, add, remove, test, and extract.
  - AES-256 password encryption support.
- **Libarchive Engine (`backend::libarchive`)**:
  - Full support for TAR, TAR.GZ / TGZ, TAR.BZ2 / TBZ2, TAR.XZ / TXZ, TAR.ZST.
  - Single-file compression streams: GZ and BZ2.
  - Extraction and inspection for ISO (ISO 9660 / Joliet / RockRidge / UDF), IMG, CAB, CPIO, and AR.
- **RARLabs unRAR Engine (`backend::unrar`)**:
  - Read, inspect, test, and extract for RAR archives (.rar).
  - Password decryption support.

## 2. Capabilities Summary

| Format | Engine | Open / Inspect | Extract | Create | Add / Remove | Test | Single-entry View | Password Support |
|---|---|---|---|---|---|---|---|---|
| **ZIP** | zip crate | Yes | Yes | Yes | Yes | Yes | Yes | Yes (AES-256 Encrypt & Decrypt) |
| **7Z** | sevenz-rust2 | Yes | Yes | Yes | Yes | Yes | Yes | Yes (AES-256 Encrypt & Decrypt) |
| **TAR / TAR.GZ** | libarchive | Yes | Yes | Yes | Yes | Yes | Yes | N/A |
| **GZ** | libarchive | Yes | Yes | Yes (1 file) | Yes (1 file) | Yes | Yes | N/A |
| **RAR** | RARLabs unRAR | Yes | Yes | No | No | Yes | Yes | Yes (Decrypt) |
| **TAR.BZ2 / TAR.XZ / TAR.ZST** | libarchive | Yes | Yes | No | No | Yes | Yes | N/A |
| **BZ2** | libarchive | Yes | Yes | No | No | Yes | Yes | N/A |
| **CAB / ISO / IMG / CPIO / AR** | libarchive | Yes | Yes | No | No | Yes | Yes | N/A |

## 3. Architecture Notes

All ad-hoc binary parsing code has been completely removed. Backend operations are dispatched cleanly through `matterpackr_lib::backend` and invoked by Tauri handlers in `lib.rs`. Formats other than ZIP, 7Z, TAR, and GZ operate in read-only mode (Open, Extract, Inspect, Test, Single-entry View, and Password support where applicable).
