#include "OptionsDialog.h"
#include <QCoreApplication>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QGridLayout>
#include <QGroupBox>
#include <QHBoxLayout>
#include <QLabel>
#include <QMessageBox>
#include <QProcess>
#include <QSettings>
#include <QStandardPaths>
#include <QTextStream>
#include <QVBoxLayout>

#ifdef Q_OS_WIN
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <shlobj.h>
#include <windows.h>
#elif defined(Q_OS_MACOS) || defined(Q_OS_MAC)
#include <CoreServices/CoreServices.h>
#endif

OptionsDialog::OptionsDialog(QWidget *parent) : QDialog(parent) {
  setWindowTitle(tr("Options"));
  setWindowIcon(QIcon(":/app.png"));
  setModal(true);
  resize(510, 420);
  setMinimumSize(470, 380);

  initFileTypes();
  setupUi();
  loadSettings();
  updateAssociationCount();
}

void OptionsDialog::initFileTypes() {
  m_fileTypes = {
      // Read & Write (7 Formats)
      {"zip", ".zip", "ZIP (Deflate / AES-256)", "ZIP Archive", "read_write",
       "Deflate, BZip2, AES-256", ":/filetypes/zip.png"},
      {"7z", ".7z", "7z (LZMA / LZMA2)", "7-Zip Archive", "read_write",
       "LZMA, LZMA2, PPMd, BCJ2", ":/filetypes/7z.png"},
      {"tar", ".tar", "TAR (POSIX Container)", "Tape Archive (TAR)",
       "read_write", "POSIX ustar, pax, GNU tar", ":/filetypes/tar.png"},
      {"tar.gz", ".tar.gz", "TAR+GZIP (.tgz)", "Gzip Tarball (TAR+GZIP)",
       "read_write", "RFC 1952 Deflate stream", ":/filetypes/tgz.png"},
      {"gz", ".gz", "GZIP (Single Stream)", "GNU Zip (GZIP)", "read_write",
       "RFC 1952 single data stream", ":/filetypes/gz.png"},
      {"tar.bz2", ".tar.bz2", "BZIP2+TAR (.tbz2)", "Bzip2 Tarball (BZIP2+TAR)",
       "read_write", "Burrows-Wheeler block sorting", ":/filetypes/tbz2.png"},
      {"tar.xz", ".tar.xz", "XZ+TAR (.txz)", "XZ Tarball (XZ+TAR)",
       "read_write", "LZMA2 multi-stream compression", ":/filetypes/txz.png"},

      // Read Only (6 Formats)
      {"rar", ".rar", "RAR (unRAR v7.0)", "Roshal Archive", "read_only",
       "unRAR 7.0 (RAR 1.5–5.0+)", ":/filetypes/rar.png"},
      {"iso", ".iso", "ISO (Optical Disc)", "Optical Disc Image (ISO)",
       "read_only", "ISO 9660, Joliet, UDF", ":/filetypes/iso.png"},
      {"cab", ".cab", "CAB (MS Cabinet)", "Microsoft Cabinet (CAB)",
       "read_only", "MSZIP, Quantum, LZX", ":/filetypes/cab.png"},
      {"img", ".img", "IMG (Raw Disk Image)", "Disk Image (IMG)", "read_only",
       "Sector-by-sector FAT/NTFS/ext4", ":/filetypes/img.png"},
      {"cpio", ".cpio", "CPIO (Unix initramfs)", "Unix CPIO Archive",
       "read_only", "POSIX SVR4 portable ASCII", ":/filetypes/cpio.png"},
      {"ar", ".ar", "AR / DEB (Unix Archiver)", "Unix Archiver (AR)",
       "read_only", "BSD / GNU ar, Debian .deb", ":/filetypes/ar.png"}};
}

