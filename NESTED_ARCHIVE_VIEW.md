# Nested archive view

MatterPackr now renders archive contents as a file-manager-style tree instead of a flat list.

- Directory entries are shown as expandable folders.
- Nested files are indented beneath their parent directories.
- Folders are collapsed by default and can be expanded/collapsed with disclosure buttons or by double-clicking the folder name.
- Archives that do not explicitly store directory entries still get inferred folders from their file paths.
- Search keeps matching descendants visible and automatically expands the necessary parent folders.
- Selection uses the full archive path, so nested entries can be selected and removed safely.
- Sorting is applied recursively within each directory while directories remain grouped above files.
