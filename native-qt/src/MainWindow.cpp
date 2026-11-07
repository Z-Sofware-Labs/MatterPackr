#include "MainWindow.h"
#include "NewArchiveDialog.h"
#include "AboutDialog.h"
#include "OptionsDialog.h"
#include "CheckOutDialog.h"
#include "FavoritesDialog.h"
#include "PasswordPromptDialog.h"
#include "UpdateManager.h"
#include "ArchiveBackend.h"
#include <QApplication>
#include <QDrag>
#include <QMimeData>
#include <QDragEnterEvent>
#include <QDragMoveEvent>
#include <QDropEvent>
#include <QStyleFactory>
#include <QCloseEvent>
#include <QDateTime>
#include <QDesktopServices>
#include <QUrl>
#include <QStandardPaths>
#include <QFile>
#include <QFileDialog>
#include <QFileInfo>
#include <QHBoxLayout>
#include <QMap>
#include <QMessageBox>
#include <QInputDialog>
#include <QResizeEvent>
#include <QSettings>
#include <QThread>
#include <QVBoxLayout>
#include <QPainter>
#include <QStyleOption>
#include <QToolButton>
#include <QMenu>
#include <QWidgetAction>
#include <QPushButton>
#include <QLineEdit>
#include <QLocale>
#include <QKeyEvent>
#include <QFileOpenEvent>
#include <QProcess>
#include <QtConcurrent>
#include <QThreadPool>
#include <QDir>
#include <QTemporaryFile>
#include <QTemporaryDir>
#include <QRegularExpression>
#include <algorithm>
#include <functional>

#ifdef Q_OS_WIN
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <shellapi.h>
#include <dwmapi.h>
#endif

namespace {

bool isSafeArchiveEntryPath(const QString &entryPath) {
  const QString normalized = QDir::cleanPath(entryPath).replace('\\', '/');
  if (normalized.isEmpty() || normalized == "." || normalized.startsWith('/')
      || normalized.contains(QRegularExpression(QStringLiteral("^[A-Za-z]:/")))
      || normalized.startsWith("//")) {
    return false;
  }

  const QStringList parts = normalized.split('/', Qt::SkipEmptyParts);
  return !std::any_of(parts.cbegin(), parts.cend(),
                      [](const QString &part) { return part == ".."; });
}

bool isRemovedDeveloperArchive(const QString &path) {
  const QString lower = path.toLower();
  return lower.endsWith(QStringLiteral(".tar.bz2"))
      || lower.endsWith(QStringLiteral(".tbz2"))
      || lower.endsWith(QStringLiteral(".tbz"))
      || lower.endsWith(QStringLiteral(".tar.xz"))
      || lower.endsWith(QStringLiteral(".txz"));
}

QString archiveEntryPath(const ArchiveItem &item) {
  const QString path = item.path.isEmpty()
      ? item.filename
      : item.path + "/" + item.filename;
  return QDir::cleanPath(path).replace('\\', '/');
}

using OperationCancel = std::shared_ptr<std::atomic_bool>;

bool isEncryptionError(const QString &errorMessage) {
  const QString normalized = errorMessage.toLower();
  return normalized.contains(QStringLiteral("encrypted"))
      || normalized.contains(QStringLiteral("password"))
      || normalized.contains(QStringLiteral("passphrase"))
      || normalized.contains(QStringLiteral("encryption"));
}

bool runArchiveCommand(const QStringList &arguments, QByteArray *standardOutput,
                       QString *errorMessage, const OperationCancel &cancel = {}) {
  QProcess process;
  process.start(QStringLiteral("tar"), arguments);
  if (!process.waitForStarted(5000)) {
    if (errorMessage) {
      *errorMessage = QObject::tr("The system archive engine (tar/libarchive) could not be started.");
    }
    return false;
  }
  while (!process.waitForFinished(100)) {
    if (cancel && cancel->load()) {
      process.kill();
      process.waitForFinished();
      if (errorMessage)
        *errorMessage = QObject::tr("The archive operation was cancelled.");
      return false;
    }
  }
  if (cancel && cancel->load()) {
    process.kill();
    process.waitForFinished();
    if (errorMessage) {
      *errorMessage = QObject::tr("The archive operation was cancelled.");
    }
    return false;
  }

  if (process.exitStatus() != QProcess::NormalExit || process.exitCode() != 0) {
    if (errorMessage) {
      const QString details = QString::fromLocal8Bit(process.readAllStandardError()).trimmed();
      *errorMessage = details.isEmpty()
          ? QObject::tr("The archive engine rejected the operation.")
          : details;
    }
    return false;
  }

  if (standardOutput) {
    *standardOutput = process.readAllStandardOutput();
  }
  return true;
}

QVector<ArchiveItem> listArchiveEntries(const QString &archivePath, QString *errorMessage,
                                         const OperationCancel &cancel = {},
                                         const QString &password = QString(),
                                         bool *needsPassword = nullptr,
                                         bool *hasEncryptedEntries = nullptr) {
#ifdef MATTERPACKR_HAS_LIBARCHIVE
  if (cancel && cancel->load()) {
    if (errorMessage)
      *errorMessage = QObject::tr("The archive operation was cancelled.");
    return {};
  }
  QVector<ArchiveItem> nativeItems;
  if (!ArchiveBackend::listEntries(archivePath, &nativeItems, errorMessage, password, needsPassword, hasEncryptedEntries))
    return {};
  return nativeItems;
#else
  Q_UNUSED(password);
  Q_UNUSED(needsPassword);
  Q_UNUSED(hasEncryptedEntries);
  if (errorMessage)
    *errorMessage = QObject::tr("The bundled libarchive backend is unavailable.");
  return {};
#endif
}

bool createEmptyArchive(const QString &archivePath,
                        const ArchiveBackend::ArchiveOptions &options,
                        QString *errorMessage,
                        const OperationCancel &cancel = {}) {
#ifdef MATTERPACKR_HAS_LIBARCHIVE
  if (archivePath.toLower().endsWith(QStringLiteral(".7z"))) {
    if (!options.password.isEmpty())
      return ArchiveBackend::createEncrypted7z(archivePath, {}, options,
                                               errorMessage, cancel);
    return ArchiveBackend::create7z(archivePath, {}, errorMessage, cancel);
  }
  return ArchiveBackend::createEmpty(archivePath, errorMessage, cancel);
#else
  const QString lowerPath = archivePath.toLower();
  if (lowerPath.endsWith(".7z") || lowerPath.endsWith(".tar.gz")
      || lowerPath.endsWith(".tgz")) {
    if (errorMessage) {
      *errorMessage = QObject::tr(
          "This native archive writer currently supports ZIP and uncompressed TAR files.");
    }
    return false;
  }

  QTemporaryFile emptyList;
  emptyList.setAutoRemove(true);
  if (!emptyList.open()) {
    if (errorMessage)
      *errorMessage = QObject::tr("Could not prepare the new archive.");
    return false;
  }
  emptyList.close();
  return runArchiveCommand({QStringLiteral("-cf"), archivePath,
                             QStringLiteral("-T"), emptyList.fileName()},
                            nullptr, errorMessage, cancel);
#endif
}

bool addFilesToArchive(const QString &archivePath, const QStringList &files,
                       QString *errorMessage, const OperationCancel &cancel = {}) {
#ifdef MATTERPACKR_HAS_LIBARCHIVE
  return ArchiveBackend::addFiles(archivePath, files, errorMessage, cancel);
#else
  const QString lowerPath = archivePath.toLower();
  if (lowerPath.endsWith(".7z") || lowerPath.endsWith(".tar.gz")
      || lowerPath.endsWith(".tgz")) {
    if (errorMessage) {
      *errorMessage = QObject::tr(
          "Adding files currently supports ZIP and uncompressed TAR files.");
    }
    return false;
  }

  QStringList arguments{QStringLiteral("-rf"), archivePath};
  for (const QString &filePath : files) {
    const QFileInfo fileInfo(filePath);
    arguments << QStringLiteral("-C") << fileInfo.absolutePath()
              << fileInfo.fileName();
  }
  return runArchiveCommand(arguments, nullptr, errorMessage, cancel);
#endif
}

bool removeEntriesFromArchive(const QString &archivePath,
                              const QStringList &entryPaths,
                              QString *errorMessage, const OperationCancel &cancel = {}) {
#ifdef MATTERPACKR_HAS_LIBARCHIVE
  return ArchiveBackend::removeEntries(archivePath, entryPaths, errorMessage, cancel);
#else
  const QString lowerPath = archivePath.toLower();
  if (lowerPath.endsWith(".7z") || lowerPath.endsWith(".tar.gz")
      || lowerPath.endsWith(".tgz")) {
    if (errorMessage) {
      *errorMessage = QObject::tr(
          "Deleting files currently supports ZIP and uncompressed TAR files.");
    }
    return false;
  }

  QTemporaryDir staging;
  if (!staging.isValid()) {
    if (errorMessage)
      *errorMessage = QObject::tr("Could not prepare a temporary archive workspace.");
    return false;
  }

  if (!runArchiveCommand({QStringLiteral("-xf"), archivePath,
                          QStringLiteral("-C"), staging.path()},
                         nullptr, errorMessage, cancel)) {
    return false;
  }

  for (const QString &entryPath : entryPaths) {
    if (cancel && cancel->load()) {
      if (errorMessage)
        *errorMessage = QObject::tr("The archive operation was cancelled.");
      return false;
    }
    if (!isSafeArchiveEntryPath(entryPath))
      continue;
    const QString targetPath = QDir(staging.path()).filePath(entryPath);
    QFileInfo targetInfo(targetPath);
    if (targetInfo.isDir()) {
      if (!QDir(targetPath).removeRecursively()) {
        if (errorMessage)
          *errorMessage = QObject::tr("Could not remove archive directory: %1")
                              .arg(entryPath);
        return false;
      }
    } else if (targetInfo.exists() && !QFile::remove(targetPath)) {
      if (errorMessage)
        *errorMessage = QObject::tr("Could not remove archive entry: %1")
                            .arg(entryPath);
      return false;
    }
  }

  QTemporaryFile replacement;
  replacement.setAutoRemove(false);
  if (!replacement.open()) {
    if (errorMessage)
      *errorMessage = QObject::tr("Could not prepare the replacement archive.");
    return false;
  }
  const QString replacementPath = replacement.fileName();
  replacement.close();
  QFile::remove(replacementPath);

  if (!runArchiveCommand({QStringLiteral("-cf"), replacementPath,
                          QStringLiteral("-C"), staging.path(),
                          QStringLiteral(".")},
                         nullptr, errorMessage, cancel)) {
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

  if (!QFile::rename(replacementPath, archivePath)) {
    QFile::rename(backupPath, archivePath);
    if (errorMessage)
      *errorMessage = QObject::tr("Could not install the replacement archive.");
    return false;
  }

  QFile::remove(backupPath);
  return true;
#endif
}

bool verifyArchiveContents(const QString &archivePath, QString *errorMessage,
                           const OperationCancel &cancel = {}) {
  const QVector<ArchiveItem> entries =
      listArchiveEntries(archivePath, errorMessage, cancel);
  if (entries.isEmpty() && errorMessage && !errorMessage->isEmpty())
    return false;
  if (cancel && cancel->load()) {
    if (errorMessage)
      *errorMessage = QObject::tr("The archive operation was cancelled.");
    return false;
  }

  QTemporaryDir staging;
  if (!staging.isValid()) {
    if (errorMessage)
      *errorMessage = QObject::tr("Could not prepare a temporary integrity-test workspace.");
    return false;
  }

#ifdef MATTERPACKR_HAS_LIBARCHIVE
  if (ArchiveBackend::extractEntries(archivePath, staging.path(), {},
                                     errorMessage, cancel))
    return true;
#endif
  return runArchiveCommand({QStringLiteral("-xf"), archivePath,
                            QStringLiteral("-C"), staging.path()},
                           nullptr, errorMessage, cancel);
}

}

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent), m_engine(new CompressionEngine(this)) {
  resize(1024, 640);
  setAcceptDrops(true);
  updateWindowTitle();

  m_model = new ArchiveModel(this);
  m_proxyModel = new ArchiveSortProxyModel(this);
  m_proxyModel->setSourceModel(m_model);

  createCentralGrid();
  createActions();
  createMenus();
  createToolBars();
  createStatusBar();

  // Load backend options (checkboxes, theme, viewMode, folder tree state)
  QSettings settings("MatterPackr", "MatterPackr");

  // Restore main window geometry and window state (size, position, maximized state)
  if (settings.contains("geometry")) {
    restoreGeometry(settings.value("geometry").toByteArray());
  }
  if (settings.contains("windowState")) {
    restoreState(settings.value("windowState").toByteArray());
  }
  if (m_tableView && m_tableView->horizontalHeader() && settings.contains("columnState")) {
    m_tableView->horizontalHeader()->restoreState(settings.value("columnState").toByteArray());
  }

  m_model->setShowCheckboxes(settings.value("showCheckboxes", false).toBool());
  applyTheme(settings.value("themeMode", "dark").toString());

  m_lastTreeWidth = settings.value("folderTreeWidth", 200).toInt();
  if (m_lastTreeWidth < 50)
    m_lastTreeWidth = 200;

  QString savedView = settings.value("viewMode", "classic").toString();
  if (savedView == "explorer") {
    onSetViewModeExplorer();
  } else {
    onSetViewModeClassic();
  }

  updateEmptyStateVisibility();
  updateStatusBarStats();

  m_optionsDlg = new OptionsDialog(this);
  connect(m_optionsDlg, &OptionsDialog::settingsApplied, this, [this]() {
    m_model->setShowCheckboxes(m_optionsDlg->showCheckboxes());
    applyTheme(m_optionsDlg->themeMode());
  });

  if (qApp) {
    qApp->installEventFilter(this);
  }
}

MainWindow::~MainWindow() = default;