void OptionsDialog::setupUi() {
  auto *mainLayout = new QVBoxLayout(this);
  mainLayout->setContentsMargins(14, 14, 14, 14);
  mainLayout->setSpacing(10);

  m_tabWidget = new QTabWidget(this);

  // =========================================================================
  // TAB 1: FILE FORMATS & ASSOCIATIONS
  // =========================================================================
  auto *tabFormats = new QWidget(this);
  auto *layoutFormats = new QVBoxLayout(tabFormats);
  layoutFormats->setContentsMargins(14, 12, 14, 12);
  layoutFormats->setSpacing(10);

  // Header Action Bar
  auto *headerBar = new QHBoxLayout();
  m_lblCount = new QLabel(this);
  m_lblCount->setStyleSheet(
      "color: #9ca3af; font-size: 11px; font-weight: 500;");
  headerBar->addWidget(m_lblCount);
  headerBar->addStretch();

  auto *btnSelectAll = new QPushButton(tr("Select All"), tabFormats);
  btnSelectAll->setStyleSheet(
      "padding: 3px 10px; font-size: 10px; min-height: 20px;");
  connect(btnSelectAll, &QPushButton::clicked, this,
          &OptionsDialog::onSelectAll);
  headerBar->addWidget(btnSelectAll);

  auto *btnSelectRW = new QPushButton(tr("+ R/W"), tabFormats);
  btnSelectRW->setStyleSheet(
      "padding: 3px 10px; font-size: 10px; min-height: 20px; color: #34d399;");
  connect(btnSelectRW, &QPushButton::clicked, this,
          &OptionsDialog::onSelectReadWrite);
  headerBar->addWidget(btnSelectRW);

  auto *btnSelectRO = new QPushButton(tr("+ R/O"), tabFormats);
  btnSelectRO->setStyleSheet(
      "padding: 3px 10px; font-size: 10px; min-height: 20px; color: #fbbf24;");
  connect(btnSelectRO, &QPushButton::clicked, this,
          &OptionsDialog::onSelectReadOnly);
  headerBar->addWidget(btnSelectRO);

  auto *btnClear = new QPushButton(tr("Clear"), tabFormats);
  btnClear->setStyleSheet(
      "padding: 3px 10px; font-size: 10px; min-height: 20px; color: #ef4444;");
  connect(btnClear, &QPushButton::clicked, this, &OptionsDialog::onClearAll);
  headerBar->addWidget(btnClear);

  layoutFormats->addLayout(headerBar);

  // Group 1: Read and Write Formats (7)
  auto *grpRW = new QGroupBox(
      tr("● Read and Write Formats (7) — Full Creation and Compression"),
      tabFormats);
  grpRW->setObjectName("grpRW");
  auto *gridRW = new QGridLayout(grpRW);
  gridRW->setContentsMargins(10, 16, 10, 10);
  gridRW->setHorizontalSpacing(16);
  gridRW->setVerticalSpacing(6);

  int rwIndex = 0;
  for (int i = 0; i < m_fileTypes.size(); ++i) {
    if (m_fileTypes[i].category == "read_write") {
      auto *chk = new QCheckBox(grpRW);
      chk->setIcon(QIcon(m_fileTypes[i].iconPath));
      chk->setIconSize(QSize(18, 18));
      chk->setText(QString("%1   %2")
                       .arg(m_fileTypes[i].ext, -10)
                       .arg(m_fileTypes[i].shortLabel));
      chk->setCursor(Qt::PointingHandCursor);
      connect(chk, &QCheckBox::toggled, this,
              &OptionsDialog::updateAssociationCount);
      m_fileTypes[i].checkBox = chk;

      gridRW->addWidget(chk, rwIndex / 2, rwIndex % 2);
      rwIndex++;
    }
  }
  layoutFormats->addWidget(grpRW);

  // Group 2: Read Only Formats (6)
  auto *grpRO = new QGroupBox(
      tr("● Read Only Formats (6) — Decompression and Inspection"), tabFormats);
  grpRO->setObjectName("grpRO");
  auto *gridRO = new QGridLayout(grpRO);
  gridRO->setContentsMargins(10, 16, 10, 10);
  gridRO->setHorizontalSpacing(16);
  gridRO->setVerticalSpacing(6);

  int roIndex = 0;
  for (int i = 0; i < m_fileTypes.size(); ++i) {
    if (m_fileTypes[i].category == "read_only") {
      auto *chk = new QCheckBox(grpRO);
      chk->setIcon(QIcon(m_fileTypes[i].iconPath));
      chk->setIconSize(QSize(18, 18));
      chk->setText(QString("%1   %2")
                       .arg(m_fileTypes[i].ext, -10)
                       .arg(m_fileTypes[i].shortLabel));
      chk->setCursor(Qt::PointingHandCursor);
      connect(chk, &QCheckBox::toggled, this,
              &OptionsDialog::updateAssociationCount);
      m_fileTypes[i].checkBox = chk;

      gridRO->addWidget(chk, roIndex / 2, roIndex % 2);
      roIndex++;
    }
  }
  layoutFormats->addWidget(grpRO);

  // Footnote with Shield icon
  auto *footnoteLayout = new QHBoxLayout();
  auto *lblShield = new QLabel(tabFormats);
  lblShield->setPixmap(QIcon(":/shield.svg").pixmap(15, 15));
  footnoteLayout->addWidget(lblShield);

  auto *lblNote = new QLabel(tr("Modifying system associations will request OS "
                                "elevated privileges on Apply."),
                             tabFormats);
  lblNote->setStyleSheet("color: #9ca3af; font-size: 10px;");
  footnoteLayout->addWidget(lblNote);
  footnoteLayout->addStretch();
  layoutFormats->addLayout(footnoteLayout);

  m_tabWidget->addTab(tabFormats, tr("File Formats"));

  // =========================================================================
  // TAB 2: APPEARANCE & VIEW CONTROLS
  // =========================================================================
  auto *tabAppearance = new QWidget(this);
  auto *layoutAppearance = new QVBoxLayout(tabAppearance);
  layoutAppearance->setContentsMargins(14, 14, 14, 14);
  layoutAppearance->setSpacing(14);

  // Archive View Controls
  auto *grpView = new QGroupBox(tr("Archive View Controls"), tabAppearance);
  auto *layoutView = new QVBoxLayout(grpView);
  layoutView->setContentsMargins(12, 16, 12, 12);
  layoutView->setSpacing(6);

  m_chkShowCheckboxes = new QCheckBox(
      tr("Show selection checkboxes in archive table rows"), grpView);
  QFont chkFont = m_chkShowCheckboxes->font();
  chkFont.setWeight(QFont::Medium);
  chkFont.setPointSize(10);
  m_chkShowCheckboxes->setFont(chkFont);
  m_chkShowCheckboxes->setCursor(Qt::PointingHandCursor);
  layoutView->addWidget(m_chkShowCheckboxes);

  auto *lblChkDesc = new QLabel(tr("Enables checkbox columns for touch and "
                                   "single-click multi-file batch operations."),
                                grpView);
  lblChkDesc->setStyleSheet(
      "color: #9ca3af; font-size: 10.5px; margin-left: 24px;");
  layoutView->addWidget(lblChkDesc);
  layoutAppearance->addWidget(grpView);

  // Interface Theme
  auto *grpTheme = new QGroupBox(tr("Theme"), tabAppearance);
  auto *layoutTheme = new QVBoxLayout(grpTheme);
  layoutTheme->setContentsMargins(12, 16, 12, 12);
  layoutTheme->setSpacing(8);

  m_themeGroup = new QButtonGroup(this);
  m_radDeviceTheme = new QRadioButton(
      tr("🖥️  Device setting (Follow system light/dark mode)"), grpTheme);
  m_radLightTheme =
      new QRadioButton(tr("☀️  Light mode (Clean bright appearance)"), grpTheme);
  m_radDarkTheme =
      new QRadioButton(tr("🌙  Dark mode (Fluent dark appearance)"), grpTheme);

  m_radDeviceTheme->setCursor(Qt::PointingHandCursor);
  m_radLightTheme->setCursor(Qt::PointingHandCursor);
  m_radDarkTheme->setCursor(Qt::PointingHandCursor);

  m_themeGroup->addButton(m_radDeviceTheme, 0);
  m_themeGroup->addButton(m_radLightTheme, 1);
  m_themeGroup->addButton(m_radDarkTheme, 2);

  layoutTheme->addWidget(m_radDeviceTheme);
  layoutTheme->addWidget(m_radLightTheme);
  layoutTheme->addWidget(m_radDarkTheme);
  layoutAppearance->addWidget(grpTheme);

  layoutAppearance->addStretch();
  m_tabWidget->addTab(tabAppearance, tr("Appearance"));

  mainLayout->addWidget(m_tabWidget);

  // =========================================================================
  // DIALOG ACTION BUTTONS (OK, Cancel, Apply)
  // =========================================================================
  auto *buttonLayout = new QHBoxLayout();
  buttonLayout->addStretch();

  m_btnOk = new QPushButton(tr("OK"), this);
  m_btnOk->setObjectName("btnPrimary");
  m_btnOk->setDefault(true);
  connect(m_btnOk, &QPushButton::clicked, this, &OptionsDialog::onOk);
  buttonLayout->addWidget(m_btnOk);

  m_btnCancel = new QPushButton(tr("Cancel"), this);
  connect(m_btnCancel, &QPushButton::clicked, this, &QDialog::reject);
  buttonLayout->addWidget(m_btnCancel);

  m_btnApply = new QPushButton(tr("Apply"), this);
  connect(m_btnApply, &QPushButton::clicked, this, &OptionsDialog::onApply);
  buttonLayout->addWidget(m_btnApply);

  mainLayout->addLayout(buttonLayout);
}

