# MatterPackr Archive Capability Model

MatterPackr keeps archive-format capabilities in one Rust catalog (`format_catalog()`). The frontend loads that catalog at startup through `format_catalog_command` instead of maintaining independent format lists for creation, encryption, empty-state messaging, and file associations.

Each format declares:

- create
- open / inspect
- add
- remove
- extract
- test
- single-entry view
- password support (encryption / decryption)
- single-file-only behavior
- implementation status

Only **ZIP**, **7Z**, **TAR**, and **GZ** support create, open, extract, inspect, add, remove, test, and single-entry view capabilities. Other supported formats (including RAR, BZ2, TAR.BZ2, TAR.XZ, TAR.ZST, CAB, ISO, IMG, CPIO, AR) provide open, extract, inspect, test, single-entry view, and password support only.

Planned formats are represented in the catalog with `implemented: false`; they are not advertised to the backend as currently extractable until their reader/extractor is implemented.