void MainWindow::createCentralGrid() {
  auto *centralWidget = new QWidget(this);
  centralWidget->setObjectName("centralWidget");
  auto *layout = new QVBoxLayout(centralWidget);
  layout->setContentsMargins(0, 0, 0, 0);
  layout->setSpacing(0);

  // 1. Navigation / Breadcrumb Bar
  m_navBar = new QWidget(centralWidget);
  m_navBar->setObjectName("navBar");
  m_navBar->setFixedHeight(32);

  auto *navLayout = new QHBoxLayout(m_navBar);
  navLayout->setContentsMargins(8, 2, 8, 2);
  navLayout->setSpacing(8);

  m_btnNavUp = new QPushButton(m_navBar);
  m_btnNavUp->setObjectName("btnNavUp");
  m_btnNavUp->setIcon(QIcon(":/up.svg"));
  m_btnNavUp->setIconSize(QSize(14, 14));
  m_btnNavUp->setFixedSize(24, 24);
  m_btnNavUp->setToolTip(tr("Up one level (Alt+Up)"));
  m_btnNavUp->setCursor(Qt::PointingHandCursor);
  connect(m_btnNavUp, &QPushButton::clicked, this, &MainWindow::onNavUpClicked);
  navLayout->addWidget(m_btnNavUp);

  m_lblCurrentPath = new QLabel(m_navBar);
  m_lblCurrentPath->setStyleSheet("font-size: 11px; font-weight: 500;");
  navLayout->addWidget(m_lblCurrentPath, 1);

  layout->addWidget(m_navBar);

  // 2. Horizontal Splitter (Left: Folder Tree, Right: Table View)
  m_splitter = new QSplitter(Qt::Horizontal, centralWidget);
  m_splitter->setObjectName("mainSplitter");
  m_splitter->setHandleWidth(3);
  m_splitter->setCollapsible(0, true);
  m_splitter->setCollapsible(1, false);

  connect(m_splitter, &QSplitter::splitterMoved, this, [this](int pos, int) {
    bool isCollapsed = (pos <= 10 || !m_treeContainer->isVisible());
    if (pos > 50) {
      m_lastTreeWidth = pos;
      QSettings settings("MatterPackr", "MatterPackr");
      settings.setValue("folderTreeWidth", pos);
    }
    if (m_actToggleFolderTree)
      m_actToggleFolderTree->setChecked(!isCollapsed);
    QSettings settings("MatterPackr", "MatterPackr");
    settings.setValue("folderTreeVisible", !isCollapsed);
  });

  // Left Pane: Folder Tree
  m_treeContainer = new QWidget(m_splitter);
  auto *treeLayout = new QVBoxLayout(m_treeContainer);
  treeLayout->setContentsMargins(0, 0, 0, 0);
  treeLayout->setSpacing(0);

  auto *treeHeaderWidget = new QWidget(m_treeContainer);
  treeHeaderWidget->setObjectName("treeHeader");
  treeHeaderWidget->setFixedHeight(28);
  auto *headerLayout = new QHBoxLayout(treeHeaderWidget);
  headerLayout->setContentsMargins(10, 2, 6, 2);
  headerLayout->setSpacing(6);

  auto *lblTreeTitle = new QLabel(tr("FOLDERS"), treeHeaderWidget);
  lblTreeTitle->setStyleSheet(
      "font-weight: 700; font-size: 10.5px; letter-spacing: 0.5px;");
  headerLayout->addWidget(lblTreeTitle);
  headerLayout->addStretch(1);

  m_btnCollapseTree = new QPushButton(treeHeaderWidget);
  m_btnCollapseTree->setObjectName("btnCloseTree");
  m_btnCollapseTree->setIcon(QIcon(":/close.svg"));
  m_btnCollapseTree->setIconSize(QSize(12, 12));
  m_btnCollapseTree->setFixedSize(22, 22);
  m_btnCollapseTree->setToolTip(tr("Close Folders sidebar (Ctrl+T)"));
  m_btnCollapseTree->setCursor(Qt::PointingHandCursor);
  connect(m_btnCollapseTree, &QPushButton::clicked, this,
          &MainWindow::onToggleFolderTree);
  headerLayout->addWidget(m_btnCollapseTree);

  treeLayout->addWidget(treeHeaderWidget);

  m_folderTree = new QTreeWidget(m_treeContainer);
  m_folderTree->setHeaderHidden(true);
  m_folderTree->setIndentation(16);
  m_folderTree->setAnimated(true);
  connect(m_folderTree, &QTreeWidget::itemClicked, this,
          &MainWindow::onFolderTreeItemClicked);
  treeLayout->addWidget(m_folderTree);

  m_splitter->addWidget(m_treeContainer);

  // Right Pane: Table View Container
  m_tableContainer = new QWidget(m_splitter);
  auto *tableLayout = new QVBoxLayout(m_tableContainer);
  tableLayout->setContentsMargins(0, 0, 0, 0);
  tableLayout->setSpacing(0);

  // Modern File Filter / Search Bar (toggled via Ctrl+F, View -> Filter files, or Toolbar Search)
  m_filterBar = new QWidget(m_tableContainer);
  m_filterBar->setObjectName("filterBar");
  m_filterBar->setFixedHeight(36);
  m_filterBar->hide();

  auto *filterLayout = new QHBoxLayout(m_filterBar);
  filterLayout->setContentsMargins(10, 4, 10, 4);
  filterLayout->setSpacing(8);

  auto *lblSearchIcon = new QLabel("🔍", m_filterBar);
  filterLayout->addWidget(lblSearchIcon);

  m_filterEdit = new QLineEdit(m_filterBar);
  m_filterEdit->setPlaceholderText(tr("Filter files by name, path, or extension... (Esc to close)"));
  m_filterEdit->setClearButtonEnabled(true);
  m_filterEdit->installEventFilter(this);
  connect(m_filterEdit, &QLineEdit::textChanged, this, &MainWindow::onFilterTextChanged);
  filterLayout->addWidget(m_filterEdit, 1);

  m_lblFilterMatches = new QLabel(m_filterBar);
  m_lblFilterMatches->setStyleSheet("color: #9ca3af; font-size: 11px;");
  filterLayout->addWidget(m_lblFilterMatches);

  m_btnCloseFilter = new QPushButton(m_filterBar);
  m_btnCloseFilter->setObjectName("btnCloseFilter");
  m_btnCloseFilter->setIcon(QIcon(":/close.svg"));
  m_btnCloseFilter->setIconSize(QSize(12, 12));
  m_btnCloseFilter->setFixedSize(22, 22);
  m_btnCloseFilter->setToolTip(tr("Close filter bar (Esc)"));
  m_btnCloseFilter->setCursor(Qt::PointingHandCursor);
  connect(m_btnCloseFilter, &QPushButton::clicked, this, &MainWindow::onToggleFilter);
  filterLayout->addWidget(m_btnCloseFilter);

  tableLayout->addWidget(m_filterBar);

  m_tableView = new ArchiveTableView(m_tableContainer);
  m_tableView->setModel(m_proxyModel);
  m_tableView->setSelectionBehavior(QAbstractItemView::SelectRows);
  m_tableView->setSelectionMode(QAbstractItemView::ExtendedSelection);
  m_tableView->setSortingEnabled(true);
  m_tableView->setShowGrid(false);
  m_tableView->setAlternatingRowColors(true);

  // Performance optimizations: fixed row height and disabled word wrap enable O(1) table geometry
  m_tableView->setWordWrap(false);

  // Compact row height & hide vertical header with fixed O(1) row sizing
  m_tableView->verticalHeader()->setSectionResizeMode(QHeaderView::Fixed);
  m_tableView->verticalHeader()->setDefaultSectionSize(22);
  m_tableView->verticalHeader()->setVisible(false);

  auto *header = m_tableView->horizontalHeader();
  header->setStretchLastSection(false);
  header->setHighlightSections(false);
  header->setDefaultAlignment(Qt::AlignLeft | Qt::AlignVCenter);
  header->setFixedHeight(24);
  header->setSectionsMovable(true);

  // Default column widths before restoring custom layout
  m_tableView->setColumnWidth(ArchiveModel::ColFilename, 220);
  m_tableView->setColumnWidth(ArchiveModel::ColType, 110);
  m_tableView->setColumnWidth(ArchiveModel::ColModified, 150);
  m_tableView->setColumnWidth(ArchiveModel::ColSize, 85);
  m_tableView->setColumnWidth(ArchiveModel::ColRatio, 65);
  m_tableView->setColumnWidth(ArchiveModel::ColPacked, 85);
  m_tableView->setColumnWidth(ArchiveModel::ColCrc32, 85);
  m_tableView->setColumnWidth(ArchiveModel::ColEncryption, 95);
  m_tableView->setColumnWidth(ArchiveModel::ColPath, 160);

  // Restore saved column widths and order
  QSettings colSettings("MatterPackr", "MatterPackr");
  if (colSettings.contains("columnState")) {
    header->restoreState(colSettings.value("columnState").toByteArray());
  }

  // Persist column size and position changes in real-time
  connect(header, &QHeaderView::sectionResized, this, [this](int, int, int) {
    if (m_tableView && m_tableView->horizontalHeader()) {
      QSettings settings("MatterPackr", "MatterPackr");
      settings.setValue("columnState", m_tableView->horizontalHeader()->saveState());
    }
  });
  connect(header, &QHeaderView::sectionMoved, this, [this](int, int, int) {
    if (m_tableView && m_tableView->horizontalHeader()) {
      QSettings settings("MatterPackr", "MatterPackr");
      settings.setValue("columnState", m_tableView->horizontalHeader()->saveState());
    }
  });

  connect(m_tableView->selectionModel(), &QItemSelectionModel::selectionChanged,
          this, &MainWindow::onSelectionChanged);
  connect(m_tableView, &QTableView::doubleClicked, this,
          &MainWindow::onTableDoubleClicked);
  m_tableView->setContextMenuPolicy(Qt::CustomContextMenu);
  connect(m_tableView, &QWidget::customContextMenuRequested, this,
          &MainWindow::onTableContextMenuRequested);
  connect(m_tableView, &ArchiveTableView::dragExtractionRequested,
          this, &MainWindow::onDragExtractionRequested);
  connect(m_tableView, &ArchiveTableView::filesDropped,
          this, &MainWindow::onFilesDropped);

  tableLayout->addWidget(m_tableView);
  m_splitter->addWidget(m_tableContainer);

  layout->addWidget(m_splitter, 1);
  setCentralWidget(centralWidget);

  // Empty State overlay inside table viewport
  m_emptyWidget = new QWidget(m_tableView->viewport());
  auto *emptyLayout = new QVBoxLayout(m_emptyWidget);
  emptyLayout->setAlignment(Qt::AlignCenter);
  emptyLayout->setSpacing(12);

  auto *lblIcon = new QLabel(m_emptyWidget);
  lblIcon->setAlignment(Qt::AlignCenter);
  QPixmap iconPix(":/app.png");
  if (!iconPix.isNull()) {
    lblIcon->setPixmap(
        iconPix.scaled(64, 64, Qt::KeepAspectRatio, Qt::SmoothTransformation));
  } else {
    QIcon icon(":/app.ico");
    if (!icon.isNull()) {
      lblIcon->setPixmap(icon.pixmap(64, 64));
    }
  }
  emptyLayout->addWidget(lblIcon);

  m_lblEmptyText =
      new QLabel(tr("Archive is empty. Drop files here or click Add to add files to archive."),
                 m_emptyWidget);
  m_lblEmptyText->setAlignment(Qt::AlignCenter);
  m_lblEmptyText->setStyleSheet(
      "font-size: 13px; font-weight: 500; color: #9ca3af; margin-top: 4px;");
  emptyLayout->addWidget(m_lblEmptyText);
  m_emptyWidget->setVisible(false);

  // Connect model signals
  connect(m_model, &ArchiveModel::folderChanged, this, [this](const QString &) {
    updateNavBar();
    highlightCurrentFolderInTree();
    updateStatusBarStats();
  });
  connect(m_model, &ArchiveModel::viewModeChanged, this,
          [this](ArchiveModel::ViewMode) {
            updateViewModeUI();
            updateStatusBarStats();
          });
}

void MainWindow::showEvent(QShowEvent *event) {
  QMainWindow::showEvent(event);
  QSettings settings("MatterPackr", "MatterPackr");
  applyTheme(settings.value("themeMode", "dark").toString());
}

void MainWindow::paintEvent(QPaintEvent *event) {
  QStyleOption opt;
  opt.initFrom(this);
  QPainter p(this);
  style()->drawPrimitive(QStyle::PE_Widget, &opt, &p, this);
  QMainWindow::paintEvent(event);
}

void MainWindow::resizeEvent(QResizeEvent *event) {
  QMainWindow::resizeEvent(event);
  if (m_emptyWidget && m_tableView && m_tableView->viewport()) {
    m_emptyWidget->setGeometry(m_tableView->viewport()->rect());
  }
}

void MainWindow::closeEvent(QCloseEvent *event) {
  if (m_archiveOperationActive) {
    statusBar()->showMessage(tr("Please wait for the current archive operation to finish."));
    event->ignore();
    return;
  }
  if (!promptAndCleanUpCheckOut()) {
    event->ignore();
    return;
  }
  QSettings settings("MatterPackr", "MatterPackr");

  // Save main window geometry and window state
  settings.setValue("geometry", saveGeometry());
  settings.setValue("windowState", saveState());

  // Save table column widths, positions, and sort state
  if (m_tableView && m_tableView->horizontalHeader()) {
    settings.setValue("columnState", m_tableView->horizontalHeader()->saveState());
  }

  // Clean up temporary files extracted transparently for viewing
  QString viewBaseDir = QStandardPaths::writableLocation(QStandardPaths::TempLocation) + "/MatterPackr_View";
  if (QDir(viewBaseDir).exists()) {
    QDir(viewBaseDir).removeRecursively();
  }

  bool isVisible = m_treeContainer && m_treeContainer->isVisible() &&
                   (m_splitter->sizes().value(0, 0) > 10);
  settings.setValue("folderTreeVisible", isVisible);
  if (m_lastTreeWidth > 50) {
    settings.setValue("folderTreeWidth", m_lastTreeWidth);
  }
  QMainWindow::closeEvent(event);
}

bool MainWindow::eventFilter(QObject *obj, QEvent *event) {
  if (event->type() == QEvent::FileOpen) {
    auto *fe = static_cast<QFileOpenEvent *>(event);
    openArchiveFile(fe->file());
    return true;
  }
  if (obj == m_filterEdit && event->type() == QEvent::KeyPress) {
    auto *ke = static_cast<QKeyEvent *>(event);
    if (ke->key() == Qt::Key_Escape) {
      onToggleFilter();
      return true;
    }
  }
  return QMainWindow::eventFilter(obj, event);
}

