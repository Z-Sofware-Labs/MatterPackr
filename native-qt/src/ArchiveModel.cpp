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
        switch (index.column()) {
            case ColFilename:   return item.filename;
            case ColType:       return item.type;
            case ColModified:   return item.modified.toString("yyyy-MM-dd hh:mm AP");
            case ColSize:       return formatBytes(item.size);
            case ColRatio:      return QString("%1%").arg(item.ratio);
            case ColPacked:     return formatBytes(item.packedSize);
            case ColCrc32:      return item.crc32.toUpper();
            case ColEncryption: return item.isEncrypted ? item.encryptionMethod : QString("-");
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
        static QFileIconProvider iconProvider;
        if (item.isDirectory) {
            return iconProvider.icon(QFileIconProvider::Folder);
        }
        return iconProvider.icon(QFileInfo(item.filename));
    }

    return QVariant();
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
    return Qt::ItemIsEnabled | Qt::ItemIsSelectable;
}

void ArchiveModel::setItems(const QVector<ArchiveItem> &items) {
    beginResetModel();
    m_items = items;
    endResetModel();
}

void ArchiveModel::addItem(const ArchiveItem &item) {
    beginInsertRows(QModelIndex(), m_items.size(), m_items.size());
    m_items.append(item);
    endInsertRows();
}

void ArchiveModel::addItems(const QVector<ArchiveItem> &items) {
    if (items.isEmpty()) return;
    beginInsertRows(QModelIndex(), m_items.size(), m_items.size() + items.size() - 1);
    m_items.append(items);
    endInsertRows();
}

void ArchiveModel::removeRowById(const QString &id) {
    for (int i = 0; i < m_items.size(); ++i) {
        if (m_items[i].id == id) {
            beginRemoveRows(QModelIndex(), i, i);
            m_items.removeAt(i);
            endRemoveRows();
            return;
        }
    }
}

void ArchiveModel::removeRowsByIds(const QSet<QString> &ids) {
    beginResetModel();
    for (int i = m_items.size() - 1; i >= 0; --i) {
        if (ids.contains(m_items[i].id)) {
            m_items.removeAt(i);
        }
    }
    endResetModel();
}

void ArchiveModel::clear() {
    beginResetModel();
    m_items.clear();
    endResetModel();
}

const ArchiveItem& ArchiveModel::itemAt(int row) const {
    return m_items.at(row);
}

qint64 ArchiveModel::totalUncompressedSize() const {
    qint64 sum = 0;
    for (const auto &item : m_items) sum += item.size;
    return sum;
}

qint64 ArchiveModel::totalPackedSize() const {
    qint64 sum = 0;
    for (const auto &item : m_items) sum += item.packedSize;
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