void OptionsDialog::loadSettings() {
  QSettings settings("MatterPackr", "MatterPackr");

  // File associations (default: all checked)
  QStringList defaultAssocs;
  for (const auto &item : m_fileTypes) {
    defaultAssocs.append(item.ext);
  }
  QStringList savedAssocs =
      settings.value("fileAssociations", defaultAssocs).toStringList();

  for (auto &item : m_fileTypes) {
    if (item.checkBox) {
      item.checkBox->setChecked(savedAssocs.contains(item.ext));
    }
  }

  // Appearance
  bool showChk = settings.value("showCheckboxes", false).toBool();
  m_chkShowCheckboxes->setChecked(showChk);

  QString theme = settings.value("themeMode", "dark").toString();
  if (theme == "device") {
    m_radDeviceTheme->setChecked(true);
  } else if (theme == "light") {
    m_radLightTheme->setChecked(true);
  } else {
    m_radDarkTheme->setChecked(true);
  }
}

void OptionsDialog::saveSettings() {
  QSettings settings("MatterPackr", "MatterPackr");
  settings.setValue("fileAssociations", selectedAssociations());
  settings.setValue("showCheckboxes", showCheckboxes());
  settings.setValue("themeMode", themeMode());
}

QStringList OptionsDialog::selectedAssociations() const {
  QStringList selected;
  for (const auto &item : m_fileTypes) {
    if (item.checkBox && item.checkBox->isChecked()) {
      selected.append(item.ext);
    }
  }
  return selected;
}