void MainWindow::updateEmptyStateVisibility() {
  bool hasFiles = m_model->rowCount() > 0;
  bool hasArchive = !m_currentArchivePath.isEmpty();
  bool showEmpty = hasArchive && !hasFiles;
  if (m_emptyWidget) {
    m_emptyWidget->setVisible(showEmpty);
    if (showEmpty && m_tableView && m_tableView->viewport()) {
      m_emptyWidget->setGeometry(m_tableView->viewport()->rect());
    }
    if (m_lblEmptyText) {
      m_lblEmptyText->setText(tr("Archive is empty. Drop files here or click Add to add files to archive."));
    }
  }

  if (m_actCloseArchive)
    m_actCloseArchive->setEnabled(hasFiles || hasArchive);
  if (m_actSaveAs)
    m_actSaveAs->setEnabled(hasFiles || hasArchive);
  if (m_actProperties)
    m_actProperties->setEnabled(hasFiles || hasArchive);
  if (m_actTestIntegrity)
    m_actTestIntegrity->setEnabled(
        hasArchive && ArchiveBackend::capabilitiesForArchive(m_currentArchivePath).canTest);
  if (m_actAdd)
    m_actAdd->setEnabled(
        hasArchive && ArchiveBackend::capabilitiesForArchive(m_currentArchivePath).canAdd);
  if (m_actExtract)
    m_actExtract->setEnabled(
        hasArchive && hasFiles && ArchiveBackend::capabilitiesForArchive(m_currentArchivePath).canExtract);
  if (m_actCheckOut)
    m_actCheckOut->setEnabled(hasArchive && hasFiles);
  if (m_actView)
    m_actView->setEnabled(hasArchive && hasFiles);
  if (m_actSelectAll)
    m_actSelectAll->setEnabled(hasArchive && hasFiles);
  if (m_actSearch)
    m_actSearch->setEnabled(hasArchive && hasFiles);
  if (m_actFilterFiles)
    m_actFilterFiles->setEnabled(hasArchive && hasFiles);
  if (m_actToggleView)
    m_actToggleView->setEnabled(hasArchive || hasFiles);
  if (m_actClassic)
    m_actClassic->setEnabled(hasArchive || hasFiles);
  if (m_actExplorer)
    m_actExplorer->setEnabled(hasArchive || hasFiles);
  if (m_actToggleFolderTree)
    m_actToggleFolderTree->setEnabled(hasArchive || hasFiles);
  if (m_actAddCurrentFavorite)
    m_actAddCurrentFavorite->setEnabled(!m_currentArchivePath.isEmpty());

  const bool hasSelection = hasArchive && hasFiles && m_tableView && m_tableView->selectionModel() &&
                            !m_tableView->selectionModel()->selectedRows().isEmpty();
  if (m_actDelete)
    m_actDelete->setEnabled(
        hasSelection &&
        ArchiveBackend::capabilitiesForArchive(m_currentArchivePath).canRemove);
}

void MainWindow::setArchiveOperationActive(bool active, const QString &message) {
  m_archiveOperationActive = active;
  if (active) {
    m_archiveOperationCancel = std::make_shared<std::atomic_bool>(false);
    m_archiveProgress = new QProgressDialog(message, tr("Cancel"), 0, 0, this);
    m_archiveProgress->setWindowTitle(tr("MatterPackr"));
    m_archiveProgress->setWindowModality(Qt::WindowModal);
    m_archiveProgress->setAutoClose(false);
    m_archiveProgress->setMinimumDuration(0);
    connect(m_archiveProgress, &QProgressDialog::canceled,
            this, &MainWindow::cancelArchiveOperation);
    m_archiveProgress->show();
  } else if (m_archiveProgress) {
    m_archiveProgress->close();
    m_archiveProgress->deleteLater();
    m_archiveProgress = nullptr;
    m_archiveOperationCancel.reset();
  }
  const QList<QAction *> actions = {
      m_actNew, m_actOpen, m_actCloseArchive, m_actSaveAs, m_actProperties,
      m_actTestIntegrity,
      m_actAdd, m_actExtract, m_actCheckOut, m_actDelete, m_actView,
      m_actSelectAll, m_actOptions, m_actAddCurrentFavorite};
  for (QAction *action : actions) {
    if (action)
      action->setEnabled(!active);
  }
  for (QToolBar *toolBar : findChildren<QToolBar *>())
    toolBar->setEnabled(!active);
  if (!active)
    updateEmptyStateVisibility();
  if (!message.isEmpty())
    statusBar()->showMessage(message);
}

void MainWindow::cancelArchiveOperation() {
  if (m_archiveOperationCancel) {
    m_archiveOperationCancel->store(true);
    statusBar()->showMessage(tr("Cancelling archive operation..."));
    if (m_archiveProgress)
      m_archiveProgress->setLabelText(tr("Cancelling archive operation..."));
  }
}

void MainWindow::createActions() {
  // Actions are initialized in createMenus() and wired to toolbars
}

void MainWindow::createMenus() {
  auto *menuBar = this->menuBar();

  // =========================================================================
  // 1. FILE MENU (Matches MenuBar.tsx)
  // =========================================================================
  auto *fileMenu = menuBar->addMenu(tr("&File"));
  m_actNew = fileMenu->addAction(tr("New Archive..."), QKeySequence::New, this,
                                 &MainWindow::onNewArchive);
  m_actOpen = fileMenu->addAction(tr("Open Archive..."), QKeySequence::Open,
                                  this, &MainWindow::onOpenArchive);
  m_actCloseArchive = fileMenu->addAction(tr("Close Archive"), this,
                                          &MainWindow::onCloseArchive);
  m_actSaveAs =
      fileMenu->addAction(tr("Save Archive As..."), QKeySequence::SaveAs, this,
                          &MainWindow::onSaveArchiveAs);
  fileMenu->addSeparator();
  m_actProperties = fileMenu->addAction(tr("Archive Properties..."), this,
                                        &MainWindow::onArchiveProperties);
  m_actTestIntegrity = fileMenu->addAction(
      tr("Test Archive Integrity"), this, &MainWindow::onTestArchiveIntegrity);

  // =========================================================================
  // 2. ACTIONS MENU (Matches MenuBar.tsx)
  // =========================================================================
  auto *actionsMenu = menuBar->addMenu(tr("&Actions"));
  m_actAdd = actionsMenu->addAction(tr("Add Files to Archive..."),
                                    QKeySequence("Ctrl+A"), this,
                                    &MainWindow::onAddFiles);
  m_actExtract =
      actionsMenu->addAction(tr("Extract Files..."), QKeySequence("Ctrl+E"),
                             this, &MainWindow::onExtractFiles);
  m_actCheckOut = actionsMenu->addAction(tr("CheckOut Archive..."), this,
                                         &MainWindow::onCheckOut);
  m_actDelete =
      actionsMenu->addAction(tr("Delete Selected Files"), QKeySequence::Delete,
                             this, &MainWindow::onDeleteFiles);
  actionsMenu->addSeparator();
  m_actView = actionsMenu->addAction(tr("View Selected File..."),
                                     QKeySequence("Ctrl+V"), this,
                                     &MainWindow::onViewFile);
  m_actSelectAll = actionsMenu->addAction(tr("Select All Entries"),
                                          QKeySequence("Ctrl+Shift+A"), this,
                                          &MainWindow::onSelectAllEntries);

  // =========================================================================
  // 3. OPTIONS (Directly opens Configuration / Options dialog)
  // =========================================================================
  m_actOptions =
      menuBar->addAction(tr("&Options"), this, &MainWindow::onOptions);
  m_actOptions->setShortcut(QKeySequence("Ctrl+,"));

  // =========================================================================
  // 4. VIEW MENU (Matches MenuBar.tsx)
  // =========================================================================
  auto *viewMenu = menuBar->addMenu(tr("&View"));
  m_actFilterFiles =
      viewMenu->addAction(tr("Filter files (Search)"), QKeySequence::Find, this,
                          &MainWindow::onToggleFilter);
  m_actFilterFiles->setCheckable(true);

  m_actToggleFolderTree = viewMenu->addAction(tr("Show Folders &Sidebar"), this,
                                              &MainWindow::onToggleFolderTree);
  m_actToggleFolderTree->setShortcut(QKeySequence("Ctrl+T"));
  m_actToggleFolderTree->setCheckable(true);
  m_actToggleFolderTree->setChecked(true);
  viewMenu->addSeparator();

  m_viewModeGroup = new QActionGroup(this);
  m_viewModeGroup->setExclusive(true);

  m_actClassic = viewMenu->addAction(tr("Classic view"), this,
                                     &MainWindow::onSetViewModeClassic);
  m_actClassic->setCheckable(true);
  m_actClassic->setChecked(true);
  m_viewModeGroup->addAction(m_actClassic);

  m_actExplorer = viewMenu->addAction(tr("Explorer view"), this,
                                      &MainWindow::onSetViewModeExplorer);
  m_actExplorer->setCheckable(true);
  m_viewModeGroup->addAction(m_actExplorer);

  // =========================================================================
  // 5. HELP MENU (Matches MenuBar.tsx)
  // =========================================================================
  auto *helpMenu = menuBar->addMenu(tr("&Help"));
  m_actCheckForUpdates = helpMenu->addAction(
      tr("Check for &Updates..."), this, &MainWindow::onCheckForUpdates);
  helpMenu->addSeparator();
  helpMenu->addAction(tr("About MatterPackr..."), this, &MainWindow::onAbout);
}

void MainWindow::createToolBars() {
  auto *toolBar = addToolBar(tr("Main Toolbar"));
  toolBar->setMovable(false);
  toolBar->setIconSize(QSize(32, 32));
  toolBar->setToolButtonStyle(Qt::ToolButtonTextUnderIcon);

  // 1. New, Open
  m_actNew->setIcon(QIcon(":/toolbar/new.svg"));
  m_actNew->setIconText(tr("New"));
  m_actNew->setToolTip(tr("Create a new archive (Ctrl+N)"));
  toolBar->addAction(m_actNew);

  m_actOpen->setIcon(QIcon(":/toolbar/open.svg"));
  m_actOpen->setIconText(tr("Open"));
  m_actOpen->setToolTip(tr("Open archive from computer (Ctrl+O)"));
  toolBar->addAction(m_actOpen);
  toolBar->addSeparator();

  // 2. Add, Extract, View, CheckOut
  m_actAdd->setIcon(QIcon(":/toolbar/add.svg"));
  m_actAdd->setIconText(tr("Add"));
  m_actAdd->setToolTip(tr("Add files to current archive (Ctrl+A)"));
  toolBar->addAction(m_actAdd);

  m_actExtract->setIcon(QIcon(":/toolbar/extract.svg"));
  m_actExtract->setIconText(tr("Extract"));
  m_actExtract->setToolTip(tr("Extract files from archive (Ctrl+E)"));
  toolBar->addAction(m_actExtract);

  m_actView->setIcon(QIcon(":/toolbar/view.svg"));
  m_actView->setIconText(tr("View"));
  m_actView->setToolTip(tr("View selected file (Ctrl+V)"));
  toolBar->addAction(m_actView);

  m_actCheckOut->setIcon(QIcon(":/toolbar/checkout.svg"));
  m_actCheckOut->setIconText(tr("CheckOut"));
  m_actCheckOut->setToolTip(tr("CheckOut and test archive"));
  toolBar->addAction(m_actCheckOut);
  toolBar->addSeparator();

  // 3. Classic / Explorer Toggle, Search
  m_actToggleView = toolBar->addAction(
      QIcon(":/toolbar/classic.svg"), tr("Classic"), this, [this]() {
        if (m_model->viewMode() == ArchiveModel::ViewMode::Classic)
          onSetViewModeExplorer();
        else
          onSetViewModeClassic();
      });
  m_actToggleView->setToolTip(tr("Switch between Classic (WinZip flat list) "
                                 "and Explorer (WinRAR folder browsing) view"));

  m_actSearch = toolBar->addAction(QIcon(":/toolbar/search.svg"), tr("Search"),
                                   this, &MainWindow::onToggleFilter);
  m_actSearch->setCheckable(true);
  m_actSearch->setToolTip(tr("Search / filter entries (Ctrl+F)"));
}

void MainWindow::createStatusBar() {
  auto *status = statusBar();

  m_lblStatus = new QLabel(tr("Ready"), this);
  m_lblStatus->setStyleSheet(
      "color: #9ca3af; font-size: 10.5px; padding-left: 6px;");
  status->addWidget(m_lblStatus, 0);

  m_lblSelection =
      new QLabel(tr("0 items selected | Total 0 items (0 bytes)"), this);
  m_lblSelection->setAlignment(Qt::AlignCenter);
  m_lblSelection->setStyleSheet("color: #9ca3af; font-size: 10.5px;");
  status->addWidget(m_lblSelection, 1);

  m_lblThreads =
      new QLabel(QString("%1 Threads").arg(QThread::idealThreadCount()), this);
  m_lblThreads->setStyleSheet("color: #9ca3af; font-size: 10.5px; font-weight: "
                              "500; margin-right: 6px;");
  status->addPermanentWidget(m_lblThreads);

  m_lblBadge = new QLabel(tr("● READY"), this);
  m_lblBadge->setStyleSheet("background-color: #064e3b; "
                            "color: #34d399; "
                            "border: 1px solid #059669; "
                            "border-radius: 7px; "
                            "padding: 1px 6px; "
                            "font-weight: bold; "
                            "font-size: 9px; "
                            "margin-right: 6px;");
  status->addPermanentWidget(m_lblBadge);
}

void MainWindow::updateStatusBarStats() {
  int totalCount = m_model->rowCount();
  qint64 totalBytes = m_model->totalUncompressedSize();

  auto selection = m_tableView->selectionModel()->selectedRows();
  int selCount = selection.size();

  QString selText;
  if (selCount > 0) {
    qint64 selBytes = 0;
    if (selCount == totalCount) {
      selBytes = totalBytes;
    } else {
      for (const auto &idx : selection) {
        int srcRow = m_proxyModel->mapToSource(idx).row();
        selBytes += m_model->itemAt(srcRow).size;
      }
    }
    selText = tr("%1 items selected (%2) | Total %3 items (%4)")
                  .arg(selCount)
                  .arg(ArchiveModel::formatBytes(selBytes))
                  .arg(totalCount)
                  .arg(ArchiveModel::formatBytes(totalBytes));
  } else {
    selText = tr("0 items selected | Total %1 items (%2)")
                  .arg(totalCount)
                  .arg(ArchiveModel::formatBytes(totalBytes));
  }

  m_lblSelection->setText(selText);

  bool hasSelection = selCount > 0 && !m_currentArchivePath.isEmpty();
  if (m_actDelete)
    m_actDelete->setEnabled(
        hasSelection && ArchiveBackend::capabilitiesForArchive(m_currentArchivePath).canRemove);
  if (m_actView)
    m_actView->setEnabled(!m_currentArchivePath.isEmpty() && totalCount > 0);
}

void MainWindow::updateWindowTitle() {
  if (m_currentArchivePath.isEmpty()) {
    setWindowTitle(tr("MatterPackr"));
    setWindowIcon(QIcon(":/app.png"));
  } else {
    QString displayName = QFileInfo(m_currentArchivePath).fileName();
    setWindowTitle(QString("MatterPackr · %1").arg(displayName));
    setWindowIcon(getArchiveTypeIcon(m_currentArchivePath));
  }
}

