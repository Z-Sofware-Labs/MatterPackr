#pragma once

#include <QMainWindow>
#include <QTableView>
#include <QHeaderView>
#include <QToolBar>
#include <QStatusBar>
#include <QMenuBar>
#include <QLabel>
#include <QAction>
#include <QActionGroup>
#include <QSortFilterProxyModel>
#include <QProgressBar>
#include <QSplitter>
#include <QTreeWidget>
#include <QTreeWidgetItem>
#include <QPushButton>
#include <QStackedWidget>
#include "ArchiveModel.h"
#include "ArchiveTableView.h"
#include "CompressionEngine.h"

class QMenu;
class QToolButton;
class QLineEdit;
class UpdateManager;

class MainWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit MainWindow(QWidget *parent = nullptr);
    ~MainWindow() override;
    void openArchiveFile(const QString &filename);

protected:
    void resizeEvent(QResizeEvent *event) override;
    void closeEvent(QCloseEvent *event) override;
    bool eventFilter(QObject *obj, QEvent *event) override;

private slots:
    // File menu
    void onNewArchive();
    void onOpenArchive();
    void onAddCurrentToFavorites();
    void onAddFavoriteFromDisk();
    void onRemoveFavorite(const QString &path);
    void onClearAllFavorites();
    void updateFavoritesMenu();
    void onCloseArchive();
    void onSaveArchiveAs();
    void onArchiveProperties();

    // Actions menu
    void onAddFiles();
    void onExtractFiles();
    void onCheckOut();
    void onDeleteFiles();
    void onViewFile();
    void onSelectAllEntries();

    // Options menu
    void onOptions();

    // View menu
    void onToggleFilter();
    void onFilterTextChanged(const QString &text);
    void onToggleFolderTree();
    void onSetViewModeClassic();
    void onSetViewModeExplorer();

    // Help menu
    void onCheckForUpdates();
    void onAbout();

    // UI events
    void onSelectionChanged();
    void onTableDoubleClicked(const QModelIndex &index);

private:
    void createActions();
    void createMenus();
    void createToolBars();
    void createStatusBar();
    void createCentralGrid();
    void updateEmptyStateVisibility();
    void updateStatusBarStats();
    void updateWindowTitle();
    void applyTheme(const QString &mode);

    void updateFolderTree();
    void updateNavBar();
    void updateViewModeUI();
    void highlightCurrentFolderInTree();
    void onFolderTreeItemClicked(QTreeWidgetItem *item, int column);
    void onNavUpClicked();
    bool promptAndCleanUpCheckOut();

    QString m_currentArchivePath;
    bool m_isCurrentEncrypted = false;
    QString m_currentPassword;

    // CheckOut staging state
    QString m_activeCheckOutDir;
    QStringList m_checkOutShortcuts;

    ArchiveModel *m_model = nullptr;
    ArchiveSortProxyModel *m_proxyModel = nullptr;
    ArchiveTableView *m_tableView = nullptr;
    QWidget *m_emptyWidget = nullptr;
    QStackedWidget *m_centralStack = nullptr;

    // View Navigation & Two-Pane Explorer Tree
    QSplitter *m_splitter = nullptr;
    QWidget *m_treeContainer = nullptr;
    QTreeWidget *m_folderTree = nullptr;
    QWidget *m_tableContainer = nullptr;
    QWidget *m_filterBar = nullptr;
    QLineEdit *m_filterEdit = nullptr;
    QLabel *m_lblFilterMatches = nullptr;
    QPushButton *m_btnCloseFilter = nullptr;
    QWidget *m_navBar = nullptr;
    QPushButton *m_btnNavUp = nullptr;
    QPushButton *m_btnCollapseTree = nullptr;
    QLabel *m_lblCurrentPath = nullptr;
    int m_lastTreeWidth = 200;

    // Menu and Toolbar Actions
    QAction *m_actNew = nullptr;
    QAction *m_actOpen = nullptr;
    QAction *m_actCloseArchive = nullptr;
    QAction *m_actSaveAs = nullptr;
    QAction *m_actProperties = nullptr;

    QAction *m_actAdd = nullptr;
    QAction *m_actExtract = nullptr;
    QAction *m_actCheckOut = nullptr;
    QAction *m_actDelete = nullptr;
    QAction *m_actView = nullptr;
    QAction *m_actSelectAll = nullptr;

    QAction *m_actOptions = nullptr;

    QAction *m_actFilterFiles = nullptr;
    QAction *m_actToggleFolderTree = nullptr;
    QAction *m_actClassic = nullptr;
    QAction *m_actExplorer = nullptr;
    QActionGroup *m_viewModeGroup = nullptr;
    QAction *m_actToggleView = nullptr;

    QAction *m_actFavorites = nullptr;
    QAction *m_actAddCurrentFavorite = nullptr;
    QMenu *m_favoritesMenu = nullptr;
    QToolButton *m_btnFavorites = nullptr;
    QAction *m_actSearch = nullptr;

    // Status bar labels
    QLabel *m_lblStatus = nullptr;
    QLabel *m_lblSelection = nullptr;
    QLabel *m_lblThreads = nullptr;
    QLabel *m_lblBadge = nullptr;

    CompressionEngine *m_engine = nullptr;
    UpdateManager *m_updateManager = nullptr;
    QAction *m_actCheckForUpdates = nullptr;
};
