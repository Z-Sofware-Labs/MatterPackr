#include "ArchiveBackend.h"

#ifdef MATTERPACKR_HAS_7Z_SDK

#include <QDirIterator>
#include <QFile>
#include <QFileInfo>
#include <QTemporaryFile>

#include "7zip/Archive/IArchive.h"
#include "7zip/Archive/7z/7zHandler.h"
#include "7zip/Common/FileStreams.h"
#include "7zip/Common/RegisterCodec.h"
#include "7zip/Compress/CopyCoder.h"
#include "7zip/Compress/LzmaDecoder.h"
#include "7zip/Compress/LzmaEncoder.h"
#include "7zip/Compress/Lzma2Decoder.h"
#include "7zip/Compress/Lzma2Encoder.h"
#include "7zip/Compress/BcjCoder.h"
#include "7zip/Compress/Bcj2Coder.h"
#include "7zip/Crypto/7zAes.h"
#include "7zip/IPassword.h"
#include "Bra.h"
#include "Common/MyCom.h"
#include "Windows/PropVariant.h"

namespace {

using namespace NWindows;
using namespace NWindows::NCOM;

static void *CreateDec_LZMA() { return (void *)(ICompressCoder *)(new NCompress::NLzma::CDecoder()); }
static void *CreateEnc_LZMA() { return (void *)(ICompressCoder *)(new NCompress::NLzma::CEncoder()); }
static const CCodecInfo g_Codec_LZMA = { CreateDec_LZMA, CreateEnc_LZMA, 0x30101, "LZMA", 1, false };

static void *CreateDec_LZMA2() { return (void *)(ICompressCoder *)(new NCompress::NLzma2::CDecoder()); }
static void *CreateEnc_LZMA2() { return (void *)(ICompressCoder *)(new NCompress::NLzma2::CEncoder()); }
static const CCodecInfo g_Codec_LZMA2 = { CreateDec_LZMA2, CreateEnc_LZMA2, 0x21, "LZMA2", 1, false };

static void *CreateDec_7zAES() { return (void *)(ICompressFilter *)(new NCrypto::N7z::CDecoder()); }
static void *CreateEnc_7zAES() { return (void *)(ICompressFilter *)(new NCrypto::N7z::CEncoder()); }
static const CCodecInfo g_Codec_7zAES = { CreateDec_7zAES, CreateEnc_7zAES, 0x6F10701, "7zAES", 1, true };

static void *Create_Copy() { return (void *)(ICompressCoder *)(new NCompress::CCopyCoder()); }
static const CCodecInfo g_Codec_Copy = { Create_Copy, Create_Copy, 0, "Copy", 1, false };

static void *CreateDec_BCJ() { return (void *)(ICompressFilter *)(new NCompress::NBcj::CCoder2(z7_BranchConvSt_X86_Dec)); }
static void *CreateEnc_BCJ() { return (void *)(ICompressFilter *)(new NCompress::NBcj::CCoder2(z7_BranchConvSt_X86_Enc)); }
static const CCodecInfo g_Codec_BCJ = { CreateDec_BCJ, CreateEnc_BCJ, 0x3030103, "BCJ", 1, true };

static void *CreateDec_BCJ2() { return (void *)(ICompressCoder2 *)(new NCompress::NBcj2::CDecoder()); }
static void *CreateEnc_BCJ2() { return (void *)(ICompressCoder2 *)(new NCompress::NBcj2::CEncoder()); }
static const CCodecInfo g_Codec_BCJ2 = { CreateDec_BCJ2, CreateEnc_BCJ2, 0x303011B, "BCJ2", 4, false };

void ensureCodecsRegistered() {
  static bool registered = false;
  if (registered)
    return;
  registered = true;
  RegisterCodec(&g_Codec_LZMA);
  RegisterCodec(&g_Codec_LZMA2);
  RegisterCodec(&g_Codec_7zAES);
  RegisterCodec(&g_Codec_Copy);
  RegisterCodec(&g_Codec_BCJ);
  RegisterCodec(&g_Codec_BCJ2);
}

QString sdkError(HRESULT result) {
  return QObject::tr("The 7-Zip SDK rejected the operation (0x%1).")
      .arg(static_cast<quint32>(result), 8, 16, QLatin1Char('0'));
}

UString sdkString(const QString &value) {
  UString str;
  const std::wstring wide = value.toStdWString();
  str.SetFrom(wide.c_str(), static_cast<unsigned>(wide.length()));
  return str;
}

// CFSTR is wchar_t-based on Windows but char-based (filesystem encoding) on Unix.
#ifdef _WIN32
using SdkPath = std::wstring;
SdkPath sdkPath(const QString &value) { return value.toStdWString(); }
const wchar_t *sdkPathData(const SdkPath &path) { return path.c_str(); }
#else
using SdkPath = QByteArray;
SdkPath sdkPath(const QString &value) { return QFile::encodeName(value); }
const char *sdkPathData(const SdkPath &path) { return path.constData(); }
#endif

class DirectoryUpdateCallback final : public IArchiveUpdateCallback,
                                      public ICryptoGetTextPassword2,
                                      public CMyUnknownImp {
public:
  DirectoryUpdateCallback(const QStringList &files, const QString &password,
                          const ArchiveBackend::OperationCancel &cancel)
      : m_password(password), m_cancel(cancel) {
    for (const QString &file : files) {
      const QFileInfo info(file);
      if (info.exists())
        addTree(info.absoluteFilePath(), QString());
    }
  }

  Z7_COM_QI_BEGIN2(IArchiveUpdateCallback)
  Z7_COM_QI_ENTRY(ICryptoGetTextPassword2)
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

  HRESULT CryptoGetTextPassword2(Int32 *passwordIsDefined, BSTR *password) throw() override {
    if (m_password.isEmpty()) {
      *passwordIsDefined = 0;
      *password = nullptr;
      return S_OK;
    }
    *passwordIsDefined = 1;
    const std::wstring wide = m_password.toStdWString();
    return StringToBstr(wide.c_str(), password);
  }

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
    const SdkPath path = sdkPath(item.source);
    if (!fileStream->Open(sdkPathData(path))) {
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
  QString m_password;
  ArchiveBackend::OperationCancel m_cancel;
};

bool writeEncrypted7z(const QString &archivePath, const QStringList &files,
                      const ArchiveBackend::ArchiveOptions &options,
                      QString *errorMessage,
                      const ArchiveBackend::OperationCancel &cancel) {
  ensureCodecsRegistered();

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

  COutFileStream *outFileStream = new COutFileStream();
  CMyComPtr<IOutStream> output = outFileStream;
  const SdkPath outputPath = sdkPath(replacementPath);
  if (!outFileStream->Create_ALWAYS(sdkPathData(outputPath))) {
    output.Release();
    QFile::remove(replacementPath);
    if (errorMessage)
      *errorMessage = QObject::tr("Could not create the encrypted 7Z output file.");
    return false;
  }

  NArchive::N7z::CHandler *handler = new NArchive::N7z::CHandler();
  CMyComPtr<IOutArchive> outArchive = handler;
  DirectoryUpdateCallback *callbackSpec =
      new DirectoryUpdateCallback(files, options.password, cancel);
  CMyComPtr<IArchiveUpdateCallback> callback = callbackSpec;

  CPropVariant headersValue(options.encryptHeaders);
  const wchar_t *names[] = {L"he"};
  PROPVARIANT values[] = {headersValue};
  ISetProperties *properties = nullptr;
  HRESULT result = outArchive->QueryInterface(
      IID_ISetProperties, reinterpret_cast<void **>(&properties));
  if (SUCCEEDED(result))
    result = properties->SetProperties(names, values, 1);
  if (properties)
    properties->Release();
  if (SUCCEEDED(result)) {
    result = outArchive->UpdateItems(
        output, callbackSpec->itemCount(),
        callback);
  }

  outFileStream->Close();

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
