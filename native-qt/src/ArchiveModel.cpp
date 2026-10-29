#include "ArchiveModel.h"
#include <QFileInfo>
#include <QFileIconProvider>

ArchiveModel::ArchiveModel(QObject *parent)
    : QAbstractTableModel(parent) {}

int ArchiveModel::rowCount(const QModelIndex &parent) const {
    if (parent.isValid()) return 0;
    return m_items.size();
}

int ArchiveModel::columnCount(const QModelIndex &parent) const {
    if (parent.isValid()) return 0;
    return ColumnCount;
}

QVariant ArchiveModel::data(const QModelIndex &index, int role) const {
    if (!index.isValid() || index.row() >= m_items.size() || index.row() < 0) {
        return QVariant();
    }

    const ArchiveItem &item = m_items.at(index.row());

    if (role == Qt::DisplayRole) {
        if (item.filename == "..") {
            switch (index.column()) {
                case ColFilename: {
                    static const QString s_dots = QStringLiteral("..");
                    return s_dots;
                }
                case ColType:     return tr("Parent Folder");
                default:          return QVariant();
            }
        }

        switch (index.column()) {
            case ColFilename:   return item.filename;
            case ColType:       return item.isDirectory ? tr("Folder") : item.type;
            case ColModified:
                if (item.formattedModified.isEmpty()) {
                    item.formattedModified = item.modified.isValid() ? item.modified.toString("yyyy-MM-dd hh:mm AP") : QStringLiteral("-");
                }
                return item.formattedModified;
            case ColSize:
                if (item.formattedSize.isEmpty()) {
                    item.formattedSize = item.isDirectory ? (item.size > 0 ? formatBytes(item.size) : tr("<DIR>")) : formatBytes(item.size);
                }
                return item.formattedSize;
            case ColRatio:
                if (item.formattedRatio.isEmpty()) {
                    item.formattedRatio = item.isDirectory ? (item.size > 0 ? (QString::number(item.ratio) + "%") : QStringLiteral("-")) : (QString::number(item.ratio) + "%");
                }
                return item.formattedRatio;
            case ColPacked:
                if (item.formattedPacked.isEmpty()) {
                    item.formattedPacked = item.isDirectory ? (item.size > 0 ? formatBytes(item.packedSize) : QStringLiteral("-")) : formatBytes(item.packedSize);
                }
                return item.formattedPacked;
            case ColCrc32:
                if (item.formattedCrc32.isEmpty()) {
                    item.formattedCrc32 = item.isDirectory ? QStringLiteral("-") : item.crc32.toUpper();
                }
                return item.formattedCrc32;
            case ColEncryption: return item.isDirectory ? QStringLiteral("-") : (item.isEncrypted ? item.encryptionMethod : QStringLiteral("-"));
            case ColPath: {
                static const QString s_dot = QStringLiteral(".");
                return item.path.isEmpty() ? s_dot : item.path;
            }
            default:            return QVariant();
        }
    }

    if (role == Qt::TextAlignmentRole) {
        switch (index.column()) {
            case ColSize:
            case ColRatio:
            case ColPacked:
                return static_cast<int>(Qt::AlignRight | Qt::AlignVCenter);
            case ColCrc32:
            case ColEncryption:
                return static_cast<int>(Qt::AlignCenter | Qt::AlignVCenter);
            default:
                return static_cast<int>(Qt::AlignLeft | Qt::AlignVCenter);
        }
    }

    if (role == Qt::DecorationRole && index.column() == ColFilename) {
        if (item.filename == "..") {
            static QIcon s_upIcon;
            if (s_upIcon.isNull()) {
                static QFileIconProvider iconProvider;
                s_upIcon = iconProvider.icon(QFileIconProvider::Folder);
            }
            return s_upIcon;
        }

        if (item.isDirectory) {
            static QIcon s_folderIcon;
            if (s_folderIcon.isNull()) {
                static QFileIconProvider iconProvider;
                s_folderIcon = iconProvider.icon(QFileIconProvider::Folder);
            }
            return s_folderIcon;
        }

        // High-performance static extension-to-icon cache (avoids repeated file/resource I/O on scroll)
        static QHash<QString, QIcon> s_iconCache;

        // Fast extension extraction without constructing QFileInfo
        QString ext;
        const QString &fn = item.filename;
        const int dotIdx = fn.lastIndexOf('.');
        if (dotIdx != -1) {
            ext = fn.mid(dotIdx + 1).toLower();
        }

        // Check compound archive extensions
        const QString lowerName = fn.toLower();
        if (lowerName.endsWith(".tar.gz") || lowerName.endsWith(".tgz")) {
            ext = "tgz";
        } else if (lowerName.endsWith(".tar.bz2") || lowerName.endsWith(".tbz2") || lowerName.endsWith(".tbz")) {
            ext = "tbz2";
        } else if (lowerName.endsWith(".tar.xz") || lowerName.endsWith(".txz")) {
            ext = "txz";
        }

        auto it = s_iconCache.constFind(ext);
        if (it != s_iconCache.constEnd()) {
            return it.value();
        }

        auto loadCustomIcon = [](const QString &baseName) -> QIcon {
            QIcon icon(QString(":/filetypes/%1.png").arg(baseName));
            if (icon.isNull()) {
                icon = QIcon(QString(":/filetypes/%1.ico").arg(baseName));
            }
            return icon;
        };

        QIcon resolved;
        if (ext == "zip" || ext == "zipx") resolved = loadCustomIcon("zip");
        else if (ext == "7z") resolved = loadCustomIcon("7z");
        else if (ext == "rar") resolved = loadCustomIcon("rar");
        else if (ext == "tar") resolved = loadCustomIcon("tar");
        else if (ext == "tgz") resolved = loadCustomIcon("tgz");
        else if (ext == "tbz2") resolved = loadCustomIcon("tbz2");
        else if (ext == "txz") resolved = loadCustomIcon("txz");
        else if (ext == "gz" || ext == "gzip") resolved = loadCustomIcon("gz");
        else if (ext == "bz2" || ext == "bzip2") resolved = loadCustomIcon("bz2");
        else if (ext == "xz") resolved = loadCustomIcon("txz");
        else if (ext == "iso") resolved = loadCustomIcon("iso");
        else if (ext == "img" || ext == "bin") resolved = loadCustomIcon("img");
        else if (ext == "cab") resolved = loadCustomIcon("cab");
        else if (ext == "cpio") resolved = loadCustomIcon("cpio");
        else if (ext == "ar" || ext == "a") resolved = loadCustomIcon("ar");
        else if (ext == "zst" || ext == "lzma" || ext == "lzh" || ext == "ace") resolved = loadCustomIcon("archive");

        if (resolved.isNull()) {
            static QFileIconProvider iconProvider;
            resolved = iconProvider.icon(QFileInfo(item.filename));
            if (resolved.isNull()) {
                resolved = iconProvider.icon(QAbstractFileIconProvider::File);
            }
        }

        s_iconCache.insert(ext, resolved);
        return resolved;
    }

    if (role == Qt::CheckStateRole && index.column() == ColFilename) {
        if (m_showCheckboxes && item.filename != "..") {
            return item.isChecked ? Qt::Checked : Qt::Unchecked;
        }
    }

    return QVariant();
}

