#pragma once

#include "ArchiveModel.h"
#include <QVector>
#include <atomic>
#include <memory>

namespace ArchiveBackend {

using OperationCancel = std::shared_ptr<std::atomic_bool>;

struct ArchiveOptions {
  QString password;
  bool encryptHeaders = true;
};

struct Capabilities {
  bool canList = false;
  bool canExtract = false;
  bool canCreate = false;
  bool canAdd = false;
  bool canRemove = false;
  bool canTest = false;
  bool supportsPassword = false;
};

struct ExtractionTelemetry {
  qint64 totalDurationMs = 0;
  qint64 readHeaderDurationMs = 0;
  qint64 pathResolveDurationMs = 0;
  qint64 dirPrepDurationMs = 0;
  qint64 writeHeaderDurationMs = 0;
  qint64 readDataDurationMs = 0;
  qint64 writeDataDurationMs = 0;
  qint64 finishEntryDurationMs = 0;
  qint64 totalBytes = 0;
  qint64 entryCount = 0;
  qint64 skippedCount = 0;

  double throughputMBs() const {
    if (totalDurationMs <= 0) return 0.0;
    return (static_cast<double>(totalBytes) / (1024.0 * 1024.0)) / (static_cast<double>(totalDurationMs) / 1000.0);
  }

  double totalMB() const {
    return static_cast<double>(totalBytes) / (1024.0 * 1024.0);
  }

  QString summary() const {
    return QStringLiteral("%1 MB in %2s (%3 MB/s) [Read: %4ms, Write: %5ms, Dirs: %6ms]")
        .arg(QString::number(totalMB(), 'f', 1))
        .arg(QString::number(static_cast<double>(totalDurationMs) / 1000.0, 'f', 2))
        .arg(QString::number(throughputMBs(), 'f', 1))
        .arg(readDataDurationMs)
        .arg(writeDataDurationMs)
        .arg(dirPrepDurationMs);
  }

  QString toString() const {
    return QStringLiteral(
        "[Telemetry] Extraction Breakdown:\n"
        "  - Total Elapsed:      %1 ms (%2 s)\n"
        "  - Total Uncompressed: %3 MB (%4 bytes)\n"
        "  - Throughput:         %5 MB/s\n"
        "  - Entries:            %6 extracted, %7 skipped\n"
        "  - Time in ReadHeader: %8 ms (%9%)\n"
        "  - Time in PathCheck:  %10 ms\n"
        "  - Time in DirPrep:    %11 ms\n"
        "  - Time in WriteHeader:%12 ms\n"
        "  - Time in ReadData:   %13 ms (%14%) [Decompress]\n"
        "  - Time in WriteData:  %15 ms (%16%) [Disk Write]\n"
        "  - Time in Finish:     %17 ms")
        .arg(totalDurationMs)
        .arg(QString::number(static_cast<double>(totalDurationMs) / 1000.0, 'f', 2))
        .arg(QString::number(totalMB(), 'f', 2))
        .arg(totalBytes)
        .arg(QString::number(throughputMBs(), 'f', 2))
        .arg(entryCount)
        .arg(skippedCount)
        .arg(readHeaderDurationMs)
        .arg(totalDurationMs > 0 ? (readHeaderDurationMs * 100 / totalDurationMs) : 0)
        .arg(pathResolveDurationMs)
        .arg(dirPrepDurationMs)
        .arg(writeHeaderDurationMs)
        .arg(readDataDurationMs)
        .arg(totalDurationMs > 0 ? (readDataDurationMs * 100 / totalDurationMs) : 0)
        .arg(writeDataDurationMs)
        .arg(totalDurationMs > 0 ? (writeDataDurationMs * 100 / totalDurationMs) : 0)
        .arg(finishEntryDurationMs);
  }
};

bool isAvailable();
Capabilities capabilitiesForArchive(const QString &archivePath);
bool create7z(const QString &archivePath, const QStringList &files,
              QString *errorMessage, const OperationCancel &cancel = {},
              const ArchiveOptions &options = {});
bool createEncrypted7z(const QString &archivePath, const QStringList &files,
                       const ArchiveOptions &options, QString *errorMessage,
                       const OperationCancel &cancel = {});
bool add7z(const QString &archivePath, const QStringList &files,
           QString *errorMessage, const OperationCancel &cancel = {});
bool remove7z(const QString &archivePath, const QStringList &entryPaths,
              QString *errorMessage, const OperationCancel &cancel = {});
bool listEntries(const QString &archivePath, QVector<ArchiveItem> *items,
                 QString *errorMessage, const QString &password = QString(),
                 bool *needsPassword = nullptr,
                 bool *hasEncryptedEntries = nullptr);
bool extractEntries(const QString &archivePath, const QString &destinationPath,
                    const QStringList &selectedEntries, QString *errorMessage,
                    const OperationCancel &cancel = {},
                    const QString &password = QString(),
                    ExtractionTelemetry *telemetry = nullptr);
bool isArchiveCreatedByApp(const QString &archivePath);
bool archiveRequiresPasswordBeforeOpen(const QString &archivePath);
bool createEmpty(const QString &archivePath, QString *errorMessage,
                 const OperationCancel &cancel = {},
                 const ArchiveOptions &options = {});
bool createZip(const QString &archivePath, const QStringList &files,
               const ArchiveOptions &options, QString *errorMessage,
               const OperationCancel &cancel = {});
bool addFiles(const QString &archivePath, const QStringList &files,
              QString *errorMessage, const OperationCancel &cancel = {});
bool removeEntries(const QString &archivePath, const QStringList &entryPaths,
                   QString *errorMessage, const OperationCancel &cancel = {});

}