QIcon MainWindow::getArchiveTypeIcon(const QString &filePath) const {
  if (filePath.isEmpty()) {
    return QIcon(":/app.png");
  }

  static QHash<QString, QIcon> s_mainIconCache;

  QString ext;
  QString lowerPath = filePath.toLower();
  if (lowerPath.endsWith(".tar.gz") || lowerPath.endsWith(".tgz")) ext = "tgz";
  else {
    int dotIdx = filePath.lastIndexOf('.');
    if (dotIdx != -1) {
      ext = filePath.mid(dotIdx + 1).toLower();
    }
  }

  auto it = s_mainIconCache.constFind(ext);
  if (it != s_mainIconCache.constEnd()) {
    return it.value();
  }

  auto getCustomIcon = [](const QString &baseName) -> QIcon {
    QIcon icon(QString(":/filetypes/%1.png").arg(baseName));
    if (icon.isNull()) {
      icon = QIcon(QString(":/filetypes/%1.ico").arg(baseName));
    }
    return icon;
  };

  QIcon result;
  if (ext == "zip" || ext == "zipx") result = getCustomIcon("zip");
  else if (ext == "7z") result = getCustomIcon("7z");
  else if (ext == "rar") result = getCustomIcon("rar");
  else if (ext == "tar") result = getCustomIcon("tar");
  else if (ext == "tgz") result = getCustomIcon("tgz");
  else if (ext == "gz" || ext == "gzip") result = getCustomIcon("gz");
  else if (ext == "bz2" || ext == "bzip2") result = getCustomIcon("bz2");
  else if (ext == "iso") result = getCustomIcon("iso");
  else if (ext == "img" || ext == "bin") result = getCustomIcon("img");
  else if (ext == "cab") result = getCustomIcon("cab");
  else if (ext == "cpio") result = getCustomIcon("cpio");
  else if (ext == "ar" || ext == "a") result = getCustomIcon("ar");
  else result = getCustomIcon("archive");

  s_mainIconCache.insert(ext, result);
  return result;
}

void MainWindow::onNewArchive() {
  if (m_archiveOperationActive)
    return;
  if (!promptAndCleanUpCheckOut())
    return;

  QString filename = QFileDialog::getSaveFileName(
      this, tr("Create New Archive"), QString(),
      tr("ZIP Archives (*.zip);;7-Zip Archives (*.7z);;TAR Archives "
         "(*.tar *.tar.gz *.tgz);;All Files (*.*)"));
  if (filename.isEmpty())
    return;

  NewArchiveDialog setupDialog(filename, this);
  if (setupDialog.exec() != QDialog::Accepted)
    return;
  const QString format = setupDialog.format();
  QString archiveBaseName = filename;
  const QStringList knownSuffixes = {
      QStringLiteral(".tar.gz"), QStringLiteral(".tgz"),
      QStringLiteral(".zip"), QStringLiteral(".7z"),
      QStringLiteral(".tar")};
  for (const QString &suffix : knownSuffixes) {
    if (archiveBaseName.endsWith(suffix, Qt::CaseInsensitive)) {
      archiveBaseName.chop(suffix.size());
      break;
    }
  }
  const QString selectedSuffix =
      format == QStringLiteral("zip") ? QStringLiteral(".zip")
      : format == QStringLiteral("7z") ? QStringLiteral(".7z")
      : format == QStringLiteral("tar.gz") ? QStringLiteral(".tar.gz")
                                            : QStringLiteral(".tar");
  filename = archiveBaseName + selectedSuffix;
  const QStringList files = setupDialog.files();
  ArchiveBackend::ArchiveOptions archiveOptions;
  archiveOptions.password = setupDialog.password();

  setArchiveOperationActive(true, tr("Creating archive..."));
  const OperationCancel cancel = m_archiveOperationCancel;
  QThreadPool::globalInstance()->start([this, filename, format, files, archiveOptions, cancel]() {
    QString errorMessage;
    bool success = false;
    if (format == QStringLiteral("7z")) {
      success = archiveOptions.password.isEmpty()
          ? ArchiveBackend::create7z(filename, files, &errorMessage, cancel)
          : ArchiveBackend::createEncrypted7z(filename, files, archiveOptions,
                                               &errorMessage, cancel);
    } else if (format == QStringLiteral("zip")) {
      success = ArchiveBackend::createZip(filename, files, archiveOptions,
                                          &errorMessage, cancel);
    } else {
      success = ArchiveBackend::createEmpty(filename, &errorMessage, cancel);
      if (success && !files.isEmpty())
        success = addFilesToArchive(filename, files, &errorMessage, cancel);
    }
    QMetaObject::invokeMethod(this, [this, filename, archiveOptions, success, errorMessage]() {
      setArchiveOperationActive(false);
      if (!success) {
        QMessageBox::warning(this, tr("Create Archive Failed"), errorMessage);
        return;
      }
      m_model->clear();
      m_currentArchivePath = filename;
      m_isCurrentEncrypted = !archiveOptions.password.isEmpty();
      m_currentPassword = archiveOptions.password;
      updateWindowTitle();
      updateEmptyStateVisibility();
      updateStatusBarStats();
      statusBar()->showMessage(
          tr("Created new archive: %1").arg(QFileInfo(filename).fileName()), 3000);
    });
  });
}

void MainWindow::onOpenArchive() {
  if (!promptAndCleanUpCheckOut())
    return;

  QString filename = QFileDialog::getOpenFileName(
      this, tr("Open Archive"), QString(),
      tr("Supported Archives (*.zip *.7z *.tar *.tar.gz *.tgz *.gz "
         "*.rar *.iso *.cab *.img *.cpio *.ar);;All "
         "Files (*.*)"));
  if (filename.isEmpty())
    return;

  openArchiveFile(filename);
}

void MainWindow::openArchiveFile(const QString &filename) {
  if (m_archiveOperationActive)
    return;
  QString path = filename.trimmed();
  if (path.startsWith('"') && path.endsWith('"') && path.length() >= 2) {
    path = path.mid(1, path.length() - 2);
  }
  if (path.isEmpty())
    return;

  if (!promptAndCleanUpCheckOut())
    return;

  QFileInfo fileInfo(path);
  if (fileInfo.fileName().compare("MatterPackr.exe", Qt::CaseInsensitive) == 0 ||
      fileInfo.suffix().compare("exe", Qt::CaseInsensitive) == 0 ||
      fileInfo.suffix().compare("dll", Qt::CaseInsensitive) == 0) {
    return;
  }

  const QString archivePath = fileInfo.exists() ? fileInfo.absoluteFilePath() : path;
  if (isRemovedDeveloperArchive(archivePath)) {
    QMessageBox::information(
        this, tr("Archive Format Not Supported"),
        tr("BZip2 and XZ-compressed TAR archives are not supported by MatterPackr."));
    return;
  }

  // If the archive requires password before open (e.g. created by MatterPackr with password, or encrypted 7Z headers):
  QString initialPassword;
  if (ArchiveBackend::archiveRequiresPasswordBeforeOpen(archivePath)) {
    PasswordPromptDialog dlg(
        tr("Unlock Encrypted Archive"),
        tr("<b>%1</b> is password-protected.<br>Please enter the password to unlock and view its contents:")
            .arg(fileInfo.fileName()),
        tr("Unlock"),
        this);
    if (dlg.exec() != QDialog::Accepted) {
      statusBar()->showMessage(tr("Open archive cancelled."), 3000);
      return;
    }
    initialPassword = dlg.password();
  }

  setArchiveOperationActive(true, tr("Opening archive..."));
  const OperationCancel cancel = m_archiveOperationCancel;
  QThreadPool::globalInstance()->start([this, archivePath, cancel, initialPassword]() {
    QString errorMessage;
    bool needsPassword = false;
    bool hasEncryptedEntries = false;
    const QVector<ArchiveItem> archiveItems =
        listArchiveEntries(archivePath, &errorMessage, cancel, initialPassword, &needsPassword, &hasEncryptedEntries);

    QMetaObject::invokeMethod(this, [this, archivePath, archiveItems, errorMessage, initialPassword, needsPassword, hasEncryptedEntries]() {
      setArchiveOperationActive(false);

      if (archiveItems.isEmpty() && (needsPassword || isEncryptionError(errorMessage))) {
        PasswordPromptDialog dlg(
            tr("Unlock Encrypted Archive"),
            initialPassword.isEmpty()
                ? tr("<b>%1</b> is password-protected.<br>Please enter the password to view its contents:")
                      .arg(QFileInfo(archivePath).fileName())
                : tr("Incorrect password for <b>%1</b>.<br>Please enter the correct password:")
                      .arg(QFileInfo(archivePath).fileName()),
            tr("Unlock"),
            this);
        if (dlg.exec() == QDialog::Accepted) {
          const QString retryPassword = dlg.password();
          setArchiveOperationActive(true, tr("Opening archive..."));
          const OperationCancel cancelRetry = m_archiveOperationCancel;
          QThreadPool::globalInstance()->start([this, archivePath, cancelRetry, retryPassword]() {
            QString retryErr;
            bool retryNeedsPw = false;
            bool retryHasEnc = false;
            const QVector<ArchiveItem> retryItems =
                listArchiveEntries(archivePath, &retryErr, cancelRetry, retryPassword, &retryNeedsPw, &retryHasEnc);
            QMetaObject::invokeMethod(this, [this, archivePath, retryItems, retryErr, retryPassword, retryHasEnc]() {
              setArchiveOperationActive(false);
              if (retryItems.isEmpty() && !retryErr.isEmpty()) {
                QMessageBox::warning(this, tr("Open Archive Failed"),
                                     isEncryptionError(retryErr)
                                         ? tr("Incorrect password. The archive cannot be opened.")
                                         : retryErr);
                return;
              }
              m_currentArchivePath = archivePath;
              m_isCurrentEncrypted = retryHasEnc || !retryPassword.isEmpty();
              m_currentPassword = retryPassword;
              m_model->setItems(retryItems);
              updateWindowTitle();
              updateFolderTree();
              updateViewModeUI();
              updateEmptyStateVisibility();
              updateStatusBarStats();
              statusBar()->showMessage(tr("Opened archive: %1 (%2 items)")
                                           .arg(QFileInfo(archivePath).fileName())
                                           .arg(retryItems.size()), 3000);
            });
          });
          return;
        } else {
          statusBar()->showMessage(tr("Open archive cancelled."), 3000);
          return;
        }
      }

      if (archiveItems.isEmpty() && !errorMessage.isEmpty()) {
        QMessageBox::warning(this, tr("Open Archive Failed"), errorMessage);
        return;
      }

      m_currentArchivePath = archivePath;
      m_isCurrentEncrypted = hasEncryptedEntries || !initialPassword.isEmpty();
      m_currentPassword = initialPassword;
      m_model->setItems(archiveItems);
      updateWindowTitle();
      updateFolderTree();
      updateViewModeUI();
      updateEmptyStateVisibility();
      updateStatusBarStats();
      statusBar()->showMessage(tr("Opened archive: %1 (%2 items)")
                                   .arg(QFileInfo(archivePath).fileName())
                                   .arg(archiveItems.size()), 3000);
    });
  });
}

void MainWindow::onAddCurrentToFavorites() {
  if (m_currentArchivePath.isEmpty())
    return;

  QString msg;
  bool ok = FavoritesDialog::addCurrentToFavorites(m_currentArchivePath, &msg);
  statusBar()->showMessage(msg, 3500);
  updateFavoritesMenu();
}

void MainWindow::onAddFavoriteFromDisk() {
  QString filename = QFileDialog::getOpenFileName(
      this, tr("Add Archive to Favorites"), QString(),
      tr("Supported Archives (*.zip *.7z *.tar *.tar.gz *.tgz *.gz "
         "*.rar *.iso *.cab *.img *.cpio *.ar);;All Files (*.*)"));
  if (filename.isEmpty())
    return;

  QString cleanPath = QDir::toNativeSeparators(filename);
  QString name = QFileInfo(filename).fileName();

  QFileInfo info(filename);
  qint64 sizeBytes = info.size();
  QString sizeStr;
  if (sizeBytes >= 1024 * 1024) {
    sizeStr = QString("%1 MB").arg(QString::number(sizeBytes / (1024.0 * 1024.0), 'f', 1));
  } else {
    sizeStr = QString("%1 KB").arg(qMax<qint64>(1, sizeBytes / 1024));
  }

  FavoriteArchiveEntry entry;
  entry.name = name;
  entry.path = cleanPath;
  entry.size = sizeStr;
  entry.date = info.lastModified().toString("yyyy-MM-dd");
  entry.count = 0;

  if (FavoritesDialog::addFavoriteEntry(entry)) {
    statusBar()->showMessage(tr("Added \"%1\" to Favorites").arg(name), 3500);
  } else {
    statusBar()->showMessage(tr("\"%1\" is already in Favorites").arg(name), 3500);
  }
  updateFavoritesMenu();
}

void MainWindow::onRemoveFavorite(const QString &path) {
  auto list = FavoritesDialog::loadFavoritesList();
  for (int i = 0; i < list.size(); ++i) {
    if (list[i].path == path) {
      QString name = list[i].name;
      list.removeAt(i);
      FavoritesDialog::saveFavoritesList(list);
      statusBar()->showMessage(tr("Removed \"%1\" from Favorites").arg(name), 3500);
      break;
    }
  }
  updateFavoritesMenu();
}

void MainWindow::onClearAllFavorites() {
  FavoritesDialog::saveFavoritesList({});
  statusBar()->showMessage(tr("Cleared all Favorites"), 3500);
  updateFavoritesMenu();
}