bool ArchiveModel::setData(const QModelIndex &index, const QVariant &value, int role) {
    if (!index.isValid() || index.row() >= m_items.size()) return false;

    if (role == Qt::CheckStateRole && index.column() == ColFilename && m_showCheckboxes) {
        m_items[index.row()].isChecked = (value.toInt() == Qt::Checked);
        emit dataChanged(index, index, {Qt::CheckStateRole});
        return true;
    }
    return false;
}

QVariant ArchiveModel::headerData(int section, Qt::Orientation orientation, int role) const {
    if (orientation == Qt::Horizontal && role == Qt::DisplayRole) {
        switch (section) {
            case ColFilename:   return tr("Filename");
            case ColType:       return tr("Type");
            case ColModified:   return tr("Modified");
            case ColSize:       return tr("Size");
            case ColRatio:      return tr("Ratio");
            case ColPacked:     return tr("Packed");
            case ColCrc32:      return tr("CRC-32");
            case ColEncryption: return tr("Encryption");
            case ColPath:       return tr("Path");
            default:            return QVariant();
        }
    }
    return QVariant();
}

Qt::ItemFlags ArchiveModel::flags(const QModelIndex &index) const {
    if (!index.isValid()) return Qt::NoItemFlags;
    Qt::ItemFlags f = Qt::ItemIsEnabled | Qt::ItemIsSelectable;
    if (m_showCheckboxes && index.column() == ColFilename) {
        f |= Qt::ItemIsUserCheckable;
    }
    return f;
}

void ArchiveModel::setShowCheckboxes(bool show) {
    if (m_showCheckboxes != show) {
        m_showCheckboxes = show;
        if (!m_items.isEmpty()) {
            emit dataChanged(index(0, ColFilename), index(m_items.size() - 1, ColFilename), {Qt::CheckStateRole});
        }
    }
}

void ArchiveModel::setViewMode(ViewMode mode) {
    if (m_viewMode != mode) {
        m_viewMode = mode;
        rebuildVisibleItems();
        emit viewModeChanged(m_viewMode);
    }
}

