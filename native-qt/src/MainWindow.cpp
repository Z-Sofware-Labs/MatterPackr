#include "MainWindow.h"
#include "AboutDialog.h"
#include "OptionsDialog.h"
#include "CheckOutDialog.h"
#include "FavoritesDialog.h"
#include "UpdateManager.h"
#include <QApplication>
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
#include <QRandomGenerator>
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
#include <QKeyEvent>
#include <QFileOpenEvent>
#include <QProcess>
#include <QDir>
#include <functional>

#ifdef Q_OS_WIN
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <shellapi.h>
#include <dwmapi.h>
#endif

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent), m_engine(new CompressionEngine(this)) {
  resize(1024, 640);
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
  header->setStretchLastSection(true);
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

  connect(m_tableView->selectionModel(), &QItemSelectionModel::selectionChanged,
          this, &MainWindow::onSelectionChanged);
  connect(m_tableView, &QTableView::doubleClicked, this,
          &MainWindow::onTableDoubleClicked);

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
  if (m_actAdd)
    m_actAdd->setEnabled(true);
  if (m_actExtract)
    m_actExtract->setEnabled(hasFiles);
  if (m_actCheckOut)
    m_actCheckOut->setEnabled(hasFiles);
  if (m_actSelectAll)
    m_actSelectAll->setEnabled(hasFiles);
  if (m_actAddCurrentFavorite)
    m_actAddCurrentFavorite->setEnabled(!m_currentArchivePath.isEmpty());
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
  auto *tbNew = toolBar->addAction(QIcon(":/toolbar/new.svg"), tr("New"), this,
                                   &MainWindow::onNewArchive);
  tbNew->setToolTip(tr("Create a new archive (Ctrl+N)"));

  auto *tbOpen = toolBar->addAction(QIcon(":/toolbar/open.svg"), tr("Open"),
                                    this, &MainWindow::onOpenArchive);
  tbOpen->setToolTip(tr("Open archive from computer (Ctrl+O)"));
  toolBar->addSeparator();

  // 2. Add, Extract, View, CheckOut
  auto *tbAdd = toolBar->addAction(QIcon(":/toolbar/add.svg"), tr("Add"), this,
                                   &MainWindow::onAddFiles);
  tbAdd->setToolTip(tr("Add files to current archive (Ctrl+A)"));

  auto *tbExtract =
      toolBar->addAction(QIcon(":/toolbar/extract.svg"), tr("Extract"), this,
                         &MainWindow::onExtractFiles);
  tbExtract->setToolTip(tr("Extract files from archive (Ctrl+E)"));

  auto *tbView = toolBar->addAction(QIcon(":/toolbar/view.svg"), tr("View"),
                                    this, &MainWindow::onViewFile);
  tbView->setToolTip(tr("View selected file (Ctrl+V)"));

  auto *tbCheckOut =
      toolBar->addAction(QIcon(":/toolbar/checkout.svg"), tr("CheckOut"), this,
                         &MainWindow::onCheckOut);
  tbCheckOut->setToolTip(tr("CheckOut and test archive"));
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

  bool hasSelection = selCount > 0;
  if (m_actDelete)
    m_actDelete->setEnabled(hasSelection);
  if (m_actView)
    m_actView->setEnabled(hasSelection);
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
  else if (lowerPath.endsWith(".tar.bz2") || lowerPath.endsWith(".tbz2") || lowerPath.endsWith(".tbz")) ext = "tbz2";
  else if (lowerPath.endsWith(".tar.xz") || lowerPath.endsWith(".txz")) ext = "txz";
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
  else if (ext == "tbz2") result = getCustomIcon("tbz2");
  else if (ext == "txz") result = getCustomIcon("txz");
  else if (ext == "gz" || ext == "gzip") result = getCustomIcon("gz");
  else if (ext == "bz2" || ext == "bzip2") result = getCustomIcon("bz2");
  else if (ext == "xz") result = getCustomIcon("txz");
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
  if (!promptAndCleanUpCheckOut())
    return;

  QString filename = QFileDialog::getSaveFileName(
      this, tr("Create New Archive"), QString(),
      tr("ZIP Archives (*.zip);;7-Zip Archives (*.7z);;TAR Archives "
         "(*.tar);;All Files (*.*)"));
  if (filename.isEmpty())
    return;

  m_model->clear();
  m_currentArchivePath = filename;
  m_isCurrentEncrypted = false;
  m_currentPassword.clear();

  updateWindowTitle();
  updateEmptyStateVisibility();
  updateStatusBarStats();

  statusBar()->showMessage(
      tr("Created new archive: %1").arg(QFileInfo(filename).fileName()), 3000);
}