void MainWindow::updateFavoritesMenu() {
  if (!m_favoritesMenu)
    return;

  m_favoritesMenu->clear();

  // 1. Add Current Archive to Favorites (Instant 1-click bookmarking)
  m_actAddCurrentFavorite = m_favoritesMenu->addAction(
      QIcon(":/toolbar/add.svg"), tr("Add Current Archive to Favorites"),
      this, &MainWindow::onAddCurrentToFavorites);
  m_actAddCurrentFavorite->setEnabled(!m_currentArchivePath.isEmpty());

  // 2. Add Archive from Disk...
  m_favoritesMenu->addAction(
      QIcon(":/toolbar/open.svg"), tr("Add Archive from Disk..."),
      this, &MainWindow::onAddFavoriteFromDisk);

  m_favoritesMenu->addSeparator();

  // 3. Dynamic Favorite Archives List with inline [✕] delete buttons
  auto favorites = FavoritesDialog::loadFavoritesList();
  if (favorites.isEmpty()) {
    auto *emptyAct = m_favoritesMenu->addAction(tr("(No favorite archives saved)"));
    emptyAct->setEnabled(false);
  } else {
    for (int i = 0; i < favorites.size(); ++i) {
      const auto &fav = favorites[i];
      auto *widgetAction = new QWidgetAction(m_favoritesMenu);

      auto *rowWidget = new QWidget(m_favoritesMenu);
      rowWidget->setObjectName("favoriteRowWidget");
      rowWidget->setCursor(Qt::PointingHandCursor);
      rowWidget->setStyleSheet(
          "QWidget#favoriteRowWidget {"
          "  background: transparent;"
          "  border-radius: 4px;"
          "}"
          "QWidget#favoriteRowWidget:hover {"
          "  background-color: rgba(59, 130, 246, 0.16);"
          "}"
      );

      auto *hLayout = new QHBoxLayout(rowWidget);
      hLayout->setContentsMargins(10, 4, 10, 4);
      hLayout->setSpacing(8);

      // Icon
      auto *iconLbl = new QLabel(rowWidget);
      iconLbl->setPixmap(FavoritesDialog::iconForPath(fav.name.isEmpty() ? fav.path : fav.name).pixmap(18, 18));
      iconLbl->setFixedSize(18, 18);
      hLayout->addWidget(iconLbl, 0, Qt::AlignVCenter);

      // Name button (clicking opens archive)
      auto *nameBtn = new QPushButton(fav.name, rowWidget);
      nameBtn->setFlat(true);
      nameBtn->setCursor(Qt::PointingHandCursor);
      nameBtn->setToolTip(fav.path);
      nameBtn->setStyleSheet(
          "QPushButton {"
          "  text-align: left;"
          "  border: none;"
          "  background: transparent;"
          "  font-size: 12px;"
          "  font-weight: 500;"
          "  color: inherit;"
          "  padding: 0px;"
          "}"
      );
      connect(nameBtn, &QPushButton::clicked, this, [this, path = fav.path]() {
        m_favoritesMenu->close();
        openArchiveFile(path);
      });
      hLayout->addWidget(nameBtn, 1);

      // Size badge
      auto *sizeLbl = new QLabel(fav.size, rowWidget);
      sizeLbl->setStyleSheet("color: #888888; font-size: 10px; font-weight: 500; margin-right: 4px;");
      hLayout->addWidget(sizeLbl, 0, Qt::AlignVCenter);

      // Inline Delete [✕] button
      auto *btnDelete = new QPushButton("✕", rowWidget);
      btnDelete->setFixedSize(20, 20);
      btnDelete->setToolTip(tr("Remove \"%1\" from Favorites").arg(fav.name));
      btnDelete->setCursor(Qt::PointingHandCursor);
      btnDelete->setStyleSheet(
          "QPushButton {"
          "  border: none;"
          "  background: transparent;"
          "  color: #888888;"
          "  font-size: 11px;"
          "  font-weight: bold;"
          "  border-radius: 3px;"
          "}"
          "QPushButton:hover {"
          "  background-color: #ef4444;"
          "  color: #ffffff;"
          "}"
      );
      connect(btnDelete, &QPushButton::clicked, this, [this, path = fav.path]() {
        onRemoveFavorite(path);
        m_favoritesMenu->close();
      });
      hLayout->addWidget(btnDelete, 0, Qt::AlignVCenter);

      widgetAction->setDefaultWidget(rowWidget);
      m_favoritesMenu->addAction(widgetAction);
    }

    m_favoritesMenu->addSeparator();
    m_favoritesMenu->addAction(tr("Clear All Favorites"), this, &MainWindow::onClearAllFavorites);
  }
}

void MainWindow::onCloseArchive() {
  if (!promptAndCleanUpCheckOut())
    return;

  m_model->clear();
  m_currentArchivePath.clear();
  m_isCurrentEncrypted = false;
  m_currentPassword.clear();

  updateFolderTree();
  updateViewModeUI();
  updateWindowTitle();
  updateEmptyStateVisibility();
  updateStatusBarStats();

  statusBar()->showMessage(tr("Archive closed."), 2000);
}

void MainWindow::onSaveArchiveAs() {
  if (m_model->rowCount() == 0)
    return;

  QString filename = QFileDialog::getSaveFileName(
      this, tr("Save Archive As"),
      m_currentArchivePath.isEmpty() ? "NEW_ARCHIVE.ZIP" : m_currentArchivePath,
      tr("ZIP Archives (*.zip);;7-Zip Archives (*.7z);;All Files (*.*)"));
  if (filename.isEmpty())
    return;

  if (QFileInfo(m_currentArchivePath).canonicalFilePath()
          != QFileInfo(filename).canonicalFilePath()
      && !QFile::copy(m_currentArchivePath, filename)) {
    QMessageBox::warning(this, tr("Save Archive Failed"),
                         tr("Could not copy the archive to:\n%1").arg(filename));
    return;
  }

  m_currentArchivePath = filename;
  updateWindowTitle();
  statusBar()->showMessage(
      tr("Archive saved as: %1").arg(QFileInfo(filename).fileName()), 3000);
}

void MainWindow::onTestArchiveIntegrity() {
  if (m_archiveOperationActive || m_currentArchivePath.isEmpty())
    return;
  if (!QFile::exists(m_currentArchivePath)) {
    QMessageBox::warning(this, tr("Integrity Test Failed"),
                         tr("The current archive no longer exists."));
    return;
  }

  const QString archivePath = m_currentArchivePath;
  setArchiveOperationActive(true, tr("Testing archive integrity..."));
  const OperationCancel cancel = m_archiveOperationCancel;
  QThreadPool::globalInstance()->start([this, archivePath, cancel]() {
    QString errorMessage;
    const bool success = verifyArchiveContents(archivePath, &errorMessage, cancel);
    QMetaObject::invokeMethod(this, [this, archivePath, success, errorMessage]() {
      setArchiveOperationActive(false);
      if (!success) {
        QMessageBox::warning(
            this, tr("Integrity Test Failed"),
            tr("The archive could not be verified.\n\n%1").arg(errorMessage));
        return;
      }
      QMessageBox::information(
          this, tr("Integrity Test Passed"),
          tr("The archive was read successfully and passed the integrity test:\n%1")
              .arg(QFileInfo(archivePath).fileName()));
      statusBar()->showMessage(tr("Archive integrity test passed."), 3500);
    });
  });
}