QString ArchiveModel::normalizePath(const QString &path) {
    QString norm = path.trimmed();
    norm.replace('\\', '/');
    while (norm.startsWith('/')) norm = norm.mid(1);
    while (norm.endsWith('/')) norm.chop(1);
    if (norm == ".") norm = "";
    return norm;
}

QString ArchiveModel::parentPath(const QString &path) {
    QString norm = normalizePath(path);
    int idx = norm.lastIndexOf('/');
    if (idx == -1) return QString();
    return norm.left(idx);
}

bool ArchiveModel::canNavigateUp() const {
    return m_viewMode == ViewMode::Explorer && !m_currentFolder.isEmpty();
}

void ArchiveModel::navigateUp() {
    if (!canNavigateUp()) return;
    setCurrentFolder(parentPath(m_currentFolder));
}

void ArchiveModel::navigateInto(const QString &subfolder) {
    if (m_viewMode != ViewMode::Explorer) return;
    QString sub = normalizePath(subfolder);
    if (sub == "..") {
        navigateUp();
        return;
    }
    QString next = m_currentFolder.isEmpty() ? sub : (m_currentFolder + "/" + sub);
    setCurrentFolder(next);
}

void ArchiveModel::setCurrentFolder(const QString &folder) {
    QString norm = normalizePath(folder);
    if (m_currentFolder != norm) {
        m_currentFolder = norm;
        rebuildVisibleItems();
        emit folderChanged(m_currentFolder);
    }
}

void ArchiveModel::rebuildVisibleItems() {
    beginResetModel();
    m_items.clear();
    m_foldersCacheDirty = true;

    if (m_viewMode == ViewMode::Classic) {
        // WinZip Classic View: Flat list of all files across the entire archive
        m_items.reserve(m_allItems.size());
        m_items = m_allItems;
    } else {
        // WinRAR / 7-Zip Explorer View: Hierarchical view for m_currentFolder
        const QString normCurrent = normalizePath(m_currentFolder);

        // Pre-reserve estimate to minimize vector re-allocations
        m_items.reserve(qMin<int>(m_allItems.size() + 1, 1024));

        // Add [..] parent directory item if not at root
        if (!normCurrent.isEmpty()) {
            ArchiveItem upItem;
            upItem.id = "__UP_ONE_LEVEL__";
            upItem.filename = "..";
            upItem.type = "Folder";
            upItem.isDirectory = true;
            upItem.path = parentPath(normCurrent);
            m_items.append(upItem);
        }

        // Structure to aggregate directory statistics in a single pass
        struct FolderStats {
            qint64 size = 0;
            qint64 packed = 0;
            QDateTime latestMod;
        };

        QHash<QString, FolderStats> folderStatsMap;
        QVector<ArchiveItem> immediateFiles;
        immediateFiles.reserve(m_allItems.size() / 4 + 16);

        const int normCurrentLen = normCurrent.length();
        const bool atRoot = normCurrent.isEmpty();

        // SINGLE PASS over m_allItems: gathers subfolders, computes aggregated stats, and collects direct files
        for (const auto &item : m_allItems) {
            const QString &itemPath = item.path;

            if (atRoot) {
                if (itemPath.isEmpty()) {
                    immediateFiles.append(item);
                } else {
                    int slashIdx = itemPath.indexOf('/');
                    QString firstPart = (slashIdx == -1) ? itemPath : itemPath.left(slashIdx);
                    auto &stats = folderStatsMap[firstPart];
                    stats.size += item.size;
                    stats.packed += item.packedSize;
                    if (!stats.latestMod.isValid() || item.modified > stats.latestMod) {
                        stats.latestMod = item.modified;
                    }
                }
            } else {
                if (itemPath == normCurrent) {
                    immediateFiles.append(item);
                } else if (itemPath.startsWith(normCurrent) && itemPath.length() > normCurrentLen && itemPath.at(normCurrentLen) == '/') {
                    QString relPath = itemPath.mid(normCurrentLen + 1);
                    int slashIdx = relPath.indexOf('/');
                    QString firstPart = (slashIdx == -1) ? relPath : relPath.left(slashIdx);
                    auto &stats = folderStatsMap[firstPart];
                    stats.size += item.size;
                    stats.packed += item.packedSize;
                    if (!stats.latestMod.isValid() || item.modified > stats.latestMod) {
                        stats.latestMod = item.modified;
                    }
                }
            }
        }

        // Sort immediate subfolders alphabetically
        QStringList sortedDirs = folderStatsMap.keys();
        std::sort(sortedDirs.begin(), sortedDirs.end(), [](const QString &a, const QString &b) {
            return a.compare(b, Qt::CaseInsensitive) < 0;
        });

        for (const QString &dirName : sortedDirs) {
            const auto &stats = folderStatsMap.value(dirName);
            ArchiveItem dirItem;
            dirItem.id = QString("dir_%1_%2").arg(normCurrent, dirName);
            dirItem.filename = dirName;
            dirItem.type = "Folder";
            dirItem.isDirectory = true;
            dirItem.path = atRoot ? dirName : (normCurrent + "/" + dirName);
            dirItem.size = stats.size;
            dirItem.packedSize = stats.packed;
            dirItem.ratio = stats.size > 0 ? static_cast<int>((1.0 - static_cast<double>(stats.packed) / stats.size) * 100.0) : 0;
            dirItem.modified = stats.latestMod.isValid() ? stats.latestMod : QDateTime::currentDateTime();

            m_items.append(dirItem);
        }

        // Append files directly in this folder
        m_items.append(immediateFiles);
    }
    endResetModel();
}

