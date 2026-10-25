#pragma once

#include <QAbstractTableModel>
#include <QString>
#include <QDateTime>
#include <QVector>
#include <QIcon>

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

    explicit ArchiveModel(QObject *parent = nullptr);

    int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    int columnCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant data(const QModelIndex &index, int role = Qt::DisplayRole) const override;
    QVariant headerData(int section, Qt::Orientation orientation, int role = Qt::DisplayRole) const override;
    Qt::ItemFlags flags(const QModelIndex &index) const override;

    void setItems(const QVector<ArchiveItem> &items);
    void addItem(const ArchiveItem &item);
    void addItems(const QVector<ArchiveItem> &items);
    void removeRowById(const QString &id);
    void removeRowsByIds(const QSet<QString> &ids);
    void clear();

    const ArchiveItem& itemAt(int row) const;
    const QVector<ArchiveItem>& items() const { return m_items; }

    qint64 totalUncompressedSize() const;
    qint64 totalPackedSize() const;
    int overallCompressionRatio() const;

private:
    QVector<ArchiveItem> m_items;
    static QString formatBytes(qint64 bytes);
};