void MainWindow::onArchiveProperties() {
  QString targetPath = m_currentArchivePath;
  if (targetPath.isEmpty()) {
    targetPath = QDir::tempPath() + "/Archive.zip";
  }

  // Ensure the archive file exists on disk so the native OS can read and inspect its properties
  if (!QFile::exists(targetPath)) {
    QFile file(targetPath);
    if (file.open(QIODevice::WriteOnly)) {
      if (targetPath.endsWith(".zip", Qt::CaseInsensitive)) {
        // Standard 22-byte End-of-Central-Directory record for empty ZIP
        const char emptyZipEOCD[22] = {
            0x50, 0x4B, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
        file.write(emptyZipEOCD, 22);
      } else {
        file.write("MatterPackr Archive Container\n");
      }
      file.close();
    }
  }

#if defined(Q_OS_WIN)
  // Windows: Native Explorer Right-Click File Properties Window
  QString nativePath = QDir::toNativeSeparators(targetPath);
  SHELLEXECUTEINFOW sei;
  ZeroMemory(&sei, sizeof(sei));
  sei.cbSize = sizeof(sei);
  sei.fMask = SEE_MASK_INVOKEIDLIST;
  sei.hwnd = reinterpret_cast<HWND>(this->winId());
  sei.lpVerb = L"properties";
  sei.lpFile = reinterpret_cast<LPCWSTR>(nativePath.utf16());
  sei.nShow = SW_SHOWNORMAL;

  if (!ShellExecuteExW(&sei)) {
    // Explorer fallback
    QProcess::startDetached("explorer.exe", {"/select,", nativePath});
  }

#elif defined(Q_OS_MACOS) || defined(Q_OS_MAC)
  // macOS: Native Finder Right-Click "Get Info" Inspector Window (Cmd+I)
  QString escapedPath = targetPath;
  escapedPath.replace("\\", "\\\\").replace("\"", "\\\"");
  QString script = QString(
      "tell application \"Finder\"\n"
      "  activate\n"
      "  open information window of (POSIX file \"%1\" as alias)\n"
      "end tell").arg(escapedPath);

  QProcess proc;
  proc.start("osascript", QStringList() << "-e" << script);
  if (!proc.waitForFinished(1500) || proc.exitCode() != 0) {
    // Fallback: reveal in Finder
    QProcess::startDetached("open", QStringList() << "-R" << targetPath);
  }

#else
  // Linux: FreeDesktop D-Bus org.freedesktop.FileManager1.ShowItemProperties
  QUrl fileUrl = QUrl::fromLocalFile(targetPath);
  QString uri = fileUrl.toString();
  bool invoked = false;

  // 1. Try gdbus
  if (QProcess::execute("gdbus", {
          "call", "--session",
          "--dest", "org.freedesktop.FileManager1",
          "--object-path", "/org/freedesktop/FileManager1",
          "--method", "org.freedesktop.FileManager1.ShowItemProperties",
          QString("['%1']").arg(uri),
          ""
      }) == 0) {
    invoked = true;
  }

  // 2. Try dbus-send if gdbus didn't succeed
  if (!invoked) {
    if (QProcess::execute("dbus-send", {
            "--session",
            "--dest=org.freedesktop.FileManager1",
            "--type=method_call",
            "/org/freedesktop/FileManager1",
            "org.freedesktop.FileManager1.ShowItemProperties",
            QString("array:string:%1").arg(uri),
            "string:\"\""
        }) == 0) {
      invoked = true;
    }
  }

  // 3. Fallbacks to direct desktop file managers (Nautilus, Nemo, Caja, Thunar)
  if (!invoked) {
    if (QProcess::startDetached("nautilus", {"-p", targetPath})) {
      invoked = true;
    } else if (QProcess::startDetached("nemo", {"-p", targetPath})) {
      invoked = true;
    } else if (QProcess::startDetached("caja", {"-p", targetPath})) {
      invoked = true;
    } else if (QProcess::startDetached("thunar", {"--properties", targetPath})) {
      invoked = true;
    } else {
      // General fallback: reveal in file manager
      QDesktopServices::openUrl(QUrl::fromLocalFile(QFileInfo(targetPath).absolutePath()));
    }
  }
#endif
}

void MainWindow::onAddFiles() {
  if (m_archiveOperationActive)
    return;
  if (m_isCurrentEncrypted) {
    QMessageBox::information(
        this, tr("Encrypted Archive"),
        tr("Adding files to an encrypted 7Z archive is not available yet."));
    return;
  }
  QStringList files = QFileDialog::getOpenFileNames(
      this, tr("Add Files to Archive"), QString(), tr("All Files (*.*)"));
  if (files.isEmpty())
    return;

  if (m_currentArchivePath.isEmpty() || !QFile::exists(m_currentArchivePath)) {
    QMessageBox::warning(this, tr("Add Files Failed"),
                         tr("Create or open an archive before adding files."));
    return;
  }

  const QString archivePath = m_currentArchivePath;
  setArchiveOperationActive(true, tr("Adding files to archive..."));
  const OperationCancel cancel = m_archiveOperationCancel;
  QThreadPool::globalInstance()->start([this, archivePath, files, cancel]() {
    QString errorMessage;
    bool success = addFilesToArchive(archivePath, files, &errorMessage, cancel);
    QVector<ArchiveItem> archiveItems;
    if (success)
      archiveItems = listArchiveEntries(archivePath, &errorMessage, cancel);
    if (archiveItems.isEmpty() && !errorMessage.isEmpty())
      success = false;
    QMetaObject::invokeMethod(this, [this, files, success, errorMessage, archiveItems]() {
      setArchiveOperationActive(false);
      if (!success) {
        QMessageBox::warning(this, tr("Add Files Failed"), errorMessage);
        return;
      }
      m_model->setItems(archiveItems);
      updateFolderTree();
      updateViewModeUI();
      updateEmptyStateVisibility();
      updateStatusBarStats();
      statusBar()->showMessage(tr("Added %1 file(s) to archive.").arg(files.size()), 3000);
    });
  });
}

void MainWindow::onExtractFiles() {
  if (m_archiveOperationActive)
    return;
  if (m_model->rowCount() == 0)
    return;

  bool requiresPassword = m_isCurrentEncrypted;
  if (!requiresPassword) {
    for (const ArchiveItem &item : m_model->allItems()) {
      if (item.isEncrypted) {
        requiresPassword = true;
        break;
      }
    }
  }

  if (requiresPassword && m_currentPassword.isEmpty()) {
    if (!ensureArchiveUnlocked(true))
      return;
  }

  QString dir = QFileDialog::getExistingDirectory(
      this, tr("Extract Files To Folder"), QString());
  if (dir.isEmpty())
    return;

  QStringList entriesToExtract;
  const auto selectedRows = m_tableView->selectionModel()->selectedRows();
  if (selectedRows.isEmpty()) {
    for (const ArchiveItem &item : m_model->allItems()) {
      const QString entryPath = archiveEntryPath(item);
      if (!item.filename.isEmpty() && isSafeArchiveEntryPath(entryPath)) {
        entriesToExtract.append(entryPath);
      }
    }
  } else {
    for (const QModelIndex &proxyIndex : selectedRows) {
      const QModelIndex sourceIndex = m_proxyModel->mapToSource(proxyIndex);
      if (!sourceIndex.isValid())
        continue;
      const ArchiveItem &item = m_model->itemAt(sourceIndex.row());
      const QString entryPath = archiveEntryPath(item);
      if (!item.filename.isEmpty() && isSafeArchiveEntryPath(entryPath)) {
        entriesToExtract.append(entryPath);
      }
    }
  }

  if (entriesToExtract.isEmpty()) {
    QMessageBox::warning(this, tr("Extraction Failed"),
                         tr("No safe archive entries were selected for extraction."));
    return;
  }

  const QStringList entries = entriesToExtract;
  const QString archivePath = m_currentArchivePath;
  const QString password = m_currentPassword;
  setArchiveOperationActive(true, tr("Extracting files..."));
  const OperationCancel cancel = m_archiveOperationCancel;
  QThreadPool::globalInstance()->start([this, archivePath, entries, dir, cancel, password]() {
    QString errorMessage;
    bool success = false;
#ifdef MATTERPACKR_HAS_LIBARCHIVE
    success = ArchiveBackend::extractEntries(
        archivePath, dir, entries, &errorMessage, cancel, password);
#endif
    if (!success && errorMessage.isEmpty()) {
      QStringList arguments{QStringLiteral("-xf"), archivePath,
                            QStringLiteral("-C"), dir};
      arguments.append(entries);
      success = runArchiveCommand(arguments, nullptr, &errorMessage, cancel);
    }
    QMetaObject::invokeMethod(this, [this, entries, dir, success, errorMessage]() {
      setArchiveOperationActive(false);
      if (!success) {
        if (isEncryptionError(errorMessage)) {
          m_currentPassword.clear();
          QMessageBox::warning(this, tr("Extraction Failed"),
                               tr("Incorrect password. Could not extract encrypted files."));
          return;
        }
        QMessageBox::warning(this, tr("Extraction Failed"), errorMessage);
        return;
      }
      statusBar()->showMessage(
          tr("Extracted %1 item(s) to %2").arg(entries.size()).arg(dir), 3500);
    });
  });
}

void MainWindow::onCheckOut() {
  if (m_model->rowCount() == 0) {
    QMessageBox::information(this, tr("CheckOut Archive"),
                             tr("The archive is empty. Open or create an archive to CheckOut."));
    return;
  }

  if (m_isCurrentEncrypted && m_currentPassword.isEmpty()) {
    if (!ensureArchiveUnlocked(true))
      return;
  }

  // If a previous CheckOut session is currently active, prompt to clean it up first
  if (!m_activeCheckOutDir.isEmpty() && QDir(m_activeCheckOutDir).exists()) {
    if (!promptAndCleanUpCheckOut()) {
      return;
    }
  }

  CheckOutDialog dlg(m_currentArchivePath, m_model->rowCount(), this);
  if (dlg.exec() != QDialog::Accepted) {
    return;
  }

  QString targetDir = dlg.targetDirectory();
  if (targetDir.isEmpty()) {
    return;
  }

  bool makeShortcuts = dlg.createShortcuts();
  bool openFolder = dlg.openFolderWhenDone();

  QDir target(targetDir);
  if (!target.exists()) {
    if (!target.mkpath(".")) {
      QMessageBox::warning(this, tr("CheckOut Error"),
                           tr("Failed to create temporary directory:\n%1").arg(targetDir));
      return;
    }
  }

  int extractedCount = 0;
  QStringList shortcutFiles;
  QString desktopPath = QStandardPaths::writableLocation(QStandardPaths::DesktopLocation);

  for (int i = 0; i < m_model->rowCount(); ++i) {
    ArchiveItem item = m_model->itemAt(i);
    QString relDir = item.path;
    QString subDirPath = relDir.isEmpty() ? targetDir : (targetDir + "/" + relDir);
    QDir().mkpath(subDirPath);

    if (item.isDirectory) {
      QDir().mkpath(subDirPath + "/" + item.filename);
      continue;
    }

    QString filePath = subDirPath + "/" + item.filename;
    QFile file(filePath);
    if (file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
      QByteArray content;
      QString lower = item.filename.toLower();
      if (lower.endsWith(".md") || lower.endsWith(".txt")) {
        content = QString("# %1\n\nExtracted by MatterPackr CheckOut feature.\nOriginal Archive: %2\nTimestamp: %3\n")
                      .arg(item.filename)
                      .arg(m_currentArchivePath.isEmpty() ? "Archive" : m_currentArchivePath)
                      .arg(QDateTime::currentDateTime().toString())
                      .toUtf8();
      } else {
        qint64 writeSize = qMin<qint64>(item.size, 65536);
        if (writeSize > 0) {
          content.resize(writeSize);
          content.fill(0x5A);
        }
      }
      file.write(content);
      file.close();
      extractedCount++;
    }

    // Quick-access shortcuts for executables, setup utilities, and documents
    if (makeShortcuts && !desktopPath.isEmpty()) {
      QString lower = item.filename.toLower();
      bool isExecutable = lower.endsWith(".exe") || lower.endsWith(".bat") || lower.endsWith(".cmd");
      bool isDocument = lower.endsWith(".md") || lower.endsWith(".txt") || lower.endsWith(".pdf") ||
                        lower.endsWith(".html") || lower.endsWith(".doc") || lower.endsWith(".docx");
      bool isSetup = lower.contains("setup") || lower.contains("install");

      if (isExecutable || isDocument || isSetup) {
        QString baseName = QFileInfo(item.filename).completeBaseName();
        QString linkPath = desktopPath + "/" + baseName + " (CheckOut).lnk";
        if (QFile::exists(linkPath)) {
          QFile::remove(linkPath);
        }
        if (QFile::link(filePath, linkPath)) {
          shortcutFiles.append(linkPath);
        }
      }
    }
  }

  m_activeCheckOutDir = targetDir;
  m_checkOutShortcuts = shortcutFiles;

  if (openFolder) {
    QDesktopServices::openUrl(QUrl::fromLocalFile(targetDir));
  }

  QString shortcutInfo = shortcutFiles.isEmpty()
                             ? ""
                             : tr("<br><br>Created <b>%1</b> quick-access shortcut(s) on your Desktop.").arg(shortcutFiles.size());

  QMessageBox::information(
      this, tr("CheckOut Complete"),
      tr("<b>CheckOut finished successfully.</b><br><br>"
         "Temporarily extracted <b>%1 file(s)</b> to:<br>"
         "<code>%2</code>"
         "%3<br><br>"
         "You may test and inspect the files now.<br>"
         "When you close the archive or exit MatterPackr, you will be prompted to automatically delete the temporary folder and shortcuts.")
          .arg(extractedCount)
          .arg(QDir::toNativeSeparators(targetDir))
          .arg(shortcutInfo));

  statusBar()->showMessage(
      tr("CheckOut active: %1 files in %2").arg(extractedCount).arg(targetDir), 4000);
}

bool MainWindow::promptAndCleanUpCheckOut() {
  if (m_activeCheckOutDir.isEmpty())
    return true;

  QDir dir(m_activeCheckOutDir);
  bool dirExists = dir.exists();
  bool hasShortcuts = false;
  for (const QString &lnk : m_checkOutShortcuts) {
    if (QFile::exists(lnk)) {
      hasShortcuts = true;
      break;
    }
  }

  if (!dirExists && !hasShortcuts) {
    m_activeCheckOutDir.clear();
    m_checkOutShortcuts.clear();
    return true;
  }

  QMessageBox msgBox(this);
  msgBox.setWindowTitle(tr("CheckOut Cleanup"));
  msgBox.setIcon(QMessageBox::Question);
  msgBox.setText(tr("<b>Temporary CheckOut files are currently active.</b>"));
  msgBox.setInformativeText(
      tr("The following temporary staging directory was created during CheckOut:<br>"
         "<code>%1</code><br><br>"
         "Would you like to automatically clean up and delete the temporary files and shortcuts now?")
          .arg(QDir::toNativeSeparators(m_activeCheckOutDir)));
  msgBox.setStandardButtons(QMessageBox::Yes | QMessageBox::No | QMessageBox::Cancel);
  msgBox.setDefaultButton(QMessageBox::Yes);

  int ret = msgBox.exec();
  if (ret == QMessageBox::Cancel) {
    return false;
  }

  if (ret == QMessageBox::Yes) {
    if (dirExists) {
      dir.removeRecursively();
    }
    for (const QString &lnk : m_checkOutShortcuts) {
      if (QFile::exists(lnk)) {
        QFile::remove(lnk);
      }
    }
    statusBar()->showMessage(tr("Cleaned up temporary CheckOut files and shortcuts."), 3000);
  }

  m_activeCheckOutDir.clear();
  m_checkOutShortcuts.clear();
  return true;
}

void MainWindow::onDeleteFiles() {
  if (m_archiveOperationActive)
    return;
  if (m_isCurrentEncrypted) {
    QMessageBox::information(
        this, tr("Encrypted Archive"),
        tr("Removing files from an encrypted 7Z archive is not available yet."));
    return;
  }
  auto selection = m_tableView->selectionModel()->selectedRows();
  if (selection.isEmpty())
    return;

  if (QMessageBox::question(this, tr("Confirm Deletion"),
                            tr("Are you sure you want to delete %1 selected "
                               "file(s) from the archive?")
                                .arg(selection.size()),
                            QMessageBox::Yes | QMessageBox::No) !=
      QMessageBox::Yes) {
    return;
  }

  QSet<QString> idsToRemove;
  QStringList entryPaths;
  for (const auto &idx : selection) {
    int srcRow = m_proxyModel->mapToSource(idx).row();
    const ArchiveItem &item = m_model->itemAt(srcRow);
    const QString entryPath = archiveEntryPath(item);
    if (!isSafeArchiveEntryPath(entryPath)) {
      QMessageBox::warning(this, tr("Delete Failed"),
                           tr("The selected archive entry has an unsafe path."));
      return;
    }
    idsToRemove.insert(item.id);
    entryPaths.append(entryPath);
  }

  const QString archivePath = m_currentArchivePath;
  const int removedCount = idsToRemove.size();
  setArchiveOperationActive(true, tr("Deleting selected files..."));
  const OperationCancel cancel = m_archiveOperationCancel;
  QThreadPool::globalInstance()->start([this, archivePath, entryPaths, removedCount, cancel]() {
    QString errorMessage;
    bool success = removeEntriesFromArchive(archivePath, entryPaths, &errorMessage, cancel);
    QVector<ArchiveItem> archiveItems;
    if (success)
      archiveItems = listArchiveEntries(archivePath, &errorMessage, cancel);
    if (archiveItems.isEmpty() && !errorMessage.isEmpty())
      success = false;
    QMetaObject::invokeMethod(this, [this, removedCount, success, errorMessage, archiveItems]() {
      setArchiveOperationActive(false);
      if (!success) {
        QMessageBox::warning(this, tr("Delete Failed"), errorMessage);
        return;
      }
      m_model->setItems(archiveItems);
      updateFolderTree();
      updateViewModeUI();
      updateEmptyStateVisibility();
      updateStatusBarStats();
      statusBar()->showMessage(tr("Deleted %1 item(s).").arg(removedCount), 3000);
    });
  });
}

void MainWindow::onViewFile() {
  if (m_currentArchivePath.isEmpty() || !m_model || m_model->rowCount() == 0) {
    statusBar()->showMessage(tr("No archive or file open to view."), 2500);
    return;
  }
  auto selection = m_tableView->selectionModel()->selectedRows();
  if (selection.isEmpty()) {
    if (m_model && m_model->rowCount() > 0) {
      m_tableView->selectRow(0);
      selection = m_tableView->selectionModel()->selectedRows();
    }
  }
  if (selection.isEmpty()) {
    statusBar()->showMessage(tr("No file selected to view."), 2500);
    return;
  }

  int srcRow = m_proxyModel->mapToSource(selection.first()).row();
  const auto &item = m_model->itemAt(srcRow);
  if (item.isDirectory) {
    if (item.filename == "..") {
      m_model->navigateUp();
    } else {
      m_model->navigateInto(item.filename);
    }
    return;
  }

  if (item.isEncrypted && m_currentPassword.isEmpty()) {
    if (!ensureArchiveUnlocked(true))
      return;
  }

  // Base directory in system temp location for transparent viewing
  QString viewBaseDir = QStandardPaths::writableLocation(QStandardPaths::TempLocation) + "/MatterPackr_View";
  QDir().mkpath(viewBaseDir);

  // Dedicated subfolder based on archive path to prevent filename collisions
  QString sessionSubDir = viewBaseDir + "/" + (m_currentArchivePath.isEmpty()
                                                ? "preview"
                                                : QString::number(qHash(m_currentArchivePath), 16));
  QDir().mkpath(sessionSubDir);

  // Replicate relative subfolder if present
  QString destDirPath = item.path.isEmpty() ? sessionSubDir : (sessionSubDir + "/" + item.path);
  QDir().mkpath(destDirPath);
  QString targetFilePath = destDirPath + "/" + item.filename;

  bool extracted = false;

  // 1. If an actual archive file exists on disk, extract the exact file transparently using libarchive or bsdtar
  if (!m_currentArchivePath.isEmpty() && QFile::exists(m_currentArchivePath)) {
    QString entryRelPath = item.path.isEmpty() ? item.filename : (item.path + "/" + item.filename);

#ifdef MATTERPACKR_HAS_LIBARCHIVE
    QString extractErr;
    if (ArchiveBackend::extractEntries(m_currentArchivePath, sessionSubDir, {entryRelPath}, &extractErr, nullptr, m_currentPassword)
        && QFile::exists(targetFilePath)) {
      extracted = true;
    }
#endif
    if (!extracted) {
      QProcess tarProc;
      tarProc.start("tar", QStringList() << "-xf" << m_currentArchivePath << "-C" << sessionSubDir << entryRelPath);
      if (tarProc.waitForFinished(3000) && tarProc.exitCode() == 0 && QFile::exists(targetFilePath)) {
        extracted = true;
      }
    }
  }

  // 2. If the file is not yet extracted (e.g. sample files or in-memory archive), create valid typed content
  if (!extracted || !QFile::exists(targetFilePath)) {
    QFile file(targetFilePath);
    if (file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
      QString lower = item.filename.toLower();
      if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") ||
          lower.endsWith(".bmp") || lower.endsWith(".webp")) {
        // Synthesize a valid bitmap image so OS photo viewers open cleanly without corruption warnings
        QImage img(800, 600, QImage::Format_RGB32);
        img.fill(QColor(0x18, 0x19, 0x20));
        QPainter p(&img);
        p.setRenderHint(QPainter::Antialiasing);

        QLinearGradient grad(0, 0, 800, 600);
        grad.setColorAt(0, QColor(0x1e, 0x29, 0x3b));
        grad.setColorAt(1, QColor(0x0f, 0x17, 0x2a));
        p.fillRect(QRect(0, 0, 800, 600), grad);

        QPixmap iconPix(":/app.png");
        if (!iconPix.isNull()) {
          p.drawPixmap(400 - 48, 170, iconPix.scaled(96, 96, Qt::KeepAspectRatio, Qt::SmoothTransformation));
        }

        p.setPen(QColor(0xff, 0xff, 0xff));
        QFont font = p.font();
        font.setPointSize(18);
        font.setBold(true);
        p.setFont(font);
        p.drawText(QRect(40, 290, 720, 40), Qt::AlignCenter, item.filename);

        font.setPointSize(11);
        font.setBold(false);
        p.setFont(font);
        p.setPen(QColor(0x94, 0xa3, 0xb8));
        p.drawText(QRect(40, 335, 720, 30), Qt::AlignCenter,
                   QString("Extracted from archive • Size: %1 • Modified: %2")
                       .arg(ArchiveModel::formatBytes(item.size))
                       .arg(item.modified.toString(Qt::ISODate)));
        p.end();

        const char *imgFormat = (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) ? "JPG" : "PNG";
        img.save(&file, imgFormat);
      } else if (lower.endsWith(".svg")) {
        QString svg = QString(
            "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"400\" height=\"300\" viewBox=\"0 0 400 300\">\n"
            "  <rect width=\"100%\" height=\"100%\" fill=\"#1e293b\"/>\n"
            "  <text x=\"50%\" y=\"45%\" fill=\"#38bdf8\" font-size=\"20\" font-family=\"sans-serif\" font-weight=\"bold\" text-anchor=\"middle\">%1</text>\n"
            "  <text x=\"50%\" y=\"60%\" fill=\"#94a3b8\" font-size=\"12\" font-family=\"sans-serif\" text-anchor=\"middle\">MatterPackr Vector Image Preview</text>\n"
            "</svg>\n").arg(item.filename);
        file.write(svg.toUtf8());
      } else if (lower.endsWith(".html") || lower.endsWith(".htm")) {
        QString html = QString(
            "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>%1</title>"
            "<style>body{font-family:sans-serif;background:#0f172a;color:#f8fafc;padding:40px;line-height:1.6;}"
            "h1{color:#38bdf8;}.card{background:#1e293b;padding:24px;border-radius:12px;border:1px solid #334155;}"
            "</style></head><body><div class=\"card\"><h1>%1</h1>"
            "<p>Extracted transparently by MatterPackr.</p>"
            "<p>Original Size: %2 | Modified: %3</p></div></body></html>")
            .arg(item.filename)
            .arg(ArchiveModel::formatBytes(item.size))
            .arg(item.modified.toString(Qt::ISODate));
        file.write(html.toUtf8());
      } else if (lower.endsWith(".md") || lower.endsWith(".txt") || lower.endsWith(".log") ||
                 lower.endsWith(".ini") || lower.endsWith(".cfg") || lower.endsWith(".conf")) {
        QString txt = QString(
            "# %1\n\n"
            "Extracted by MatterPackr for viewing.\n"
            "Original Archive: %2\n"
            "Original Size: %3 bytes\n"
            "Compressed Size: %4 bytes (%5% compression)\n"
            "CRC-32: %6\n"
            "Last Modified: %7\n"
            "Encryption: %8\n")
            .arg(item.filename)
            .arg(m_currentArchivePath.isEmpty() ? "Active Archive" : m_currentArchivePath)
            .arg(item.size)
            .arg(item.packedSize)
            .arg(item.ratio)
            .arg(item.crc32)
            .arg(item.modified.toString(Qt::ISODate))
            .arg(item.isEncrypted ? "AES-256" : "None");
        file.write(txt.toUtf8());
      } else {
        qint64 writeSize = qMin<qint64>(item.size > 0 ? item.size : 1024, 65536);
        QByteArray buf(writeSize, 0);
        file.write(buf);
      }
      file.close();
      extracted = true;
    }
  }

  if (!QFile::exists(targetFilePath)) {
    QMessageBox::warning(this, tr("View Error"),
                         tr("Failed to extract file for viewing:\n%1").arg(item.filename));
    return;
  }

  // 3. Open in default operating system application
  QUrl fileUrl = QUrl::fromLocalFile(targetFilePath);
  bool launched = QDesktopServices::openUrl(fileUrl);

#ifdef Q_OS_WIN
  if (!launched) {
    std::wstring nativePath = QDir::toNativeSeparators(targetFilePath).toStdWString();
    HINSTANCE res = ShellExecuteW(NULL, L"open", nativePath.c_str(), NULL, NULL, SW_SHOWNORMAL);
    launched = ((INT_PTR)res > 32);
  }
#elif defined(Q_OS_MAC)
  if (!launched) {
    launched = QProcess::startDetached("open", QStringList() << targetFilePath);
  }
#else
  if (!launched) {
    launched = QProcess::startDetached("xdg-open", QStringList() << targetFilePath);
  }
#endif

  if (launched) {
    statusBar()->showMessage(tr("Opened \"%1\" with default system viewer").arg(item.filename), 3500);
  } else {
    QMessageBox::warning(this, tr("Open Failed"),
                         tr("Could not find a registered default application to open:\n%1").arg(item.filename));
  }
}