QStringList ArchiveModel::allFolders() const {
    if (!m_foldersCacheDirty) {
        return m_allFoldersCache;
    }
    QSet<QString> folders;
    folders.insert(""); // Root folder
    for (const auto &item : m_allItems) {
        const QString &norm = item.path;
        if (!norm.isEmpty()) {
            QStringList parts = norm.split('/');
            QString curr;
            for (const QString &part : parts) {
                curr = curr.isEmpty() ? part : (curr + "/" + part);
                folders.insert(curr);
            }
        }
    }
    m_allFoldersCache = folders.values();
    std::sort(m_allFoldersCache.begin(), m_allFoldersCache.end(), [](const QString &a, const QString &b) {
        if (a.isEmpty()) return true;
        if (b.isEmpty()) return false;
        return a.localeAwareCompare(b) < 0;
    });
    m_foldersCacheDirty = false;
    return m_allFoldersCache;
}

int ArchiveModel::allFilesCount() const {
    int count = 0;
    for (const auto &item : m_allItems) {
        if (!item.isDirectory) count++;
    }
    return count;
}

void ArchiveModel::setItems(const QVector<ArchiveItem> &items) {
    m_allItems.clear();
    m_allItems.reserve(items.size());
    for (ArchiveItem it : items) {
        it.path = normalizePath(it.path);
        m_allItems.append(std::move(it));
    }
    m_currentFolder.clear();
    rebuildVisibleItems();
}

void ArchiveModel::addItem(const ArchiveItem &item) {
    m_allItems.append(item);
    rebuildVisibleItems();
}

void ArchiveModel::addItems(const QVector<ArchiveItem> &items) {
    if (items.isEmpty()) return;
    m_allItems.append(items);
    rebuildVisibleItems();
}

void ArchiveModel::removeRowById(const QString &id) {
    for (int i = 0; i < m_allItems.size(); ++i) {
        if (m_allItems[i].id == id) {
            m_allItems.removeAt(i);
            rebuildVisibleItems();
            return;
        }
    }
}

void ArchiveModel::removeRowsByIds(const QSet<QString> &ids) {
    for (int i = m_allItems.size() - 1; i >= 0; --i) {
        if (ids.contains(m_allItems[i].id)) {
            m_allItems.removeAt(i);
        }
    }
    rebuildVisibleItems();
}

void ArchiveModel::clear() {
    m_allItems.clear();
    m_currentFolder.clear();
    rebuildVisibleItems();
}

const ArchiveItem& ArchiveModel::itemAt(int row) const {
    return m_items.at(row);
}

qint64 ArchiveModel::totalUncompressedSize() const {
    qint64 sum = 0;
    for (const auto &item : m_allItems) {
        if (!item.isDirectory) sum += item.size;
    }
    return sum;
}

qint64 ArchiveModel::totalPackedSize() const {
    qint64 sum = 0;
    for (const auto &item : m_allItems) {
        if (!item.isDirectory) sum += item.packedSize;
    }
    return sum;
}

int ArchiveModel::overallCompressionRatio() const {
    qint64 total = totalUncompressedSize();
    qint64 packed = totalPackedSize();
    if (total == 0) return 0;
    return static_cast<int>(((total - packed) * 100) / total);
}

QString ArchiveModel::formatBytes(qint64 bytes) {
    if (bytes < 1024) return QString::number(bytes) + " B";
    if (bytes < 1024 * 1024) return QString::number(bytes / 1024.0, 'f', 1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return QString::number(bytes / (1024.0 * 1024.0), 'f', 2) + " MB";
    return QString::number(bytes / (1024.0 * 1024.0 * 1024.0), 'f', 2) + " GB";
}