bool OptionsDialog::showCheckboxes() const {
  return m_chkShowCheckboxes->isChecked();
}

QString OptionsDialog::themeMode() const {
  if (m_radDeviceTheme->isChecked())
    return "device";
  if (m_radLightTheme->isChecked())
    return "light";
  return "dark";
}

void OptionsDialog::setCurrentTab(int index) {
  if (m_tabWidget && index >= 0 && index < m_tabWidget->count()) {
    m_tabWidget->setCurrentIndex(index);
  }
}

void OptionsDialog::onSelectAll() {
  for (auto &item : m_fileTypes) {
    if (item.checkBox)
      item.checkBox->setChecked(true);
  }
}

void OptionsDialog::onSelectReadWrite() {
  for (auto &item : m_fileTypes) {
    if (item.checkBox && item.category == "read_write") {
      item.checkBox->setChecked(true);
    }
  }
}

void OptionsDialog::onSelectReadOnly() {
  for (auto &item : m_fileTypes) {
    if (item.checkBox && item.category == "read_only") {
      item.checkBox->setChecked(true);
    }
  }
}

void OptionsDialog::onClearAll() {
  for (auto &item : m_fileTypes) {
    if (item.checkBox)
      item.checkBox->setChecked(false);
  }
}

void OptionsDialog::updateAssociationCount() {
  int checkedCount = 0;
  for (const auto &item : m_fileTypes) {
    if (item.checkBox && item.checkBox->isChecked()) {
      checkedCount++;
    }
  }
  m_lblCount->setText(tr("Associated: %1 of %2 formats")
                          .arg(checkedCount)
                          .arg(m_fileTypes.size()));
}

