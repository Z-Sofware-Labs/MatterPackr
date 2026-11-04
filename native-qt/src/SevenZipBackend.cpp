#include "ArchiveBackend.h"

#ifdef MATTERPACKR_HAS_7Z_SDK

#include <QDirIterator>
#include <QFileInfo>
#include <QTemporaryFile>

#include "7zip/Archive/IArchive.h"
#include "7zip/Archive/7z/7zHandler.h"
#include "7zip/Common/FileStreams.h"
#include "Windows/PropVariant.h"

namespace {

using namespace NWindows;
using namespace NWindows::NCOM;

QString sdkError(HRESULT result) {
  return QObject::tr("The 7-Zip SDK rejected the operation (0x%1).")
      .arg(static_cast<quint32>(result), 8, 16, QLatin1Char('0'));
}

UString sdkString(const QString &value) {
  const std::wstring wide = value.toStdWString();
  return UString(wide.c_str());
}

class DirectoryUpdateCallback final : public IArchiveUpdateCallback,
                                       public CMyUnknownImp {
public:
  DirectoryUpdateCallback(const QStringList &files,
                          const ArchiveBackend::OperationCancel &cancel)
      : m_cancel(cancel) {
    for (const QString &file : files) {
      const QFileInfo info(file);
      if (info.exists())
        addTree(info.absoluteFilePath(), QString());
    }
  }

  Z7_COM_QI_BEGIN2(IArchiveUpdateCallback)
  Z7_COM_QI_END
  Z7_COM_ADDREF_RELEASE

private:
  struct Item {
    QString source;
    QString path;
    bool directory = false;
  };

  bool cancelled() const { return m_cancel && m_cancel->load(); }

public:
  UInt32 itemCount() const { return static_cast<UInt32>(m_items.size()); }

  HRESULT GetUpdateItemInfo(UInt32 index, Int32 *newData, Int32 *newProps,
                            UInt32 *indexInArchive) throw() override {
    if (cancelled() || index >= itemCount())
      return cancelled() ? E_ABORT : E_INVALIDARG;
    *newData = 1;
    *newProps = 1;
    *indexInArchive = static_cast<UInt32>(-1);
    return S_OK;
  }

  HRESULT GetProperty(UInt32 index, PROPID propID,
                      PROPVARIANT *value) throw() override {
    if (cancelled() || index >= itemCount())
      return cancelled() ? E_ABORT : E_INVALIDARG;
    const Item &item = m_items[static_cast<int>(index)];
    PropVariant_Clear(value);
    CPropVariant prop;
    switch (propID) {
    case kpidPath:
      prop = sdkString(item.path);
      break;
    case kpidIsDir:
      prop = item.directory;
      break;
    case kpidAttrib:
      prop = static_cast<UInt32>(item.directory ? 0x10 : 0);
      break;
    default:
      break;
    }
    return prop.Detach(value);
  }

  HRESULT GetStream(UInt32 index, ISequentialInStream **stream) throw() override {
    *stream = nullptr;
    if (cancelled() || index >= itemCount())
      return cancelled() ? E_ABORT : E_INVALIDARG;
    const Item &item = m_items[static_cast<int>(index)];
    if (item.directory)
      return S_OK;
    auto *fileStream = new CInFileStream();
    const std::wstring path = item.source.toStdWString();
    if (!fileStream->Open(path.c_str())) {
      static_cast<IInStream *>(fileStream)->Release();
      return E_FAIL;
    }
    *stream = static_cast<IInStream *>(fileStream);
    return S_OK;
  }

  HRESULT SetOperationResult(Int32 result) throw() override {
    return result == 0 ? S_OK : E_FAIL;
  }
  HRESULT SetTotal(UInt64) throw() override { return S_OK; }
  HRESULT SetCompleted(const UInt64 *) throw() override {
    return cancelled() ? E_ABORT : S_OK;
  }

private:
  void addTree(const QString &source, const QString &prefix) {
    const QFileInfo info(source);
    const QString path = prefix.isEmpty()
        ? info.fileName()
        : prefix + QLatin1Char('/') + info.fileName();
    m_items.append({source, path, info.isDir()});
    if (!info.isDir())
      return;
    QDirIterator iterator(source, QDir::AllEntries | QDir::NoDotAndDotDot);
    while (iterator.hasNext())
      addTree(iterator.next(), path);
  }

  QVector<Item> m_items;
  ArchiveBackend::OperationCancel m_cancel;
};

bool writeEncrypted7z(const QString &archivePath, const QStringList &files,
                      const ArchiveBackend::ArchiveOptions &options,
                      QString *errorMessage,
                      const ArchiveBackend::OperationCancel &cancel) {
  QString replacementPath;
  {
    QTemporaryFile replacement(
        QDir(QFileInfo(archivePath).absolutePath())
            .filePath(QStringLiteral(".matterpackr-7z-XXXXXX")));
    replacement.setAutoRemove(true);
    if (!replacement.open()) {
      if (errorMessage)
        *errorMessage = QObject::tr("Could not prepare the encrypted 7Z archive.");
      return false;
    }
    replacementPath = replacement.fileName();
  }

  auto *output = new COutFileStream();
  const std::wstring outputPath = replacementPath.toStdWString();
  if (!output->Create_ALWAYS(outputPath.c_str())) {
    static_cast<IOutStream *>(output)->Release();
    QFile::remove(replacementPath);
    if (errorMessage)
      *errorMessage = QObject::tr("Could not create the encrypted 7Z output file.");
    return false;
  }

  auto *handler = new NArchive::N7z::CHandler();
  auto *callback = new DirectoryUpdateCallback(files, cancel);
  IOutArchive *outArchive = static_cast<IOutArchive *>(handler);

  const UString password = sdkString(options.password);
  CPropVariant passwordValue(password);
  CPropVariant headersValue(options.encryptHeaders);
  const wchar_t *names[] = {L"p", L"he"};
  PROPVARIANT values[] = {passwordValue, headersValue};
  ISetProperties *properties = nullptr;
  HRESULT result = outArchive->QueryInterface(
      IID_ISetProperties, reinterpret_cast<void **>(&properties));
  if (SUCCEEDED(result))
    result = properties->SetProperties(names, values, 2);
  if (properties)
    properties->Release();
  if (SUCCEEDED(result)) {
    result = outArchive->UpdateItems(
        static_cast<ISequentialOutStream *>(output), callback->itemCount(),
        callback);
  }

  output->Close();
  static_cast<IOutStream *>(output)->Release();
  static_cast<IArchiveUpdateCallback *>(callback)->Release();
  outArchive->Release();

  if (FAILED(result) || (cancel && cancel->load())) {
    QFile::remove(replacementPath);
    if (errorMessage)
      *errorMessage = cancel && cancel->load()
          ? QObject::tr("The archive operation was cancelled.")
          : sdkError(result);
    return false;
  }

  if (!QFile::rename(replacementPath, archivePath)) {
    QFile::remove(replacementPath);
    if (errorMessage)
      *errorMessage = QObject::tr("Could not install the encrypted 7Z archive.");
    return false;
  }
  return true;
}

} // namespace

#endif

namespace ArchiveBackend {

bool createEncrypted7z(const QString &archivePath, const QStringList &files,
                       const ArchiveOptions &options, QString *errorMessage,
                       const OperationCancel &cancel) {
#ifdef MATTERPACKR_HAS_7Z_SDK
  if (options.password.isEmpty()) {
    if (errorMessage)
      *errorMessage = QObject::tr("An encryption password is required for 7Z.");
    return false;
  }
  return writeEncrypted7z(archivePath, files, options, errorMessage, cancel);
#else
  Q_UNUSED(archivePath);
  Q_UNUSED(files);
  Q_UNUSED(options);
  Q_UNUSED(cancel);
  if (errorMessage)
    *errorMessage = QObject::tr("Encrypted 7Z support is not enabled in this build.");
  return false;
#endif
}

}
