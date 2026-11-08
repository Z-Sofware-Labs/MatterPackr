#include "ArchiveBackend.h"

#include <QDir>
#include <QFileInfo>
#include <QFile>
#include <QDirIterator>
#include <QTemporaryDir>
#include <QTemporaryFile>
#include <QThread>
#include <QSet>
#include <QRegularExpression>
#include <QElapsedTimer>
#include <QStandardPaths>
#include <QDateTime>
#include <QTextStream>
#include <QDebug>
#include <cstdio>

#ifdef MATTERPACKR_HAS_LIBARCHIVE
#include <archive.h>
#include <archive_entry.h>
#endif

namespace {

bool isSafeEntryPath(const QString &entryPath) {
  const QString normalized = QDir::cleanPath(entryPath).replace('\\', '/');
  if (normalized.isEmpty() || normalized == "." || normalized.startsWith('/')
      || normalized.contains(QRegularExpression(QStringLiteral("^[A-Za-z]:/")))
      || normalized.startsWith("//")) {
    return false;
  }
  const QStringList parts = normalized.split('/', Qt::SkipEmptyParts);
  for (const QString &part : parts) {
    if (part == QStringLiteral(".."))
      return false;
  }
  return true;
}

QString entryType(const QString &filename, bool directory) {
  if (directory)
    return QObject::tr("Folder");
  const int dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.mid(dot + 1).toUpper() : QObject::tr("File");
}

}