void OptionsDialog::onApply() {
  saveSettings();
  registerFileAssociations(selectedAssociations());
  emit settingsApplied();
}

void OptionsDialog::onOk() {
  onApply();
  accept();
}

void OptionsDialog::registerFileAssociations(const QStringList &extensions) {
  struct FormatAssociationInfo {
    QString ext;
    QString progId;
    QString description;
    QString mimeType;
    QStringList allMimeTypes;
    QStringList macosUtis;
    QStringList aliases;
  };

  const QVector<FormatAssociationInfo> supportedFormats = {
      {".zip",
       "MatterPackrZIP",
       "MatterPackr ZIP Archive",
       "application/zip",
       {"application/zip", "application/x-zip-compressed"},
       {"public.zip-archive", "com.pkware.zip-archive"},
       {".zip", ".zipx"}},

      {".7z",
       "MatterPackr7Z",
       "MatterPackr 7-Zip Archive",
       "application/x-7z-compressed",
       {"application/x-7z-compressed"},
       {"org.7-zip.7-zip-archive"},
       {".7z"}},

      {".tar",
       "MatterPackrTAR",
       "MatterPackr TAR Archive",
       "application/x-tar",
       {"application/x-tar"},
       {"public.tar-archive"},
       {".tar"}},

      {".tar.gz",
       "MatterPackrTGZ",
       "MatterPackr Gzip Tarball",
       "application/gzip",
       {"application/gzip", "application/x-compressed-tar",
        "application/x-gzip"},
       {"org.gnu.gnu-zip-tar-archive", "org.gnu.gnu-zip-archive"},
       {".tar.gz", ".tgz"}},

      {".gz",
       "MatterPackrGZ",
       "MatterPackr Gzip Stream",
       "application/gzip",
       {"application/gzip", "application/x-gzip"},
       {"org.gnu.gnu-zip-archive"},
       {".gz"}},

      {".tar.bz2",
       "MatterPackrTBZ2",
       "MatterPackr Bzip2 Tarball",
       "application/x-bzip2",
       {"application/x-bzip2", "application/x-bzip-compressed-tar"},
       {"public.bzip2-archive"},
       {".tar.bz2", ".tbz2", ".tbz"}},

      {".tar.xz",
       "MatterPackrTXZ",
       "MatterPackr XZ Tarball",
       "application/x-xz",
       {"application/x-xz", "application/x-xz-compressed-tar"},
       {"org.tukaani.xz-archive"},
       {".tar.xz", ".txz"}},

      {".rar",
       "MatterPackrRAR",
       "MatterPackr Roshal Archive",
       "application/vnd.rar",
       {"application/vnd.rar", "application/x-rar-compressed",
        "application/x-rar"},
       {"com.rarlab.rar-archive"},
       {".rar"}},

      {".iso",
       "MatterPackrISO",
       "MatterPackr Optical Disc Image",
       "application/x-iso9660-image",
       {"application/x-iso9660-image", "application/x-cd-image"},
       {"public.iso-image"},
       {".iso"}},

      {".cab",
       "MatterPackrCAB",
       "MatterPackr Cabinet Archive",
       "application/vnd.ms-cab-compressed",
       {"application/vnd.ms-cab-compressed"},
       {"com.microsoft.cab"},
       {".cab"}},

      {".img",
       "MatterPackrIMG",
       "MatterPackr Disk Image",
       "application/x-raw-disk-image",
       {"application/x-raw-disk-image"},
       {"public.disk-image"},
       {".img"}},

      {".cpio",
       "MatterPackrCPIO",
       "MatterPackr Unix CPIO Archive",
       "application/x-cpio",
       {"application/x-cpio"},
       {"public.cpio-archive"},
       {".cpio"}},

      {".ar",
       "MatterPackrAR",
       "MatterPackr Unix Archiver / DEB",
       "application/x-archive",
       {"application/x-archive", "application/x-debian-package"},
       {"public.archive", "org.debian.deb-archive"},
       {".ar"}}};

  QString appPath = QCoreApplication::applicationFilePath();
  if (appPath.isEmpty())
    return;

#if defined(Q_OS_WIN)
  QString winAppPath = QDir::toNativeSeparators(appPath);

  // Register Application Capabilities for Default Apps in Windows
  QSettings capSettings(
      "HKEY_CURRENT_USER\\Software\\MatterPackr\\Capabilities",
      QSettings::NativeFormat);
  capSettings.setValue(
      "ApplicationDescription",
      "Modern Archive Manager for ZIP, 7Z, TAR, RAR, and more");
  capSettings.setValue("ApplicationName", "MatterPackr");

  QSettings regApp("HKEY_CURRENT_USER\\Software\\RegisteredApplications",
                   QSettings::NativeFormat);
  regApp.setValue("MatterPackr", "Software\\MatterPackr\\Capabilities");

  // OpenWith and Applications entry
  QString appExeName = QFileInfo(appPath).fileName();
  QSettings appShellSettings(
      QString("HKEY_CURRENT_USER\\Software\\Classes\\Applications\\%"
              "1\\shell\\open\\command")
          .arg(appExeName),
      QSettings::NativeFormat);
  appShellSettings.setValue(".", QString("\"%1\" \"%%1\"").arg(winAppPath));

  for (const auto &fmt : supportedFormats) {
    bool isEnabled = extensions.contains(fmt.ext.trimmed().toLower());

    if (isEnabled) {
      // Locate custom icon file for format
      QString iconsDir = QDir(QFileInfo(appPath).dir()).filePath("icons/filetypes");
      if (!QDir(iconsDir).exists()) {
        QString devDir = QDir(QFileInfo(appPath).dir()).filePath("../resources/filetypes");
        if (QDir(devDir).exists()) {
          iconsDir = QDir(devDir).canonicalPath();
        }
      }

      QString cleanExt = fmt.ext.startsWith('.') ? fmt.ext.mid(1) : fmt.ext;
      QString specificIcon = QDir::toNativeSeparators(QDir(iconsDir).filePath(cleanExt + ".ico"));
      QString iconVal = QFile::exists(specificIcon) ? QString("%1,0").arg(specificIcon) : QString("%1,0").arg(winAppPath);

      // Register ProgId
      QSettings progIdSettings(
          QString("HKEY_CURRENT_USER\\Software\\Classes\\%1").arg(fmt.progId),
          QSettings::NativeFormat);
      progIdSettings.setValue(".", fmt.description);
      progIdSettings.setValue("DefaultIcon/.", iconVal);
      progIdSettings.setValue("shell/open/command/.",
                              QString("\"%1\" \"%%1\"").arg(winAppPath));

      // Capabilities FileAssociations
      QSettings capAssoc(
          "HKEY_CURRENT_"
          "USER\\Software\\MatterPackr\\Capabilities\\FileAssociations",
          QSettings::NativeFormat);
      capAssoc.setValue(fmt.ext, fmt.progId);

      // Register extension and aliases
      for (const QString &subExt : fmt.aliases) {
        QSettings extSettings(
            QString("HKEY_CURRENT_USER\\Software\\Classes\\%1").arg(subExt),
            QSettings::NativeFormat);
        extSettings.setValue(".", fmt.progId);
        extSettings.setValue("DefaultIcon/.", iconVal);

        QSettings openWithSettings(
            QString("HKEY_CURRENT_USER\\Software\\Classes\\%1\\OpenWithProgids")
                .arg(subExt),
            QSettings::NativeFormat);
        openWithSettings.setValue(fmt.progId, "");
      }
    } else {
      // Unregister if currently pointed to MatterPackr
      for (const QString &subExt : fmt.aliases) {
        QSettings extSettings(
            QString("HKEY_CURRENT_USER\\Software\\Classes\\%1").arg(subExt),
            QSettings::NativeFormat);
        if (extSettings.value(".").toString() == fmt.progId) {
          extSettings.remove(".");
        }
        QSettings openWithSettings(
            QString("HKEY_CURRENT_USER\\Software\\Classes\\%1\\OpenWithProgids")
                .arg(subExt),
            QSettings::NativeFormat);
        openWithSettings.remove(fmt.progId);
      }
      QSettings capAssoc(
          "HKEY_CURRENT_"
          "USER\\Software\\MatterPackr\\Capabilities\\FileAssociations",
          QSettings::NativeFormat);
      capAssoc.remove(fmt.ext);
    }
  }

  // Refresh Windows Explorer shell icons and associations
  SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_IDLIST, NULL, NULL);