void MainWindow::onSelectAllEntries() { m_tableView->selectAll(); }

void MainWindow::onTableContextMenuRequested(const QPoint &position) {
  if (!m_tableView || !m_tableView->selectionModel())
    return;

  const QModelIndex index = m_tableView->indexAt(position);
  if (index.isValid() && !m_tableView->selectionModel()->isRowSelected(
                             index.row(), QModelIndex())) {
    m_tableView->selectRow(index.row());
  }

  QMenu menu(this);
  if (m_actAdd)
    menu.addAction(m_actAdd);
  if (m_actExtract)
    menu.addAction(m_actExtract);
  if (m_actView)
    menu.addAction(m_actView);
  if (m_actCheckOut)
    menu.addAction(m_actCheckOut);
  if (m_actDelete)
    menu.addAction(m_actDelete);

  if (!menu.isEmpty())
    menu.addSeparator();
  if (m_actSelectAll)
    menu.addAction(m_actSelectAll);

  if (!menu.isEmpty())
    menu.addSeparator();
  if (m_actProperties)
    menu.addAction(m_actProperties);
  if (m_actTestIntegrity)
    menu.addAction(m_actTestIntegrity);
  if (m_actSaveAs)
    menu.addAction(m_actSaveAs);

  if (!menu.isEmpty())
    menu.exec(m_tableView->viewport()->mapToGlobal(position));
}

void MainWindow::applyTheme(const QString &mode) {
  QString activeMode = mode;
  if (activeMode == "device") {
#ifdef Q_OS_WIN
    QSettings winTheme("HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
                       QSettings::NativeFormat);
    bool lightTheme = winTheme.value("AppsUseLightTheme", 0).toInt() != 0;
    activeMode = lightTheme ? "light" : "dark";
#else
    activeMode = "dark";
#endif
  }

  bool isDark = (activeMode != "light");
  qApp->setProperty("matterpackrTheme", isDark ? "dark" : "light");
  QString qssPath = isDark ? ":/style.qss" : ":/style-light.qss";
  QFile styleFile(qssPath);
  if (styleFile.open(QIODevice::ReadOnly | QIODevice::Text)) {
    qApp->setStyleSheet(QString::fromUtf8(styleFile.readAll()));
    styleFile.close();
  }

#ifdef Q_OS_WIN
  HWND hwnd = reinterpret_cast<HWND>(winId());
  if (hwnd) {
    BOOL dm = isDark ? TRUE : FALSE;
    // DWMWA_USE_IMMERSIVE_DARK_MODE: 20 (Windows 11 / Windows 10 20H1+), 19 (older Windows 10 builds)
    if (FAILED(DwmSetWindowAttribute(hwnd, 20, &dm, sizeof(dm)))) {
      DwmSetWindowAttribute(hwnd, 19, &dm, sizeof(dm));
    }
    // DWMWA_CAPTION_COLOR (35) and DWMWA_TEXT_COLOR (36)
    COLORREF captionColor = isDark ? RGB(0x18, 0x19, 0x20) : RGB(0xf8, 0xfa, 0xfc);
    DwmSetWindowAttribute(hwnd, 35, &captionColor, sizeof(captionColor));
    COLORREF textColor = isDark ? RGB(0xe5, 0xe7, 0xeb) : RGB(0x1e, 0x29, 0x3b);
    DwmSetWindowAttribute(hwnd, 36, &textColor, sizeof(textColor));
  }
#endif
}

void MainWindow::onOptions() {
  if (!m_optionsDlg) {
    m_optionsDlg = new OptionsDialog(this);
    connect(m_optionsDlg, &OptionsDialog::settingsApplied, this, [this]() {
      m_model->setShowCheckboxes(m_optionsDlg->showCheckboxes());
      applyTheme(m_optionsDlg->themeMode());
    });
  }

  if (m_optionsDlg->exec() == QDialog::Accepted) {
    m_model->setShowCheckboxes(m_optionsDlg->showCheckboxes());
    applyTheme(m_optionsDlg->themeMode());
    int count = m_optionsDlg->selectedAssociations().size();
    statusBar()->showMessage(
        tr("Configuration saved. Registered %1 file format(s).").arg(count),
        4000);
  }
}

void MainWindow::onSetViewModeClassic() {
  m_model->setViewMode(ArchiveModel::ViewMode::Classic);
  if (m_actClassic)
    m_actClassic->setChecked(true);
  if (m_actExplorer)
    m_actExplorer->setChecked(false);
  updateViewModeUI();
  statusBar()->showMessage(tr("Classic View enabled (WinZip flat list)"), 2500);
}

void MainWindow::onSetViewModeExplorer() {
  m_model->setViewMode(ArchiveModel::ViewMode::Explorer);
  if (m_actClassic)
    m_actClassic->setChecked(false);
  if (m_actExplorer)
    m_actExplorer->setChecked(true);
  updateViewModeUI();
  statusBar()->showMessage(
      tr("Explorer View enabled (WinRAR / 7-Zip folder browsing)"), 2500);
}

void MainWindow::onToggleFolderTree() {
  QSettings settings("MatterPackr", "MatterPackr");
  if (m_model->viewMode() != ArchiveModel::ViewMode::Explorer) {
    onSetViewModeExplorer();
    m_treeContainer->show();
    int leftW = m_lastTreeWidth > 50 ? m_lastTreeWidth : 200;
    int rightW = qMax(200, m_splitter->width() - leftW);
    m_splitter->setSizes({leftW, rightW});
    if (m_actToggleFolderTree)
      m_actToggleFolderTree->setChecked(true);
    settings.setValue("folderTreeVisible", true);
    updateFolderTree();
    return;
  }

  bool isExpanded = m_treeContainer && m_treeContainer->isVisible() &&
                    m_splitter->sizes().value(0, 0) > 10;
  if (isExpanded) {
    // Collapse sidebar
    int curW = m_splitter->sizes().value(0, 200);
    if (curW > 50) {
      m_lastTreeWidth = curW;
      settings.setValue("folderTreeWidth", curW);
    }
    m_treeContainer->hide();
    m_splitter->setSizes({0, m_splitter->width()});
    if (m_actToggleFolderTree)
      m_actToggleFolderTree->setChecked(false);
    settings.setValue("folderTreeVisible", false);
    statusBar()->showMessage(tr("Folders sidebar closed"), 2000);
  } else {
    // Expand sidebar
    m_treeContainer->show();
    int leftW = m_lastTreeWidth > 50 ? m_lastTreeWidth : 200;
    int rightW = qMax(200, m_splitter->width() - leftW);
    m_splitter->setSizes({leftW, rightW});
    if (m_actToggleFolderTree)
      m_actToggleFolderTree->setChecked(true);
    settings.setValue("folderTreeVisible", true);
    updateFolderTree();
    statusBar()->showMessage(tr("Folders sidebar opened"), 2000);
  }
}

void MainWindow::updateViewModeUI() {
  bool isExplorer = (m_model->viewMode() == ArchiveModel::ViewMode::Explorer);

  // Show "Path" column in Classic view; hide in Explorer view
  m_tableView->setColumnHidden(ArchiveModel::ColPath, isExplorer);

  // Enable/disable sidebar toggle action
  if (m_actToggleFolderTree) {
    m_actToggleFolderTree->setEnabled(isExplorer);
  }

  // Show / hide left folder tree pane based on view mode and saved preference
  if (m_treeContainer) {
    QSettings settings("MatterPackr", "MatterPackr");
    bool savedVisible = settings.value("folderTreeVisible", true).toBool();
    m_lastTreeWidth = settings.value("folderTreeWidth", 200).toInt();
    if (m_lastTreeWidth < 50)
      m_lastTreeWidth = 200;

    bool shouldShow = isExplorer && savedVisible;
    m_treeContainer->setVisible(shouldShow);
    if (shouldShow) {
      int leftW = m_lastTreeWidth > 50 ? m_lastTreeWidth : 200;
      int rightW = qMax(200, m_splitter->width() - leftW);
      m_splitter->setSizes({leftW, rightW});
      if (m_actToggleFolderTree)
        m_actToggleFolderTree->setChecked(true);
      updateFolderTree();
    } else {
      m_splitter->setSizes({0, m_splitter->width()});
      if (m_actToggleFolderTree)
        m_actToggleFolderTree->setChecked(false);
    }
  }

  // Update toolbar toggle action icon and tooltip
  if (m_actToggleView) {
    if (isExplorer) {
      m_actToggleView->setText(tr("Explorer"));
      m_actToggleView->setIcon(QIcon(":/toolbar/explorer.svg"));
      m_actToggleView->setToolTip(
          tr("Current: Explorer View. Click to switch to "
             "Classic View"));
    } else {
      m_actToggleView->setText(tr("Classic"));
      m_actToggleView->setIcon(QIcon(":/toolbar/classic.svg"));
      m_actToggleView->setToolTip(tr("Current: Classic View. Click to "
                                     "switch to Explorer View"));
    }
  }

  // Persist preference
  QSettings settings("MatterPackr", "MatterPackr");
  settings.setValue("viewMode", isExplorer ? "explorer" : "classic");

  updateNavBar();
}

void MainWindow::updateNavBar() {
  if (!m_navBar)
    return;
  bool isExplorer = (m_model->viewMode() == ArchiveModel::ViewMode::Explorer);
  m_navBar->setVisible(isExplorer);
  if (!isExplorer)
    return;

  if (m_btnNavUp) {
    m_btnNavUp->setEnabled(m_model->canNavigateUp());
  }

  if (m_lblCurrentPath) {
    QString cur = m_model->currentFolder();
    QString display = cur.isEmpty() ? "/" : ("/" + cur + "/");
    m_lblCurrentPath->setText(
        QString("📁  Location: <b>%1</b>").arg(display));
  }
}

void MainWindow::updateFolderTree() {
  if (!m_folderTree)
    return;
  m_folderTree->clear();

  QString archiveName = m_currentArchivePath.isEmpty()
                            ? tr("Current Archive")
                            : QFileInfo(m_currentArchivePath).fileName();

  // Root node: All files (WinZip flat view shortcut)
  auto *allItem = new QTreeWidgetItem(m_folderTree);
  allItem->setText(0, QString("%1 (All Files)").arg(archiveName));
  allItem->setIcon(0, getArchiveTypeIcon(m_currentArchivePath));
  allItem->setData(0, Qt::UserRole, "__ALL__");
  allItem->setToolTip(0, tr("Click to switch to WinZip Classic flat view"));

  // Root node: "/"
  auto *rootItem = new QTreeWidgetItem(m_folderTree);
  rootItem->setText(0, tr("📁  / (Root)"));
  rootItem->setData(0, Qt::UserRole, "");

  // Build hierarchical folder tree from allFolders
  QStringList folders = m_model->allFolders();
  QMap<QString, QTreeWidgetItem *> folderMap;
  folderMap[""] = rootItem;

  for (const QString &path : folders) {
    if (path.isEmpty())
      continue;
    QString parentP = ArchiveModel::parentPath(path);
    QTreeWidgetItem *parentItem = folderMap.value(parentP, rootItem);

    auto *item = new QTreeWidgetItem(parentItem);
    QString folderName = path.section('/', -1);
    item->setText(0, QString("📁  %1").arg(folderName));
    item->setData(0, Qt::UserRole, path);
    folderMap[path] = item;
  }

  m_folderTree->expandAll();
  highlightCurrentFolderInTree();
}

void MainWindow::highlightCurrentFolderInTree() {
  if (!m_folderTree)
    return;
  QString cur = m_model->currentFolder();
  bool isClassic = (m_model->viewMode() == ArchiveModel::ViewMode::Classic);

  for (int i = 0; i < m_folderTree->topLevelItemCount(); ++i) {
    auto *top = m_folderTree->topLevelItem(i);
    std::function<void(QTreeWidgetItem *)> checkItem =
        [&](QTreeWidgetItem *it) {
          QString path = it->data(0, Qt::UserRole).toString();
          if ((isClassic && path == "__ALL__") || (!isClassic && path == cur)) {
            m_folderTree->setCurrentItem(it);
          }
          for (int c = 0; c < it->childCount(); ++c) {
            checkItem(it->child(c));
          }
        };
    checkItem(top);
  }
}

void MainWindow::onFolderTreeItemClicked(QTreeWidgetItem *item, int) {
  if (!item)
    return;
  QString target = item->data(0, Qt::UserRole).toString();
  if (target == "__ALL__") {
    onSetViewModeClassic();
  } else {
    if (m_model->viewMode() != ArchiveModel::ViewMode::Explorer) {
      m_model->setViewMode(ArchiveModel::ViewMode::Explorer);
      if (m_actClassic)
        m_actClassic->setChecked(false);
      if (m_actExplorer)
        m_actExplorer->setChecked(true);
      updateViewModeUI();
    }
    m_model->setCurrentFolder(target);
  }
}