namespace ArchiveBackend {

Capabilities capabilitiesForArchive(const QString &archivePath) {
  const QString lower = archivePath.toLower();
  Capabilities capabilities;
#ifdef MATTERPACKR_HAS_LIBARCHIVE
  capabilities.canList = true;
  capabilities.canExtract = true;
  capabilities.canTest = true;
#endif
#ifdef MATTERPACKR_HAS_7Z_SDK
  if (lower.endsWith(QStringLiteral(".7z")))
    capabilities.supportsPassword = true;
#endif

  if (lower.endsWith(QStringLiteral(".zip"))
      || lower.endsWith(QStringLiteral(".tar"))
      || lower.endsWith(QStringLiteral(".7z"))) {
    capabilities.canCreate = capabilities.canList;
    capabilities.canAdd = capabilities.canList;
    capabilities.canRemove = capabilities.canList;
  }
  return capabilities;
}

bool isAvailable() {
#ifdef MATTERPACKR_HAS_LIBARCHIVE
  return true;
#else
  return false;
#endif
}

static void stampMatterPackrZipComment(const QString &filePath, bool encrypted) {
  QFile file(filePath);
  if (!file.open(QIODevice::ReadWrite))
    return;
  qint64 size = file.size();
  if (size < 22)
    return;
  qint64 searchStart = qMax<qint64>(0, size - 1024);
  file.seek(searchStart);
  QByteArray buffer = file.read(1024);
  int pos = buffer.lastIndexOf("\x50\x4B\x05\x06");
  if (pos >= 0) {
    qint64 eocdPos = searchStart + pos;
    QByteArray comment = encrypted ? QByteArray("MatterPackr:Encrypted") : QByteArray("MatterPackr");
    quint16 commentLen = static_cast<quint16>(comment.size());
    file.seek(eocdPos + 20);
    char lenBytes[2] = {
      static_cast<char>(commentLen & 0xFF),
      static_cast<char>((commentLen >> 8) & 0xFF)
    };
    file.write(lenBytes, 2);
    file.write(comment);
    file.resize(eocdPos + 22 + comment.size());
  }
}

bool isArchiveCreatedByApp(const QString &archivePath) {
  QFile file(archivePath);
  if (!file.open(QIODevice::ReadOnly))
    return false;
  qint64 size = file.size();
  if (size < 22)
    return false;
  qint64 searchStart = qMax<qint64>(0, size - 1024);
  file.seek(searchStart);
  QByteArray tail = file.read(1024);
  return tail.contains("MatterPackr");
}

bool archiveRequiresPasswordBeforeOpen(const QString &archivePath) {
  // If created by MatterPackr with encryption marker:
  QFile file(archivePath);
  if (file.open(QIODevice::ReadOnly)) {
    qint64 size = file.size();
    if (size >= 22) {
      qint64 searchStart = qMax<qint64>(0, size - 1024);
      file.seek(searchStart);
      QByteArray tail = file.read(1024);
      if (tail.contains("MatterPackr:Encrypted")) {
        return true;
      }
    }
  }

  // If it's a 7Z archive, check if headers are encrypted:
  const QString lower = archivePath.toLower();
  if (lower.endsWith(QStringLiteral(".7z"))) {
    bool needsPw = false;
    bool hasEnc = false;
    QVector<ArchiveItem> items;
    QString err;
    if (!listEntries(archivePath, &items, &err, QString(), &needsPw, &hasEnc)) {
      if (needsPw || err.toLower().contains("passphrase") || err.toLower().contains("encrypted"))
        return true;
    }
  }

  return false;
}

bool listEntries(const QString &archivePath, QVector<ArchiveItem> *items,
                 QString *errorMessage, const QString &password,
                 bool *needsPassword, bool *hasEncryptedEntries) {
  if (needsPassword)
    *needsPassword = false;
  if (hasEncryptedEntries)
    *hasEncryptedEntries = false;

#ifdef MATTERPACKR_HAS_LIBARCHIVE
  archive *reader = archive_read_new();
  if (!reader) {
    if (errorMessage)
      *errorMessage = QObject::tr("Could not initialize the libarchive reader.");
    return false;
  }

  archive_read_support_filter_all(reader);
  archive_read_support_format_all(reader);
  archive_read_set_option(reader, "zip", "mac-ext", nullptr);
  archive_read_set_option(reader, "tar", "mac-ext", nullptr);
  if (!password.isEmpty()) {
    archive_read_add_passphrase(reader, password.toUtf8().constData());
  }
  const QByteArray encodedPath = QFile::encodeName(archivePath);
  if (archive_read_open_filename(reader, encodedPath.constData(), 131072) != ARCHIVE_OK) {
    if (errorMessage) {
      *errorMessage = QString::fromUtf8(archive_error_string(reader));
      if (errorMessage->isEmpty())
        *errorMessage = QObject::tr("The libarchive reader could not open the archive.");
    }
    const QString errStr = errorMessage ? errorMessage->toLower() : QString();
    if (errStr.contains("passphrase") || errStr.contains("password") || errStr.contains("encrypted")) {
      if (needsPassword)
        *needsPassword = true;
    }
    archive_read_free(reader);
    return false;
  }

  QVector<ArchiveItem> result;
  archive_entry *entry = nullptr;
  int id = 0;
  int status = ARCHIVE_OK;
  while ((status = archive_read_next_header(reader, &entry)) == ARCHIVE_OK) {
    const QString entryPath = QString::fromUtf8(archive_entry_pathname(entry));
    if (!isSafeEntryPath(entryPath)) {
      if (errorMessage)
        *errorMessage = QObject::tr("The archive contains an unsafe path: %1").arg(entryPath);
      archive_read_free(reader);
      return false;
    }

    const QString cleanPath = QDir::cleanPath(entryPath);
    if (cleanPath == QStringLiteral("."))
      continue;

    const bool directory = archive_entry_filetype(entry) == AE_IFDIR;
    const int separator = cleanPath.lastIndexOf('/');
    const QString filename = separator >= 0 ? cleanPath.mid(separator + 1) : cleanPath;
    const QString directoryPath = separator >= 0 ? cleanPath.left(separator) : QString();

    ArchiveItem item;
    item.id = QStringLiteral("entry-%1").arg(++id);
    item.filename = filename;
    item.path = directoryPath;
    item.type = entryType(filename, directory);
    item.isDirectory = directory;
    item.size = static_cast<qint64>(archive_entry_size(entry));
    item.packedSize = 0;
    item.ratio = 0;
    item.crc32 = QStringLiteral("-");
    item.modified = QDateTime::fromSecsSinceEpoch(
        static_cast<qint64>(archive_entry_mtime(entry)));

    if (archive_entry_is_encrypted(entry)) {
      item.isEncrypted = true;
      item.encryptionMethod = QStringLiteral("AES");
      if (hasEncryptedEntries)
        *hasEncryptedEntries = true;
    }

    result.append(item);

    if (archive_read_data_skip(reader) != ARCHIVE_OK) {
      if (errorMessage)
        *errorMessage = QString::fromUtf8(archive_error_string(reader));
      const QString errStr = errorMessage ? errorMessage->toLower() : QString();
      if (errStr.contains("passphrase") || errStr.contains("password") || errStr.contains("encrypted")) {
        if (needsPassword)
          *needsPassword = true;
      }
      archive_read_free(reader);
      return false;
    }
  }

  if (archive_read_has_encrypted_entries(reader) == 1) {
    if (hasEncryptedEntries)
      *hasEncryptedEntries = true;
  }

  if (status != ARCHIVE_EOF) {
    if (errorMessage) {
      *errorMessage = QString::fromUtf8(archive_error_string(reader));
      if (errorMessage->isEmpty())
        *errorMessage = QObject::tr("The libarchive reader failed while reading entries.");
    }
    const QString errStr = errorMessage ? errorMessage->toLower() : QString();
    if (errStr.contains("passphrase") || errStr.contains("password") || errStr.contains("encrypted")) {
      if (needsPassword)
        *needsPassword = true;
    }
    archive_read_free(reader);
    return false;
  }

  archive_read_free(reader);
  *items = result;
  return true;
#else
  Q_UNUSED(archivePath);
  Q_UNUSED(items);
  Q_UNUSED(errorMessage);
  Q_UNUSED(password);
  Q_UNUSED(needsPassword);
  Q_UNUSED(hasEncryptedEntries);
  return false;
#endif
}

bool extractEntries(const QString &archivePath, const QString &destinationPath,
                    const QStringList &selectedEntries, QString *errorMessage,
                    const OperationCancel &cancel,
                    const QString &password,
                    ExtractionTelemetry *telemetry) {
#ifdef MATTERPACKR_HAS_LIBARCHIVE
  ExtractionTelemetry localTelem;
  QElapsedTimer totalTimer;
  totalTimer.start();
  QElapsedTimer stageTimer;

  archive *reader = archive_read_new();
  archive *writer = archive_write_disk_new();
  if (!reader || !writer) {
    if (errorMessage)
      *errorMessage = QObject::tr("Could not initialize the libarchive extractor.");
    if (reader)
      archive_read_free(reader);
    if (writer)
      archive_write_free(writer);
    return false;
  }

  archive_read_support_filter_all(reader);
  archive_read_support_format_all(reader);
  archive_read_set_option(reader, "zip", "mac-ext", nullptr);
  archive_read_set_option(reader, "tar", "mac-ext", nullptr);
  if (!password.isEmpty()) {
    archive_read_add_passphrase(reader, password.toUtf8().constData());
  }
  archive_write_disk_set_options(writer, ARCHIVE_EXTRACT_TIME
                                           | ARCHIVE_EXTRACT_PERM
                                           | ARCHIVE_EXTRACT_SECURE_SYMLINKS);
  const QByteArray encodedPath = QFile::encodeName(archivePath);
  if (archive_read_open_filename(reader, encodedPath.constData(), 131072) != ARCHIVE_OK) {
    if (errorMessage)
      *errorMessage = QString::fromUtf8(archive_error_string(reader));
    archive_write_free(writer);
    archive_read_free(reader);
    return false;
  }

  const QSet<QString> selected(selectedEntries.cbegin(), selectedEntries.cend());
  QSet<QString> createdDirs;
  createdDirs.insert(QDir::cleanPath(destinationPath).replace('\\', '/'));

  archive_entry *entry = nullptr;
  int status = ARCHIVE_OK;
  while (true) {
    stageTimer.start();
    status = archive_read_next_header(reader, &entry);
    localTelem.readHeaderDurationMs += stageTimer.elapsed();
    if (status != ARCHIVE_OK)
      break;

    if (cancel && cancel->load()) {
      if (errorMessage)
        *errorMessage = QObject::tr("The archive operation was cancelled.");
      archive_write_free(writer);
      archive_read_free(reader);
      return false;
    }

    stageTimer.start();
    const QString entryPath = QString::fromUtf8(archive_entry_pathname(entry));
    QString cleanPath = QDir::cleanPath(entryPath).replace('\\', '/');
    while (cleanPath.startsWith('/')) {
      cleanPath.remove(0, 1);
    }
    if (!isSafeEntryPath(entryPath)) {
      if (errorMessage)
        *errorMessage = QObject::tr("The archive contains an unsafe path: %1").arg(entryPath);
      archive_write_free(writer);
      archive_read_free(reader);
      return false;
    }
    bool selectedForExtraction = selected.isEmpty() || selected.contains(cleanPath);
    if (!selectedForExtraction) {
      for (const QString &selectedPath : selected) {
        if (cleanPath.startsWith(selectedPath + '/')) {
          selectedForExtraction = true;
          break;
        }
      }
    }
    localTelem.pathResolveDurationMs += stageTimer.elapsed();

    if (!selectedForExtraction) {
      localTelem.skippedCount++;
      stageTimer.start();
      if (archive_read_data_skip(reader) != ARCHIVE_OK) {
        if (errorMessage)
          *errorMessage = QString::fromUtf8(archive_error_string(reader));
        archive_write_free(writer);
        archive_read_free(reader);
        return false;
      }
      localTelem.readDataDurationMs += stageTimer.elapsed();
      continue;
    }

    stageTimer.start();
    const QString targetPath = QDir(destinationPath).filePath(cleanPath);
    const QString targetDir = QFileInfo(targetPath).path();
    if (!createdDirs.contains(targetDir)) {
      if (!QDir().exists(targetDir)) {
        QDir().mkpath(targetDir);
      }
      createdDirs.insert(targetDir);
    }
    localTelem.dirPrepDurationMs += stageTimer.elapsed();

    stageTimer.start();
    const QByteArray encodedTarget = QFile::encodeName(targetPath);
    archive_entry_set_pathname(entry, encodedTarget.constData());
    if (archive_write_header(writer, entry) != ARCHIVE_OK) {
      if (errorMessage)
        *errorMessage = QString::fromUtf8(archive_error_string(writer));
      archive_write_free(writer);
      archive_read_free(reader);
      return false;
    }
    localTelem.writeHeaderDurationMs += stageTimer.elapsed();

    const void *buffer = nullptr;
    size_t size = 0;
    la_int64_t offset = 0;
    while (true) {
      stageTimer.start();
      status = archive_read_data_block(reader, &buffer, &size, &offset);
      localTelem.readDataDurationMs += stageTimer.elapsed();
      if (status != ARCHIVE_OK)
        break;

      localTelem.totalBytes += static_cast<qint64>(size);

      if (cancel && cancel->load()) {
        if (errorMessage)
          *errorMessage = QObject::tr("The archive operation was cancelled.");
        archive_write_free(writer);
        archive_read_free(reader);
        return false;
      }

      stageTimer.start();
      if (archive_write_data_block(writer, buffer, size, offset) < 0) {
        if (errorMessage)
          *errorMessage = QString::fromUtf8(archive_error_string(writer));
        archive_write_free(writer);
        archive_read_free(reader);
        return false;
      }
      localTelem.writeDataDurationMs += stageTimer.elapsed();
    }

    if (status != ARCHIVE_EOF && status != ARCHIVE_OK) {
      if (errorMessage)
        *errorMessage = QString::fromUtf8(archive_error_string(reader));
      archive_write_free(writer);
      archive_read_free(reader);
      return false;
    }

    stageTimer.start();
    archive_write_finish_entry(writer);
    localTelem.finishEntryDurationMs += stageTimer.elapsed();
    localTelem.entryCount++;
  }

  if (status != ARCHIVE_EOF) {
    if (errorMessage)
      *errorMessage = QString::fromUtf8(archive_error_string(reader));
    archive_write_free(writer);
    archive_read_free(reader);
    return false;
  }
  archive_write_free(writer);
  archive_read_free(reader);

  localTelem.totalDurationMs = totalTimer.elapsed();
  if (telemetry) {
    *telemetry = localTelem;
  }

  qDebug().noquote() << localTelem.toString();
  std::fprintf(stderr, "%s\n", qPrintable(localTelem.toString()));

  const QString logPath = QStandardPaths::writableLocation(QStandardPaths::TempLocation) +
                          QStringLiteral("/MatterPackr_Extraction_Telemetry.log");
  QFile logFile(logPath);
  if (logFile.open(QIODevice::WriteOnly | QIODevice::Append | QIODevice::Text)) {
    QTextStream ts(&logFile);
    ts << QDateTime::currentDateTime().toString(Qt::ISODate) << " | "
       << QFileInfo(archivePath).fileName() << " -> " << destinationPath << "\n"
       << localTelem.toString() << "\n\n";
  }

  return true;
#else
  Q_UNUSED(archivePath);
  Q_UNUSED(destinationPath);
  Q_UNUSED(selectedEntries);
  Q_UNUSED(errorMessage);
  Q_UNUSED(cancel);
  Q_UNUSED(password);
  Q_UNUSED(telemetry);
  return false;
#endif
}

namespace {

bool supportedWritableArchive(const QString &archivePath) {
  const QString lower = archivePath.toLower();
  return lower.endsWith(QStringLiteral(".zip"))
      || lower.endsWith(QStringLiteral(".tar"))
      || lower.endsWith(QStringLiteral(".tar.gz"))
      || lower.endsWith(QStringLiteral(".tgz"))
      || lower.endsWith(QStringLiteral(".7z"));
}

bool writeDirectoryArchive(const QString &outputPath, const QString &formatPath,
                           const QString &rootPath,
                           QString *errorMessage, const OperationCancel &cancel,
                           const ArchiveOptions &options = {}) {
#ifdef MATTERPACKR_HAS_LIBARCHIVE
  archive *writer = archive_write_new();
  if (!writer) {
    if (errorMessage)
      *errorMessage = QObject::tr("Could not initialize the libarchive writer.");
    return false;
  }
  const QString lower = formatPath.toLower();
  int formatStatus = ARCHIVE_OK;
  if (lower.endsWith(QStringLiteral(".zip")))
    formatStatus = archive_write_set_format_zip(writer);
  else if (lower.endsWith(QStringLiteral(".7z")))
    formatStatus = archive_write_set_format_7zip(writer);
  else
    formatStatus = archive_write_set_format_pax_restricted(writer);
  if (formatStatus != ARCHIVE_OK) {
    if (errorMessage)
      *errorMessage = QString::fromUtf8(archive_error_string(writer));
    archive_write_free(writer);
    return false;
  }
  if (!options.password.isEmpty() && lower.endsWith(QStringLiteral(".zip"))) {
    if (archive_write_set_options(writer, "encryption=aes256") != ARCHIVE_OK
        || archive_write_set_passphrase(
               writer, options.password.toUtf8().constData()) != ARCHIVE_OK) {
      if (errorMessage)
        *errorMessage = QString::fromUtf8(archive_error_string(writer));
      archive_write_free(writer);
      return false;
    }
    if (lower.endsWith(QStringLiteral(".tar.gz"))
        || lower.endsWith(QStringLiteral(".tgz"))) {
      if (archive_write_add_filter_gzip(writer) != ARCHIVE_OK) {
        if (errorMessage)
          *errorMessage = QString::fromUtf8(archive_error_string(writer));
        archive_write_free(writer);
        return false;
      }
    }
  }

  const QByteArray encodedOutputPath = QFile::encodeName(outputPath);
  if (archive_write_open_filename(writer, encodedOutputPath.constData()) != ARCHIVE_OK) {
    if (errorMessage)
      *errorMessage = QString::fromUtf8(archive_error_string(writer));
    archive_write_free(writer);
    return false;
  }

  QDir root(rootPath);
  QDirIterator iterator(rootPath, QDir::AllEntries | QDir::NoDotAndDotDot,
                        QDirIterator::Subdirectories);
  while (iterator.hasNext()) {
    if (cancel && cancel->load()) {
      if (errorMessage)
        *errorMessage = QObject::tr("The archive operation was cancelled.");
      archive_write_free(writer);
      return false;
    }
    const QString sourcePath = iterator.next();
    const QString relativePath = root.relativeFilePath(sourcePath).replace('\\', '/');
    if (!isSafeEntryPath(relativePath))
      continue;

    QFileInfo info(sourcePath);
    archive_entry *entry = archive_entry_new();
    archive_entry_set_pathname(entry, relativePath.toUtf8().constData());
    archive_entry_set_filetype(entry, info.isDir() ? AE_IFDIR : AE_IFREG);
    archive_entry_set_perm(entry, info.isDir() ? 0755 : 0644);
    archive_entry_set_mtime(entry, info.lastModified().toSecsSinceEpoch(), 0);
    archive_entry_set_size(entry, info.isFile() ? info.size() : 0);
    if (archive_write_header(writer, entry) != ARCHIVE_OK) {
      if (errorMessage)
        *errorMessage = QString::fromUtf8(archive_error_string(writer));
      archive_entry_free(entry);
      archive_write_free(writer);
      return false;
    }

    if (info.isFile()) {
      QFile input(sourcePath);
      if (!input.open(QIODevice::ReadOnly)) {
        if (errorMessage)
          *errorMessage = QObject::tr("Could not read file: %1").arg(sourcePath);
        archive_entry_free(entry);
        archive_write_free(writer);
        return false;
      }
      QByteArray buffer;
      buffer.resize(1024 * 1024);
      while (!input.atEnd()) {
        if (cancel && cancel->load()) {
          if (errorMessage)
            *errorMessage = QObject::tr("The archive operation was cancelled.");
          archive_entry_free(entry);
          archive_write_free(writer);
          return false;
        }
        const qint64 read = input.read(buffer.data(), buffer.size());
        if (read < 0 || archive_write_data(writer, buffer.constData(), read) < 0) {
          if (errorMessage)
            *errorMessage = QString::fromUtf8(archive_error_string(writer));
          archive_entry_free(entry);
          archive_write_free(writer);
          return false;
        }
      }
    }
    archive_write_finish_entry(writer);
    archive_entry_free(entry);
  }

  if (archive_write_close(writer) != ARCHIVE_OK) {
    if (errorMessage)
      *errorMessage = QString::fromUtf8(archive_error_string(writer));
    archive_write_free(writer);
    return false;
  }
  archive_write_free(writer);
  if (lower.endsWith(QStringLiteral(".zip"))) {
    stampMatterPackrZipComment(outputPath, !options.password.isEmpty());
  }
  return true;
#else
  Q_UNUSED(outputPath); Q_UNUSED(formatPath); Q_UNUSED(rootPath);
  Q_UNUSED(errorMessage); Q_UNUSED(cancel);
  return false;
#endif
}

bool replaceFromDirectory(const QString &archivePath, const QString &rootPath,
                          QString *errorMessage, const OperationCancel &cancel) {
  const QFileInfo archiveInfo(archivePath);
  const QString replacementTemplate =
      QDir(archiveInfo.absolutePath()).filePath(
          QStringLiteral(".matterpackr-replacement-XXXXXX"));
  QTemporaryFile replacement(replacementTemplate);
  replacement.setAutoRemove(false);
  if (!replacement.open()) {
    if (errorMessage)
      *errorMessage = QObject::tr("Could not prepare the replacement archive.");
    return false;
  }
  const QString replacementPath = replacement.fileName();
  replacement.close();
  QFile::remove(replacementPath);
  if (!writeDirectoryArchive(replacementPath, archivePath, rootPath,
                             errorMessage, cancel)) {
    QFile::remove(replacementPath);
    return false;
  }
  const QString backupPath = archivePath + QStringLiteral(".matterpackr-backup");
  QFile::remove(backupPath);
  if (!QFile::rename(archivePath, backupPath)) {
    QFile::remove(replacementPath);
    if (errorMessage)
      *errorMessage = QObject::tr("Could not safely replace the original archive.");
    return false;
  }
  bool installed = false;
  for (int attempt = 0; attempt < 5 && !installed; ++attempt) {
    installed = QFile::rename(replacementPath, archivePath);
    if (!installed)
      QThread::msleep(100);
  }
  if (!installed) {
    // Some Windows filesystem filters reject rename while allowing a copy.
    // The original remains recoverable in backupPath until the copy succeeds.
    QFile replacementFile(replacementPath);
    if (replacementFile.copy(archivePath)) {
      QFile::remove(replacementPath);
      QFile::remove(backupPath);
      return true;
    }
    const QString copyError = replacementFile.errorString();
    QFile::rename(backupPath, archivePath);
    if (errorMessage)
      *errorMessage = QObject::tr(
          "Could not install the replacement archive.\n"
          "Replacement: %1\n"
          "Destination: %2\n"
          "Reason: %3")
                          .arg(replacementPath, archivePath, copyError);
    return false;
  }
  QFile::remove(backupPath);
  return true;
}

bool copyTree(const QString &sourcePath, const QString &destinationPath,
              QString *errorMessage) {
  const QFileInfo sourceInfo(sourcePath);
  if (sourceInfo.isDir()) {
    if (!QDir().mkpath(destinationPath))
      return false;
    QDirIterator iterator(sourcePath, QDir::AllEntries | QDir::NoDotAndDotDot);
    while (iterator.hasNext()) {
      const QString child = iterator.next();
      if (!copyTree(child, QDir(destinationPath).filePath(QFileInfo(child).fileName()),
                    errorMessage))
        return false;
    }
    return true;
  }
  if (!QFile::copy(sourcePath, destinationPath)) {
    if (errorMessage)
      *errorMessage = QObject::tr("Could not stage file: %1").arg(sourcePath);
    return false;
  }
  return true;
}

}

bool createEmpty(const QString &archivePath, QString *errorMessage,
                 const OperationCancel &cancel, const ArchiveOptions &options) {
  if (!supportedWritableArchive(archivePath)) {
    if (errorMessage)
      *errorMessage = QObject::tr("Native writing supports only ZIP and uncompressed TAR files.");
    return false;
  }
  QTemporaryDir root;
  return root.isValid() && writeDirectoryArchive(archivePath, archivePath, root.path(),
                                                 errorMessage, cancel, options);
}

bool addFiles(const QString &archivePath, const QStringList &files,
              QString *errorMessage, const OperationCancel &cancel) {
  if (!supportedWritableArchive(archivePath)) {
    if (errorMessage)
      *errorMessage = QObject::tr("Native writing supports only ZIP and uncompressed TAR files.");
    return false;
  }
  QTemporaryDir root;
  if (!root.isValid() || !extractEntries(archivePath, root.path(), {}, errorMessage, cancel))
    return false;
  for (const QString &filePath : files) {
    if (cancel && cancel->load())
      return false;
    const QFileInfo info(filePath);
    const QString destination = QDir(root.path()).filePath(info.fileName());
    if (!copyTree(filePath, destination, errorMessage))
      return false;
  }
  return replaceFromDirectory(archivePath, root.path(), errorMessage, cancel);
}

bool removeEntries(const QString &archivePath, const QStringList &entryPaths,
                   QString *errorMessage, const OperationCancel &cancel) {
  if (!supportedWritableArchive(archivePath)) {
    if (errorMessage)
      *errorMessage = QObject::tr("Native writing supports only ZIP and uncompressed TAR files.");
    return false;
  }
  QTemporaryDir root;
  if (!root.isValid() || !extractEntries(archivePath, root.path(), {}, errorMessage, cancel))
    return false;
  for (const QString &entryPath : entryPaths) {
    if (cancel && cancel->load())
      return false;
    if (!isSafeEntryPath(entryPath))
      continue;
    const QString target = QDir(root.path()).filePath(QDir::cleanPath(entryPath));
    QFileInfo info(target);
    if (info.isDir()) {
      if (!QDir(target).removeRecursively()) {
        if (errorMessage)
          *errorMessage = QObject::tr("Could not remove archive directory: %1").arg(entryPath);
        return false;
      }
    } else if (info.exists() && !QFile::remove(target)) {
      if (errorMessage)
        *errorMessage = QObject::tr("Could not remove archive entry: %1").arg(entryPath);
      return false;
    }
  }
  return replaceFromDirectory(archivePath, root.path(), errorMessage, cancel);
}

bool create7z(const QString &archivePath, const QStringList &files,
              QString *errorMessage, const OperationCancel &cancel,
              const ArchiveOptions &options) {
  Q_UNUSED(options);
  if (!files.isEmpty()) {
    QTemporaryDir root;
    if (!root.isValid()) {
      if (errorMessage)
        *errorMessage = QObject::tr("Could not prepare the new archive.");
      return false;
    }
    for (const QString &filePath : files) {
      const QFileInfo info(filePath);
      if (!info.exists() || !copyTree(filePath,
          QDir(root.path()).filePath(info.fileName()), errorMessage))
        return false;
    }
    return writeDirectoryArchive(archivePath, archivePath, root.path(),
                                 errorMessage, cancel);
  }
  return createEmpty(archivePath, errorMessage, cancel, options);
}

bool createZip(const QString &archivePath, const QStringList &files,
               const ArchiveOptions &options, QString *errorMessage,
               const OperationCancel &cancel) {
  QTemporaryDir root;
  if (!root.isValid()) {
    if (errorMessage)
      *errorMessage = QObject::tr("Could not prepare the new archive.");
    return false;
  }
  for (const QString &filePath : files) {
    const QFileInfo info(filePath);
    if (!info.exists() || !copyTree(filePath,
        QDir(root.path()).filePath(info.fileName()), errorMessage))
      return false;
  }
  return writeDirectoryArchive(archivePath, archivePath, root.path(),
                               errorMessage, cancel, options);
}

bool add7z(const QString &archivePath, const QStringList &files,
           QString *errorMessage, const OperationCancel &cancel) {
  return addFiles(archivePath, files, errorMessage, cancel);
}

bool remove7z(const QString &archivePath, const QStringList &entryPaths,
              QString *errorMessage, const OperationCancel &cancel) {
  return removeEntries(archivePath, entryPaths, errorMessage, cancel);
}

}
