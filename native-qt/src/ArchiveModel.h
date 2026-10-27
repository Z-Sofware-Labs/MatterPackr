#pragma once

#include <QAbstractTableModel>
#include <QString>
#include <QDateTime>
#include <QVector>
#include <QIcon>
#include <QSortFilterProxyModel>

struct ArchiveItem {
    QString id;
    QString filename;
    QString type;
    QDateTime modified;
    qint64 size = 0;
    qint64 packedSize = 0;
    int ratio = 0;
    QString crc32;
    bool isEncrypted = false;
    QString encryptionMethod = "None"; // "AES-256", "AES-128", "Zip 2.0"
    QString path;
    bool isDirectory = false;
    bool isChecked = false;
};

class ArchiveModel : public QAbstractTableModel {
    Q_OBJECT

public:
    enum Column {
        ColFilename = 0,
        ColType,
        ColModified,
        ColSize,
        ColRatio,
        ColPacked,
        ColCrc32,
        ColEncryption,
        ColPath,
        ColumnCount
    };

    enum class ViewMode {
        Classic,  // WinZip style flat list of all archive items
        Explorer  // WinRAR / 7-Zip style hierarchical folder browsing
    };

    explicit ArchiveModel(QObject *parent = nullptr);

    int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    int columnCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant data(const QModelIndex &index, int role = Qt::DisplayRole) const override;
    bool setData(const QModelIndex &index, const QVariant &value, int role = Qt::EditRole) override;
    QVariant headerData(int section, Qt::Orientation orientation, int role = Qt::DisplayRole) const override;
    Qt::ItemFlags flags(const QModelIndex &index) const override;

    bool showCheckboxes() const { return m_showCheckboxes; }
    void setShowCheckboxes(bool show);

    // View Mode & Folder Navigation (WinZip Classic vs WinRAR/7-Zip Explorer)
    ViewMode viewMode() const { return m_viewMode; }
    void setViewMode(ViewMode mode);

    QString currentFolder() const { return m_currentFolder; }
    void setCurrentFolder(const QString &folder);
    bool canNavigateUp() const;
    void navigateUp();
    void navigateInto(const QString &subfolder);

    QStringList allFolders() const;
    int allFilesCount() const;

    void setItems(const QVector<ArchiveItem> &items);
    void addItem(const ArchiveItem &item);
    void addItems(const QVector<ArchiveItem> &items);
    void removeRowById(const QString &id);
    void removeRowsByIds(const QSet<QString> &ids);
    void clear();

    const ArchiveItem& itemAt(int row) const;
    const QVector<ArchiveItem>& items() const { return m_items; }
    const QVector<ArchiveItem>& allItems() const { return m_allItems; }

    qint64 totalUncompressedSize() const;
    qint64 totalPackedSize() const;
    int overallCompressionRatio() const;

    static QString formatBytes(qint64 bytes);
    static QString normalizePath(const QString &path);
    static QString parentPath(const QString &path);

signals:
    void folderChanged(const QString &folder);
    void viewModeChanged(ViewMode mode);

private:
    void rebuildVisibleItems();

    QVector<ArchiveItem> m_allItems;
    QVector<ArchiveItem> m_items;
    bool m_showCheckboxes = false;
    ViewMode m_viewMode = ViewMode::Classic;
    QString m_currentFolder;
};

class ArchiveSortProxyModel : public QSortFilterProxyModel {
    Q_OBJECT

public:
    explicit ArchiveSortProxyModel(QObject *parent = nullptr)
        : QSortFilterProxyModel(parent) {}

    void setFilterPattern(const QString &pattern) {
        m_filterPattern = pattern.trimmed();
        invalidate();
    }

    QString filterPattern() const { return m_filterPattern; }

protected:
    bool filterAcceptsRow(int source_row, const QModelIndex &source_parent) const override {
        Q_UNUSED(source_parent);
        if (m_filterPattern.isEmpty())
            return true;

        auto *model = qobject_cast<ArchiveModel*>(sourceModel());
        if (!model) return true;

        const auto &item = model->itemAt(source_row);
        if (item.filename == "..") return true;

        return item.filename.contains(m_filterPattern, Qt::CaseInsensitive) ||
               item.path.contains(m_filterPattern, Qt::CaseInsensitive) ||
               item.type.contains(m_filterPattern, Qt::CaseInsensitive) ||
               item.crc32.contains(m_filterPattern, Qt::CaseInsensitive);
    }

    bool lessThan(const QModelIndex &source_left, const QModelIndex &source_right) const override {
        const auto *model = static_cast<const ArchiveModel*>(sourceModel());
        if (!model) return QSortFilterProxyModel::lessThan(source_left, source_right);

        const auto &left = model->itemAt(source_left.row());
        const auto &right = model->itemAt(source_right.row());

        // ".." parent directory always stays pinned at row 0 regardless of sort direction
        if (left.filename == "..") return sortOrder() == Qt::AscendingOrder;
        if (right.filename == "..") return sortOrder() != Qt::AscendingOrder;

        // In Explorer view, directories always sort before files (like WinRAR / 7-Zip)
        if (model->viewMode() == ArchiveModel::ViewMode::Explorer) {
            if (left.isDirectory != right.isDirectory) {
                return sortOrder() == Qt::AscendingOrder ? left.isDirectory : !left.isDirectory;
            }
        }

        // Numeric and date comparisons
        const int col = source_left.column();
        if (col == ArchiveModel::ColSize) {
            return left.size < right.size;
        }
        if (col == ArchiveModel::ColPacked) {
            return left.packedSize < right.packedSize;
        }
        if (col == ArchiveModel::ColRatio) {
            return left.ratio < right.ratio;
        }
        if (col == ArchiveModel::ColModified) {
            return left.modified < right.modified;
        }

        // Direct in-place string comparison bypassing QVariant creation in QSortFilterProxyModel
        if (col == ArchiveModel::ColFilename) {
            return QString::compare(left.filename, right.filename, Qt::CaseInsensitive) < 0;
        }
        if (col == ArchiveModel::ColType) {
            return QString::compare(left.type, right.type, Qt::CaseInsensitive) < 0;
        }
        if (col == ArchiveModel::ColPath) {
            return QString::compare(left.path, right.path, Qt::CaseInsensitive) < 0;
        }
        if (col == ArchiveModel::ColCrc32) {
            return QString::compare(left.crc32, right.crc32, Qt::CaseInsensitive) < 0;
        }
        if (col == ArchiveModel::ColEncryption) {
            return QString::compare(left.encryptionMethod, right.encryptionMethod, Qt::CaseInsensitive) < 0;
        }

        return QSortFilterProxyModel::lessThan(source_left, source_right);
    }

private:
    QString m_filterPattern;
};
