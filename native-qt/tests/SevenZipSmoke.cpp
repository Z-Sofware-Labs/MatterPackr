#include "ArchiveBackend.h"

#include <QCoreApplication>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QTemporaryDir>
#include <QTextStream>

namespace {

bool fail(const QString &message) {
  QTextStream(stderr) << message << Qt::endl;
  return false;
}

}

int main(int argc, char **argv) {
  QCoreApplication application(argc, argv);
  QTemporaryDir workspace;
  if (!workspace.isValid())
    return fail(QStringLiteral("Could not create the smoke-test workspace."));

  const QString sourceDirectory = workspace.filePath(QStringLiteral("source"));
  const QString nestedDirectory = QDir(sourceDirectory).filePath(QStringLiteral("nested"));
  if (!QDir().mkpath(nestedDirectory))
    return fail(QStringLiteral("Could not create the source directory."));

  QFile rootFile(QDir(sourceDirectory).filePath(QStringLiteral("root.txt")));
  if (!rootFile.open(QIODevice::WriteOnly)
      || rootFile.write("matterpackr-root\n") < 0)
    return fail(QStringLiteral("Could not write the root test file."));
  rootFile.close();

  QFile nestedFile(QDir(nestedDirectory).filePath(QStringLiteral("nested.txt")));
  if (!nestedFile.open(QIODevice::WriteOnly)
      || nestedFile.write("matterpackr-nested\n") < 0)
    return fail(QStringLiteral("Could not write the nested test file."));
  nestedFile.close();

  const QString archivePath = workspace.filePath(QStringLiteral("smoke.7z"));
  QString errorMessage;
  if (!ArchiveBackend::create7z(archivePath, {}, &errorMessage))
    return fail(QStringLiteral("Empty 7Z creation failed: %1").arg(errorMessage));

  const QString encryptedPath = workspace.filePath(QStringLiteral("encrypted.7z"));
  ArchiveBackend::ArchiveOptions encryptedOptions;
  encryptedOptions.password = QStringLiteral("smoke-password");
  if (!ArchiveBackend::createEncrypted7z(encryptedPath, {}, encryptedOptions,
                                         &errorMessage)) {
    return fail(QStringLiteral("Encrypted 7Z creation failed: %1")
                    .arg(errorMessage));
  }
  if (!QFileInfo(encryptedPath).exists() || QFileInfo(encryptedPath).size() == 0)
    return fail(QStringLiteral("Encrypted 7Z archive was not created."));

  QVector<ArchiveItem> emptyItems;
  if (!ArchiveBackend::listEntries(archivePath, &emptyItems, &errorMessage))
    return fail(QStringLiteral("Empty archive readback failed: %1")
                   .arg(errorMessage));
  if (!emptyItems.isEmpty())
    return fail(QStringLiteral("Empty archive unexpectedly contains entries."));

  if (!ArchiveBackend::create7z(
          archivePath, {sourceDirectory}, &errorMessage))
    return fail(QStringLiteral("7Z creation failed: %1").arg(errorMessage));

  QVector<ArchiveItem> items;
  if (!ArchiveBackend::listEntries(archivePath, &items, &errorMessage))
    return fail(QStringLiteral("Independent archive readback failed: %1")
                   .arg(errorMessage));

  bool foundRoot = false;
  bool foundNested = false;
  for (const ArchiveItem &item : items) {
    foundRoot |= item.filename == QStringLiteral("root.txt");
    foundNested |= item.filename == QStringLiteral("nested/nested.txt");
  }

  if (!foundRoot || !foundNested)
    return fail(QStringLiteral("Archive readback did not contain both test files."));

  const QString addedFilePath = workspace.filePath(QStringLiteral("added.txt"));
  QFile addedFile(addedFilePath);
  if (!addedFile.open(QIODevice::WriteOnly)
      || addedFile.write("matterpackr-added\n") < 0)
    return fail(QStringLiteral("Could not write the added test file."));
  addedFile.close();

  if (!ArchiveBackend::add7z(archivePath, {addedFilePath}, &errorMessage))
    return fail(QStringLiteral("7Z add failed: %1").arg(errorMessage));
  items.clear();
  if (!ArchiveBackend::listEntries(archivePath, &items, &errorMessage))
    return fail(QStringLiteral("Readback after add failed: %1").arg(errorMessage));
  bool foundAdded = false;
  for (const ArchiveItem &item : items)
    foundAdded |= item.filename == QStringLiteral("added.txt");
  if (!foundAdded)
    return fail(QStringLiteral("Added file was not found after 7Z rebuild."));

  if (!ArchiveBackend::remove7z(
          archivePath, {QStringLiteral("nested/nested.txt")}, &errorMessage))
    return fail(QStringLiteral("7Z remove failed: %1").arg(errorMessage));
  items.clear();
  if (!ArchiveBackend::listEntries(archivePath, &items, &errorMessage))
    return fail(QStringLiteral("Readback after remove failed: %1").arg(errorMessage));
  for (const ArchiveItem &item : items) {
    if (item.filename == QStringLiteral("nested/nested.txt"))
      return fail(QStringLiteral("Removed file is still present after 7Z rebuild."));
  }

  QTemporaryDir extractionDirectory;
  if (!extractionDirectory.isValid()
      || !ArchiveBackend::extractEntries(
          archivePath, extractionDirectory.path(), {}, &errorMessage))
    return fail(QStringLiteral("Extraction failed: %1").arg(errorMessage));
  if (!QFile::exists(QDir(extractionDirectory.path())
                         .filePath(QStringLiteral("source/root.txt")))
      || !QFile::exists(
          QDir(extractionDirectory.path()).filePath(QStringLiteral("added.txt"))))
    return fail(QStringLiteral("Extraction did not produce the expected files."));

  const QString zipPath = workspace.filePath(QStringLiteral("deflated.zip"));
  if (!ArchiveBackend::createEmpty(zipPath, &errorMessage)
      || !ArchiveBackend::addFiles(zipPath, {addedFilePath}, &errorMessage))
    return fail(QStringLiteral("Deflated ZIP setup failed: %1").arg(errorMessage));
  QTemporaryDir zipExtractionDirectory;
  if (!zipExtractionDirectory.isValid()
      || !ArchiveBackend::extractEntries(
          zipPath, zipExtractionDirectory.path(), {}, &errorMessage))
    return fail(QStringLiteral("Deflated ZIP extraction failed: %1").arg(errorMessage));
  if (!QFile::exists(QDir(zipExtractionDirectory.path())
                         .filePath(QStringLiteral("added.txt"))))
    return fail(QStringLiteral("Deflated ZIP extraction produced no file."));

  const QString externalArchiveDirectory =
      QDir(workspace.path()).filePath(QStringLiteral("archive-directory"));
  if (!QDir().mkpath(externalArchiveDirectory))
    return fail(QStringLiteral("Could not create the replacement test directory."));
  const QString externalArchivePath =
      QDir(externalArchiveDirectory).filePath(QStringLiteral("archive.zip"));
  if (!ArchiveBackend::createEmpty(externalArchivePath, &errorMessage)
      || !ArchiveBackend::addFiles(
          externalArchivePath, {addedFilePath}, &errorMessage))
    return fail(QStringLiteral("Same-directory replacement failed: %1")
                   .arg(errorMessage));

  return 0;
}
