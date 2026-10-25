#pragma once

#include <QMainWindow>
#include <QTableView>
#include <QHeaderView>
#include <QToolBar>
#include <QStatusBar>
#include <QMenuBar>
#include <QLabel>
#include <QSortFilterProxyModel>
#include <QProgressBar>
#include <QStackedWidget>
#include "ArchiveModel.h"
#include "CompressionEngine.h"

class MainWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit MainWindow(QWidget *parent = nullptr);
    ~MainWindow() override;

private slots:
    void onNewArchive();
    void onOpenArchive();
    void onAddFiles();
    void onExtractFiles();
    void onEncryptArchive();
    void onTestArchive();
    void onViewFile();
    void onDeleteFiles();
    void onOptions();
    void onAbout();
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

    QString m_currentArchivePath;
    bool m_isCurrentEncrypted = false;
    QString m_currentPassword;

    ArchiveModel *m_model = nullptr;
    QSortFilterProxyModel *m_proxyModel = nullptr;
    QTableView *m_tableView = nullptr;
    QStackedWidget *m_viewStack = nullptr;
    QWidget *m_emptyWidget = nullptr;

    // Status bar labels
    QLabel *m_lblStatus = nullptr;
    QLabel *m_lblSelection = nullptr;
    QLabel *m_lblTotal = nullptr;
    QLabel *m_lblEncryption = nullptr;
    QLabel *m_lblThreads = nullptr;

    CompressionEngine *m_engine = nullptr;
};
