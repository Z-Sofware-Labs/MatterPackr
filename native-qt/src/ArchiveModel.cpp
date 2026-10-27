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
                case ColFilename: return QString("..");
                case ColType:     return tr("Parent Folder");
                default:          return QVariant();
            }
        }

        switch (index.column()) {
            case ColFilename:   return item.filename;
            case ColType:       return item.isDirectory ? tr("Folder") : item.type;
            case ColModified:   return item.modified.isValid() ? item.modified.toString("yyyy-MM-dd hh:mm AP") : QString("-");
            case ColSize:       return item.isDirectory ? (item.size > 0 ? formatBytes(item.size) : tr("<DIR>")) : formatBytes(item.size);
            case ColRatio:      return item.isDirectory ? (item.size > 0 ? QString("%1%").arg(item.ratio) : QString("-")) : QString("%1%").arg(item.ratio);
            case ColPacked:     return item.isDirectory ? (item.size > 0 ? formatBytes(item.packedSize) : QString("-")) : formatBytes(item.packedSize);
            case ColCrc32:      return item.isDirectory ? QString("-") : item.crc32.toUpper();
            case ColEncryption: return item.isDirectory ? QString("-") : (item.isEncrypted ? item.encryptionMethod : QString("-"));
            case ColPath:       return item.path.isEmpty() ? QString(".") : item.path;
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
        if (item.isDirectory) {
            static QFileIconProvider iconProvider;
            return iconProvider.icon(QFileIconProvider::Folder);
        }

        const QString lowerName = item.filename.toLower();
        if (lowerName.endsWith(".tar.gz") || lowerName.endsWith(".tgz")) {
            return QIcon(":/filetypes/tgz.ico");
        } else if (lowerName.endsWith(".tar.bz2") || lowerName.endsWith(".tbz2") || lowerName.endsWith(".tbz")) {
            return QIcon(":/filetypes/tbz2.ico");
        } else if (lowerName.endsWith(".tar.xz") || lowerName.endsWith(".txz")) {
            return QIcon(":/filetypes/txz.ico");
        }

        const QString suffix = QFileInfo(item.filename).suffix().toLower();
        if (suffix == "zip" || suffix == "zipx") {
            return QIcon(":/filetypes/zip.ico");
        } else if (suffix == "7z") {
            return QIcon(":/filetypes/7z.ico");
        } else if (suffix == "rar") {
            return QIcon(":/filetypes/rar.ico");
        } else if (suffix == "tar") {
            return QIcon(":/filetypes/tar.ico");
        } else if (suffix == "gz" || suffix == "gzip") {
            return QIcon(":/filetypes/gz.ico");
        } else if (suffix == "bz2" || suffix == "bzip2") {
            return QIcon(":/filetypes/bz2.ico");
        } else if (suffix == "xz") {
            return QIcon(":/filetypes/txz.ico");
        } else if (suffix == "iso") {
            return QIcon(":/filetypes/iso.ico");
        } else if (suffix == "img" || suffix == "bin") {
            return QIcon(":/filetypes/img.ico");
        } else if (suffix == "cab") {
            return QIcon(":/filetypes/cab.ico");
        } else if (suffix == "cpio") {
            return QIcon(":/filetypes/cpio.ico");
        } else if (suffix == "ar" || suffix == "a") {
            return QIcon(":/filetypes/ar.ico");
        } else if (suffix == "zst" || suffix == "lzma" || suffix == "lzh" || suffix == "ace") {
            return QIcon(":/filetypes/archive.ico");
        }

        static QFileIconProvider iconProvider;
        QIcon icon = iconProvider.icon(QFileInfo(item.filename));
        if (!icon.isNull()) return icon;
        return iconProvider.icon(QAbstractFileIconProvider::File);
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

    if (m_viewMode == ViewMode::Classic) {
        // WinZip Classic View: Flat list of all files across the entire archive
        m_items = m_allItems;
    } else {
        // WinRAR / 7-Zip Explorer View: Hierarchical view for m_currentFolder
        QString normCurrent = normalizePath(m_currentFolder);

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

        // Find all immediate subfolders under normCurrent
        QSet<QString> immediateSubfolders;
        for (const auto &item : m_allItems) {
            QString itemPath = normalizePath(item.path);

            if (normCurrent.isEmpty()) {
                if (!itemPath.isEmpty()) {
                    QString firstPart = itemPath.section('/', 0, 0);
                    immediateSubfolders.insert(firstPart);
                }
            } else {
                if (itemPath.startsWith(normCurrent + "/") && itemPath.length() > normCurrent.length() + 1) {
                    QString relPath = itemPath.mid(normCurrent.length() + 1);
                    QString firstPart = relPath.section('/', 0, 0);
                    immediateSubfolders.insert(firstPart);
                }
            }
        }

        // Sort immediate subfolders alphabetically
        QStringList sortedDirs = immediateSubfolders.values();
        std::sort(sortedDirs.begin(), sortedDirs.end(), [](const QString &a, const QString &b) {
            return a.compare(b, Qt::CaseInsensitive) < 0;
        });

        for (const QString &dirName : sortedDirs) {
            ArchiveItem dirItem;
            dirItem.id = QString("dir_%1_%2").arg(normCurrent, dirName);
            dirItem.filename = dirName;
            dirItem.type = "Folder";
            dirItem.isDirectory = true;
            dirItem.path = normCurrent.isEmpty() ? dirName : (normCurrent + "/" + dirName);

            // Compute aggregated statistics for the folder
            qint64 folderSize = 0;
            qint64 folderPacked = 0;
            QDateTime latestMod;

            for (const auto &it : m_allItems) {
                QString ip = normalizePath(it.path);
                if (ip == dirItem.path || ip.startsWith(dirItem.path + "/")) {
                    folderSize += it.size;
                    folderPacked += it.packedSize;
                    if (!latestMod.isValid() || it.modified > latestMod) {
                        latestMod = it.modified;
                    }
                }
            }

            dirItem.size = folderSize;
            dirItem.packedSize = folderPacked;
            dirItem.ratio = folderSize > 0 ? static_cast<int>((1.0 - static_cast<double>(folderPacked) / folderSize) * 100.0) : 0;
            dirItem.modified = latestMod.isValid() ? latestMod : QDateTime::currentDateTime();

            m_items.append(dirItem);
        }

        // Add files that reside directly inside normCurrent
        for (const auto &item : m_allItems) {
            QString itemPath = normalizePath(item.path);
            if (itemPath == normCurrent) {
                m_items.append(item);
            }
        }
    }
    endResetModel();
}