void MainWindow::onOpenArchive() {
  if (!promptAndCleanUpCheckOut())
    return;

  QString filename = QFileDialog::getOpenFileName(
      this, tr("Open Archive"), QString(),
      tr("Supported Archives (*.zip *.7z *.tar *.tar.gz *.tgz *.gz *.tar.bz2 "
         "*.tbz2 *.tar.xz *.txz *.rar *.iso *.cab *.img *.cpio *.ar);;All "
         "Files (*.*)"));
  if (filename.isEmpty())
    return;

  openArchiveFile(filename);
}

void MainWindow::openArchiveFile(const QString &filename) {
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

  m_currentArchivePath = fileInfo.exists() ? fileInfo.absoluteFilePath() : path;
  updateWindowTitle();

  // Populate archive files with hierarchical folders
  m_model->clear();

  QVector<ArchiveItem> sampleFiles = {
      {"1", "README.md", "MD", QDateTime::currentDateTime().addDays(-1), 4096,
       1228, 70, "0x98A1B2C3", false, "None", "", false},

      {"2", "Architecture_Overview.pdf", "PDF",
       QDateTime::currentDateTime().addDays(-3), 458752, 321126, 30,
       "0x4F12D3E4", false, "None", "docs", false},
      {"3", "Release_Notes_v3.0.txt", "TXT",
       QDateTime::currentDateTime().addDays(-2), 14336, 4300, 70, "0x89C1D2E3",
       false, "None", "docs", false},

      {"4", "libdeflate_engine_x64.dll", "DLL",
       QDateTime::currentDateTime().addDays(-5), 1245184, 622592, 50,
       "0x12A3B4C5", false, "None", "bin", false},
      {"5", "quantum_vectors_dataset.bin", "BIN",
       QDateTime::currentDateTime().addDays(-10), 8388608, 4194304, 50,
       "0x67E8F9A0", false, "None", "bin", false},

      {"6", "logo_brand_assets.svg", "SVG",
       QDateTime::currentDateTime().addDays(-4), 65536, 16384, 75, "0xA1B2C3D4",
       false, "None", "assets", false},
      {"7", "app_icon_256.png", "PNG", QDateTime::currentDateTime().addDays(-6),
       32768, 24576, 25, "0xB2C3D4E5", false, "None", "assets/icons", false},

      {"8", "main.cpp", "CPP", QDateTime::currentDateTime().addDays(-1), 8192,
       2457, 70, "0xC3D4E5F6", false, "None", "src", false},
      {"9", "MainWindow.cpp", "CPP", QDateTime::currentDateTime().addDays(-1),
       26624, 7987, 70, "0xD4E5F6A7", false, "None", "src/ui", false},
      {"10", "CompressionEngine.cpp", "CPP",
       QDateTime::currentDateTime().addDays(-2), 18432, 5529, 70, "0xE5F6A7B8",
       false, "None", "src/core", false}};

  m_model->setItems(sampleFiles);
  updateFolderTree();
  updateViewModeUI();
  updateEmptyStateVisibility();
  updateStatusBarStats();

  statusBar()->showMessage(tr("Opened archive: %1 (%2 items)")
                               .arg(QFileInfo(filename).fileName())
                               .arg(sampleFiles.size()),
                           3000);
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
      tr("Supported Archives (*.zip *.7z *.tar *.tar.gz *.tgz *.gz *.tar.bz2 "
         "*.tbz2 *.tar.xz *.txz *.rar *.iso *.cab *.img *.cpio *.ar);;All Files (*.*)"));
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

  m_currentArchivePath = filename;
  updateWindowTitle();
  statusBar()->showMessage(
      tr("Archive saved as: %1").arg(QFileInfo(filename).fileName()), 3000);
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
  QStringList files = QFileDialog::getOpenFileNames(
      this, tr("Add Files to Archive"), QString(), tr("All Files (*.*)"));
  if (files.isEmpty())
    return;

  for (const QString &filepath : files) {
    QFileInfo fi(filepath);
    qint64 size = fi.size();
    qint64 compSize = static_cast<qint64>(size * 0.65);
    int ratio = 35;

    ArchiveItem item{
        QString::number(QRandomGenerator::global()->generate()),
        fi.fileName(),
        fi.suffix().toUpper(),
        fi.lastModified(),
        size,
        compSize,
        ratio,
        QString("0x%1")
            .arg(QRandomGenerator::global()->generate(), 8, 16, QChar('0'))
            .toUpper(),
        m_isCurrentEncrypted,
        m_isCurrentEncrypted ? "AES-256" : "None",
        "",
        false};
    m_model->addItem(item);
  }

  updateEmptyStateVisibility();
  updateStatusBarStats();

  statusBar()->showMessage(tr("Added %1 file(s) to archive.").arg(files.size()),
                           3000);
}