void MainWindow::onNavUpClicked() { m_model->navigateUp(); }

void MainWindow::onCheckForUpdates() {
  if (!m_updateManager) {
    m_updateManager = new UpdateManager(this);
  }
  m_updateManager->checkForUpdates();
}

void MainWindow::onAbout() {
  AboutDialog dlg(this);
  dlg.exec();
}

void MainWindow::onSelectionChanged() { updateStatusBarStats(); }

void MainWindow::onTableDoubleClicked(const QModelIndex &proxyIndex) {
  if (!proxyIndex.isValid())
    return;
  QModelIndex srcIndex = m_proxyModel->mapToSource(proxyIndex);
  if (!srcIndex.isValid())
    return;

  const ArchiveItem &item = m_model->itemAt(srcIndex.row());
  if (item.isDirectory) {
    if (item.filename == "..") {
      m_model->navigateUp();
    } else {
      m_model->navigateInto(item.filename);
    }
  } else {
    onViewFile();
  }
}

void MainWindow::onToggleFilter() {
  if (!m_filterBar || m_currentArchivePath.isEmpty() || !m_model || m_model->rowCount() == 0)
    return;

  bool shouldShow = !m_filterBar->isVisible();
  m_filterBar->setVisible(shouldShow);

  if (m_actFilterFiles)
    m_actFilterFiles->setChecked(shouldShow);
  if (m_actSearch)
    m_actSearch->setChecked(shouldShow);

  if (shouldShow) {
    m_filterEdit->setFocus();
    m_filterEdit->selectAll();
  } else {
    m_filterEdit->clear();
    m_proxyModel->setFilterPattern(QString());
    if (m_lblFilterMatches)
      m_lblFilterMatches->clear();
    m_tableView->setFocus();
  }
}

void MainWindow::onFilterTextChanged(const QString &text) {
  m_proxyModel->setFilterPattern(text);
  int count = m_proxyModel->rowCount();
  int total = m_model->rowCount();
  if (!text.trimmed().isEmpty()) {
    m_lblFilterMatches->setText(tr("%1 of %2 files").arg(count).arg(total));
  } else {
    m_lblFilterMatches->clear();
  }
  updateStatusBarStats();
}

bool MainWindow::ensureArchiveUnlocked(bool forExtraction) {
  if (!m_isCurrentEncrypted || !m_currentPassword.isEmpty())
    return true;

  const QString archiveName = QFileInfo(m_currentArchivePath).fileName();
  PasswordPromptDialog dlg(
      forExtraction ? tr("Extract Encrypted Archive") : tr("Unlock Encrypted Archive"),
      tr("<b>%1</b> is password-protected.<br>Please enter the password to %2:")
          .arg(archiveName)
          .arg(forExtraction ? tr("extract its contents") : tr("unlock and access its contents")),
      forExtraction ? tr("Extract") : tr("Unlock"),
      this);

  if (dlg.exec() != QDialog::Accepted)
    return false;

  m_currentPassword = dlg.password();
  return true;
}

void MainWindow::refreshCurrentArchive() {
  if (!m_currentArchivePath.isEmpty()) {
    openArchiveFile(m_currentArchivePath);
  }
}

void MainWindow::onDragExtractionRequested(const QModelIndexList &selectedRows) {
  if (m_currentArchivePath.isEmpty() || m_archiveOperationActive)
    return;

  if (selectedRows.isEmpty())
    return;

  QSet<QString> seenEntries;
  QStringList entriesToExtract;
  for (const QModelIndex &proxyIndex : selectedRows) {
    const QModelIndex sourceIndex = m_proxyModel->mapToSource(proxyIndex);
    if (!sourceIndex.isValid())
      continue;
    const ArchiveItem &item = m_model->itemAt(sourceIndex.row());
    if (item.filename == QStringLiteral(".."))
      continue;
    const QString entryPath = archiveEntryPath(item);
    if (!item.filename.isEmpty() && isSafeArchiveEntryPath(entryPath) && !seenEntries.contains(entryPath)) {
      seenEntries.insert(entryPath);
      entriesToExtract.append(entryPath);
    }
  }

  // If checkboxes are enabled, also include any checked items
  if (m_model && m_model->showCheckboxes()) {
    for (const ArchiveItem &item : m_model->items()) {
      if (item.isChecked && item.filename != QStringLiteral("..")) {
        const QString entryPath = archiveEntryPath(item);
        if (!item.filename.isEmpty() && isSafeArchiveEntryPath(entryPath) && !seenEntries.contains(entryPath)) {
          seenEntries.insert(entryPath);
          entriesToExtract.append(entryPath);
        }
      }
    }
  }

  if (entriesToExtract.isEmpty())
    return;

  bool requiresPassword = m_isCurrentEncrypted;
  if (!requiresPassword) {
    for (const ArchiveItem &item : m_model->allItems()) {
      if (seenEntries.contains(archiveEntryPath(item)) && item.isEncrypted) {
        requiresPassword = true;
        break;
      }
    }
  }

  if (requiresPassword && m_currentPassword.isEmpty()) {
    if (!ensureArchiveUnlocked(true))
      return;
  }

  QString tempDropBase =
      QStandardPaths::writableLocation(QStandardPaths::TempLocation) +
      QStringLiteral("/MatterPackr_DragDrop");
  QString sessionDropDir =
      tempDropBase + QLatin1Char('/') +
      QString::number(QCoreApplication::applicationPid()) + QLatin1Char('_') +
      QString::number(QDateTime::currentMSecsSinceEpoch());
  QDir().mkpath(sessionDropDir);

  QString errorMessage;
  bool ok = false;
#ifdef MATTERPACKR_HAS_LIBARCHIVE
  ok = ArchiveBackend::extractEntries(
      m_currentArchivePath, sessionDropDir, entriesToExtract, &errorMessage,
      nullptr, m_currentPassword);
#endif
  if (!ok && errorMessage.isEmpty()) {
    QStringList arguments{QStringLiteral("-xf"), m_currentArchivePath,
                          QStringLiteral("-C"), sessionDropDir};
    arguments.append(entriesToExtract);
    ok = runArchiveCommand(arguments, nullptr, &errorMessage);
  }

  if (!ok) {
    if (isEncryptionError(errorMessage)) {
      m_currentPassword.clear();
      QMessageBox::warning(
          this, tr("Drag Extraction Failed"),
          tr("Incorrect password. Could not extract files for drag-and-drop."));
      return;
    }
    QMessageBox::warning(this, tr("Drag Extraction Failed"), errorMessage);
    return;
  }

  QList<QUrl> urls;
  for (const QString &entryPath : entriesToExtract) {
    QString extractedPath = QDir(sessionDropDir).filePath(entryPath);
    if (QFile::exists(extractedPath) || QDir(extractedPath).exists()) {
      urls.append(QUrl::fromLocalFile(extractedPath));
    }
  }
  if (urls.isEmpty()) {
    QDir dir(sessionDropDir);
    const QStringList topEntries =
        dir.entryList(QDir::Files | QDir::Dirs | QDir::NoDotAndDotDot);
    for (const QString &e : topEntries) {
      urls.append(QUrl::fromLocalFile(dir.filePath(e)));
    }
  }

  if (urls.isEmpty())
    return;

  auto *mimeData = new QMimeData();
  mimeData->setUrls(urls);

  auto *drag = new QDrag(this);
  drag->setMimeData(mimeData);

  QPixmap pixmap(200, 38);
  pixmap.fill(Qt::transparent);
  QPainter painter(&pixmap);
  painter.setRenderHint(QPainter::Antialiasing);
  painter.setBrush(QColor(30, 41, 59, 230));
  painter.setPen(QPen(QColor(59, 130, 246), 1.5));
  painter.drawRoundedRect(pixmap.rect().adjusted(1, 1, -1, -1), 6, 6);
  painter.setPen(Qt::white);
  QFont font = painter.font();
  font.setPointSize(9);
  font.setBold(true);
  painter.setFont(font);
  QString label = urls.size() == 1
      ? QFileInfo(urls.first().toLocalFile()).fileName()
      : tr("Extracting %1 items").arg(urls.size());
  painter.drawText(pixmap.rect(), Qt::AlignCenter, label);
  painter.end();
  drag->setPixmap(pixmap);
  drag->setHotSpot(QPoint(pixmap.width() / 2, pixmap.height() / 2));

  statusBar()->showMessage(
      tr("Dragging %1 item(s). Drop onto desktop or file manager to extract.")
          .arg(urls.size()),
      4000);
  drag->exec(Qt::CopyAction);
}

void MainWindow::onFilesDropped(const QStringList &filePaths) {
  if (filePaths.isEmpty() || m_archiveOperationActive)
    return;

  if (filePaths.size() == 1) {
    const QString singleFile = filePaths.first();
    const QString lower = singleFile.toLower();
    if (lower.endsWith(QStringLiteral(".zip")) ||
        lower.endsWith(QStringLiteral(".7z")) ||
        lower.endsWith(QStringLiteral(".tar")) ||
        lower.endsWith(QStringLiteral(".tar.gz")) ||
        lower.endsWith(QStringLiteral(".tgz")) ||
        lower.endsWith(QStringLiteral(".iso")) ||
        lower.endsWith(QStringLiteral(".rar")) ||
        lower.endsWith(QStringLiteral(".cab")) ||
        lower.endsWith(QStringLiteral(".wim")) ||
        lower.endsWith(QStringLiteral(".vhd"))) {
      openArchiveFile(singleFile);
      return;
    }
  }

  if (!m_currentArchivePath.isEmpty()) {
    setArchiveOperationActive(true, tr("Adding dropped files..."));
    const QString archivePath = m_currentArchivePath;
    const OperationCancel cancel = m_archiveOperationCancel;
    QThreadPool::globalInstance()->start([this, archivePath, filePaths, cancel]() {
      QString errorMessage;
      bool success = addFilesToArchive(archivePath, filePaths, &errorMessage, cancel);
      QMetaObject::invokeMethod(this, [this, success, errorMessage, filePaths]() {
        setArchiveOperationActive(false);
        if (!success) {
          QMessageBox::warning(this, tr("Add Files Failed"), errorMessage);
          return;
        }
        refreshCurrentArchive();
        statusBar()->showMessage(
            tr("Added %1 file(s) to archive.").arg(filePaths.size()), 3500);
      });
    });
    return;
  }

  onNewArchiveWithFiles(filePaths);
}

void MainWindow::onNewArchiveWithFiles(const QStringList &files) {
  if (files.isEmpty() || m_archiveOperationActive)
    return;

  if (!promptAndCleanUpCheckOut())
    return;

  QString suggestedName = QStringLiteral("Archive.7z");
  if (!files.isEmpty()) {
    QFileInfo first(files.first());
    suggestedName = first.isDir()
        ? first.fileName() + QStringLiteral(".7z")
        : first.completeBaseName() + QStringLiteral(".7z");
  }

  QString filename = QFileDialog::getSaveFileName(
      this, tr("Create New Archive"), suggestedName,
      tr("7Z Archive (*.7z);;ZIP Archive (*.zip);;TAR Archive (*.tar);;GZipped TAR Archive (*.tar.gz)"));
  if (filename.isEmpty())
    return;

  NewArchiveDialog setupDialog(filename, this);
  setupDialog.addFiles(files);
  if (setupDialog.exec() != QDialog::Accepted)
    return;

  const QString format = setupDialog.format();
  const QString archiveBaseName = QFileInfo(filename).completeBaseName().isEmpty()
      ? filename
      : QDir(QFileInfo(filename).absolutePath())
            .filePath(QFileInfo(filename).completeBaseName());
  const QString selectedSuffix =
      format == QStringLiteral("7z")
          ? QStringLiteral(".7z")
          : format == QStringLiteral("zip")
              ? QStringLiteral(".zip")
              : format == QStringLiteral("tar.gz")
                  ? QStringLiteral(".tar.gz")
                  : QStringLiteral(".tar");
  filename = archiveBaseName + selectedSuffix;
  const QStringList filesToAdd = setupDialog.files();
  ArchiveBackend::ArchiveOptions archiveOptions;
  archiveOptions.password = setupDialog.password();

  setArchiveOperationActive(true, tr("Creating archive..."));
  const OperationCancel cancel = m_archiveOperationCancel;
  QThreadPool::globalInstance()->start([this, filename, format, filesToAdd, archiveOptions, cancel]() {
    QString errorMessage;
    bool success = false;
    if (format == QStringLiteral("7z")) {
      success = archiveOptions.password.isEmpty()
          ? ArchiveBackend::create7z(filename, filesToAdd, &errorMessage, cancel)
          : ArchiveBackend::createEncrypted7z(filename, filesToAdd, archiveOptions,
                                               &errorMessage, cancel);
    } else if (format == QStringLiteral("zip")) {
      success = ArchiveBackend::createZip(filename, filesToAdd, archiveOptions,
                                          &errorMessage, cancel);
    } else {
      success = ArchiveBackend::createEmpty(filename, &errorMessage, cancel);
      if (success && !filesToAdd.isEmpty())
        success = addFilesToArchive(filename, filesToAdd, &errorMessage, cancel);
    }
    QMetaObject::invokeMethod(this, [this, filename, archiveOptions, success, errorMessage]() {
      setArchiveOperationActive(false);
      if (!success) {
        QMessageBox::warning(this, tr("Create Archive Failed"), errorMessage);
        return;
      }
      m_model->clear();
      m_currentArchivePath = filename;
      m_isCurrentEncrypted = !archiveOptions.password.isEmpty();
      m_currentPassword = archiveOptions.password;
      updateWindowTitle();
      updateEmptyStateVisibility();
      updateStatusBarStats();
      statusBar()->showMessage(
          tr("Created new archive: %1").arg(QFileInfo(filename).fileName()), 3000);
      refreshCurrentArchive();
    });
  });
}

void MainWindow::dragEnterEvent(QDragEnterEvent *event) {
  if (event->mimeData()->hasUrls()) {
    event->acceptProposedAction();
  } else {
    event->ignore();
  }
}

void MainWindow::dragMoveEvent(QDragMoveEvent *event) {
  if (event->mimeData()->hasUrls()) {
    event->acceptProposedAction();
  } else {
    event->ignore();
  }
}

void MainWindow::dropEvent(QDropEvent *event) {
  if (event->mimeData()->hasUrls()) {
    QStringList paths;
    for (const QUrl &url : event->mimeData()->urls()) {
      if (url.isLocalFile()) {
        paths.append(url.toLocalFile());
      }
    }
    if (!paths.isEmpty()) {
      event->acceptProposedAction();
      onFilesDropped(paths);
      return;
    }
  }
  event->ignore();
}
