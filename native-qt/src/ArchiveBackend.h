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
                    const QString &password = QString());
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