#elif defined(Q_OS_LINUX)
  // 1. Create or update user desktop entry
  // ~/.local/share/applications/matterpackr.desktop
  QString appsDir =
      QStandardPaths::writableLocation(QStandardPaths::ApplicationsLocation);
  if (appsDir.isEmpty()) {
    appsDir = QDir::homePath() + "/.local/share/applications";
  }
  QDir().mkpath(appsDir);

  QString desktopFilePath = appsDir + "/matterpackr.desktop";

  // Collect all supported MIME types for the desktop file
  QStringList allSupportedMimes;
  for (const auto &fmt : supportedFormats) {
    for (const QString &mime : fmt.allMimeTypes) {
      if (!allSupportedMimes.contains(mime)) {
        allSupportedMimes.append(mime);
      }
    }
  }

  QFile desktopFile(desktopFilePath);
  if (desktopFile.open(QIODevice::WriteOnly | QIODevice::Text)) {
    QTextStream out(&desktopFile);
    out << "[Desktop Entry]\n";
    out << "Type=Application\n";
    out << "Name=MatterPackr\n";
    out << "GenericName=Archive Manager\n";
    out << "Comment=Modern Archive Manager for ZIP, 7Z, TAR, RAR, and more\n";
    out << "Exec=\"" << appPath << "\" %F\n";
    out << "Icon=matterpackr\n";
    out << "Terminal=false\n";
    out << "Categories=Utility;Archiving;Compression;\n";
    out << "MimeType=" << allSupportedMimes.join(";") << ";\n";
    out << "StartupNotify=true\n";
    desktopFile.close();
  }

  // 2. Update ~/.config/mimeapps.list
  QString configDir =
      QStandardPaths::writableLocation(QStandardPaths::ConfigLocation);
  if (configDir.isEmpty()) {
    configDir = QDir::homePath() + "/.config";
  }
  QDir().mkpath(configDir);

  QString mimeappsPath = configDir + "/mimeapps.list";
  QStringList lines;
  QFile mimeFile(mimeappsPath);
  if (mimeFile.open(QIODevice::ReadOnly | QIODevice::Text)) {
    QTextStream in(&mimeFile);
    while (!in.atEnd()) {
      lines.append(in.readLine());
    }
    mimeFile.close();
  }

  // Set of mimes to enable / disable
  QStringList enabledMimes;
  QStringList disabledMimes;
  for (const auto &fmt : supportedFormats) {
    bool isEnabled = extensions.contains(fmt.ext.trimmed().toLower());
    for (const QString &mime : fmt.allMimeTypes) {
      if (isEnabled) {
        if (!enabledMimes.contains(mime))
          enabledMimes.append(mime);
      } else {
        if (!disabledMimes.contains(mime))
          disabledMimes.append(mime);
      }
    }
  }

  auto updateSection = [&](const QString &sectionName) {
    int secIdx = -1;
    for (int i = 0; i < lines.size(); ++i) {
      if (lines[i].trimmed() == sectionName) {
        secIdx = i;
        break;
      }
    }
    if (secIdx == -1) {
      lines.append(sectionName);
      secIdx = lines.size() - 1;
    }

    // Remove disabled mimes pointing to matterpackr.desktop
    int nextSec = lines.size();
    for (int i = secIdx + 1; i < lines.size(); ++i) {
      if (lines[i].trimmed().startsWith("[") &&
          lines[i].trimmed().endsWith("]")) {
        nextSec = i;
        break;
      }
    }

    for (int i = nextSec - 1; i > secIdx; --i) {
      QString line = lines[i].trimmed();
      for (const QString &dMime : disabledMimes) {
        if (line.startsWith(dMime + "=") &&
            line.contains("matterpackr.desktop")) {
          lines.removeAt(i);
          break;
        }
      }
    }

    // Add enabled mimes
    for (const QString &eMime : enabledMimes) {
      bool found = false;
      for (int i = secIdx + 1; i < lines.size(); ++i) {
        if (lines[i].trimmed().startsWith("[") &&
            lines[i].trimmed().endsWith("]"))
          break;
        if (lines[i].trimmed().startsWith(eMime + "=")) {
          if (!lines[i].contains("matterpackr.desktop")) {
            lines[i] = QString("%1=matterpackr.desktop;%2")
                           .arg(eMime)
                           .arg(lines[i].section('=', 1));
          }
          found = true;
          break;
        }
      }
      if (!found) {
        lines.insert(secIdx + 1, QString("%1=matterpackr.desktop;").arg(eMime));
      }
    }
  };

  updateSection("[Default Applications]");
  updateSection("[Added Associations]");

  if (mimeFile.open(QIODevice::WriteOnly | QIODevice::Text)) {
    QTextStream out(&mimeFile);
    for (const QString &line : lines) {
      out << line << "\n";
    }
    mimeFile.close();
  }

  // 3. Invoke standard xdg-mime commands
  for (const QString &mime : enabledMimes) {
    QProcess::startDetached("xdg-mime", QStringList()
                                            << "default"
                                            << "matterpackr.desktop" << mime);
  }

  // 4. Update desktop database
  QProcess::startDetached("update-desktop-database", QStringList() << appsDir);