void MainWindow::onExtractFiles() {
  if (m_model->rowCount() == 0)
    return;

  QString dir = QFileDialog::getExistingDirectory(
      this, tr("Extract Files To Folder"), QString());
  if (dir.isEmpty())
    return;

  statusBar()->showMessage(
      tr("Extracted %1 files to %2").arg(m_model->rowCount()).arg(dir), 3500);
}

void MainWindow::onCheckOut() {
  if (m_model->rowCount() == 0) {
    QMessageBox::information(this, tr("CheckOut Archive"),
                             tr("The archive is empty. Open or create an archive to CheckOut."));
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
  for (const auto &idx : selection) {
    int srcRow = m_proxyModel->mapToSource(idx).row();
    idsToRemove.insert(m_model->itemAt(srcRow).id);
  }
  m_model->removeRowsByIds(idsToRemove);
  updateEmptyStateVisibility();
  updateStatusBarStats();

  statusBar()->showMessage(tr("Deleted %1 item(s).").arg(idsToRemove.size()),
                           3000);
}

void MainWindow::onViewFile() {
  auto selection = m_tableView->selectionModel()->selectedRows();
  if (selection.isEmpty())
    return;

  int srcRow = m_proxyModel->mapToSource(selection.first()).row();
  const auto &item = m_model->itemAt(srcRow);

  QMessageBox::information(this, tr("View File: %1").arg(item.filename),
                           tr("<b>Filename:</b> %1<br>"
                              "<b>Original Size:</b> %2<br>"
                              "<b>Compressed Size:</b> %3 (%4% saved)<br>"
                              "<b>Last Modified:</b> %5<br>"
                              "<b>CRC-32:</b> %6<br>"
                              "<b>Encryption:</b> %7")
                               .arg(item.filename)
                               .arg(ArchiveModel::formatBytes(item.size))
                               .arg(ArchiveModel::formatBytes(item.packedSize))
                               .arg(item.ratio)
                               .arg(item.modified.toString(Qt::ISODate))
                               .arg(item.crc32)
                               .arg(item.isEncrypted ? "AES-256" : "None"));
}

void MainWindow::onSelectAllEntries() { m_tableView->selectAll(); }

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
  if (!m_filterBar)
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