QStringList ArchiveModel::allFolders() const {
    QSet<QString> folders;
    folders.insert(""); // Root folder
    for (const auto &item : m_allItems) {
        QString norm = normalizePath(item.path);
        if (!norm.isEmpty()) {
            QStringList parts = norm.split('/');
            QString curr;
            for (const QString &part : parts) {
                curr = curr.isEmpty() ? part : (curr + "/" + part);
                folders.insert(curr);
            }
        }
    }
    QStringList result = folders.values();
    std::sort(result.begin(), result.end(), [](const QString &a, const QString &b) {
        if (a.isEmpty()) return true;
        if (b.isEmpty()) return false;
        return a.localeAwareCompare(b) < 0;
    });
    return result;
}

int ArchiveModel::allFilesCount() const {
    int count = 0;
    for (const auto &item : m_allItems) {
        if (!item.isDirectory) count++;
    }
    return count;
}

void ArchiveModel::setItems(const QVector<ArchiveItem> &items) {
    m_allItems = items;
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
    if (bytes < 1024) return QString("%1 B").arg(bytes);
    if (bytes < 1024 * 1024) return QString("%1 KB").arg(QString::number(bytes / 1024.0, 'f', 1));
    if (bytes < 1024 * 1024 * 1024) return QString("%1 MB").arg(QString::number(bytes / (1024.0 * 1024.0), 'f', 2));
    return QString("%1 GB").arg(QString::number(bytes / (1024.0 * 1024.0 * 1024.0), 'f', 2));
}