#elif defined(Q_OS_MACOS) || defined(Q_OS_MAC)
  CFStringRef bundleId = CFSTR("com.matterpackr.archiver");

  // Register application with Launch Services
  CFURLRef appUrl = CFURLCreateWithFileSystemPath(
      kCFAllocatorDefault, appPath.toCFString(), kCFURLPOSIXPathStyle, true);
  if (appUrl) {
    LSRegisterURL(appUrl, true);
    CFRelease(appUrl);
  }

  // Set default role handler for each UTI
  for (const auto &fmt : supportedFormats) {
    bool isEnabled = extensions.contains(fmt.ext.trimmed().toLower());
    if (isEnabled) {
      for (const QString &uti : fmt.macosUtis) {
        CFStringRef utiRef = uti.toCFString();
        LSSetDefaultRoleHandlerForContentType(utiRef, kLSRolesAll, bundleId);
        CFRelease(utiRef);

        // If duti CLI tool is available, invoke it as well
        QProcess::startDetached(
            "duti", QStringList()
                        << "-s" << "com.matterpackr.archiver" << uti << "all");
      }
      for (const QString &subExt : fmt.aliases) {
        QString cleanExt = subExt;
        if (cleanExt.startsWith('.'))
          cleanExt = cleanExt.mid(1);
        QProcess::startDetached(
            "duti", QStringList() << "-s" << "com.matterpackr.archiver"
                                  << cleanExt << "all");
      }
    }
  }
#endif
}
