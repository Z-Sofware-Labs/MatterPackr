#include "FavoritesDialog.h"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QListWidget>
#include <QListWidgetItem>
#include <QPushButton>
#include <QLineEdit>
#include <QFileDialog>
#include <QDesktopServices>
#include <QUrl>
#include <QSettings>
#include <QFileInfo>
#include <QDir>
#include <QDateTime>
#include <QIcon>
#include <QFrame>
#include <QJsonDocument>
#include <QJsonArray>
#include <QJsonObject>
#include <QMessageBox>
#include <QMenu>
#include <QClipboard>
#include <QGuiApplication>
#include <QKeyEvent>

#ifdef Q_OS_WIN
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <dwmapi.h>
#endif

FavoritesDialog::FavoritesDialog(const QString &currentArchivePath, QWidget *parent)
    : QDialog(parent), m_currentArchivePath(currentArchivePath) {
    setWindowTitle(tr("Favorite Archives & Bookmarks"));
    setWindowIcon(QIcon(":/app.png"));
    setModal(true);
    resize(620, 480);
    setMinimumSize(540, 360);

    QPalette pal = palette();
    pal.setColor(QPalette::Window, QColor(0x18, 0x19, 0x20));
    pal.setColor(QPalette::Base, QColor(0x16, 0x17, 0x1c));
    pal.setColor(QPalette::WindowText, QColor(0xe5, 0xe7, 0xeb));
    setPalette(pal);
    setAutoFillBackground(true);

#ifdef Q_OS_WIN
    HWND hwnd = reinterpret_cast<HWND>(winId());
    if (hwnd) {
        BOOL darkMode = TRUE;
        if (FAILED(DwmSetWindowAttribute(hwnd, 20, &darkMode, sizeof(darkMode)))) {
            DwmSetWindowAttribute(hwnd, 19, &darkMode, sizeof(darkMode));
        }
    }
#endif

    m_favorites = loadFavoritesList();

    setupUi();
    refreshList();
}

QVector<FavoriteArchiveEntry> FavoritesDialog::loadFavoritesList() {
    QVector<FavoriteArchiveEntry> list;
    QSettings settings("MatterPackr", "MatterPackr");

    if (settings.contains("favoriteArchives")) {
        QByteArray data = settings.value("favoriteArchives").toByteArray();
        QJsonDocument doc = QJsonDocument::fromJson(data);
        if (doc.isArray()) {
            QJsonArray arr = doc.array();
            for (const auto &val : arr) {
                QJsonObject obj = val.toObject();
                FavoriteArchiveEntry entry;
                entry.name = obj.value("name").toString();
                entry.path = obj.value("path").toString();
                entry.size = obj.value("size").toString();
                entry.date = obj.value("date").toString();
                entry.count = obj.value("count").toInt();
                list.append(entry);
            }
        }
    } else {
        // Initial sample favorites matching app presets
        list = {
            {"MATTERPACKR_ASSETS.ZIP", "C:\\ARCHIVES\\MATTERPACKR_ASSETS.ZIP", "4.2 MB", "2026-04-18", 12},
            {"SYSTEM_BACKUP_2026.7Z", "C:\\ARCHIVES\\SYSTEM_BACKUP_2026.7Z", "128.4 MB", "2026-10-02", 48},
            {"ENCRYPTED_VAULT_AES256.ZIP", "C:\\SecureVault\\ENCRYPTED_VAULT_AES256.ZIP", "16.8 MB", "2026-09-15", 12},
            {"QT6_CPP_ENGINE_CORE.ZIP", "C:\\Development\\QT6_CPP_ENGINE_CORE.ZIP", "2.8 MB", "2026-10-08", 9}
        };
        saveFavoritesList(list);
    }
    return list;
}

void FavoritesDialog::saveFavoritesList(const QVector<FavoriteArchiveEntry> &favorites) {
    QSettings settings("MatterPackr", "MatterPackr");
    QJsonArray arr;
    for (const auto &item : favorites) {
        QJsonObject obj;
        obj["name"] = item.name;
        obj["path"] = item.path;
        obj["size"] = item.size;
        obj["date"] = item.date;
        obj["count"] = item.count;
        arr.append(obj);
    }
    QJsonDocument doc(arr);
    settings.setValue("favoriteArchives", doc.toJson(QJsonDocument::Compact));
}

bool FavoritesDialog::addFavoriteEntry(const FavoriteArchiveEntry &entry) {
    auto list = loadFavoritesList();
    QString cleanPath = QDir::toNativeSeparators(entry.path);

    for (const auto &item : list) {
        if (QDir::toNativeSeparators(item.path).compare(cleanPath, Qt::CaseInsensitive) == 0) {
            return false; // Already exists
        }
    }

    list.append(entry);
    saveFavoritesList(list);
    return true;
}

bool FavoritesDialog::addCurrentToFavorites(const QString &currentArchivePath, QString *outMessage) {
    if (currentArchivePath.isEmpty()) {
        if (outMessage) *outMessage = tr("No archive is currently open.");
        return false;
    }

    QString cleanPath = QDir::toNativeSeparators(currentArchivePath);
    QString name = QFileInfo(currentArchivePath).fileName();

    QFileInfo info(currentArchivePath);
    qint64 sizeBytes = info.exists() ? info.size() : 4096;
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
    entry.date = info.exists() ? info.lastModified().toString("yyyy-MM-dd")
                                : QDateTime::currentDateTime().toString("yyyy-MM-dd");
    entry.count = 0;

    if (!addFavoriteEntry(entry)) {
        if (outMessage) *outMessage = tr("Archive \"%1\" is already in Favorites.").arg(name);
        return false;
    }

    if (outMessage) *outMessage = tr("Added \"%1\" to Favorites.").arg(name);
    return true;
}

QIcon FavoritesDialog::iconForPath(const QString &path) {
    auto getCustomIcon = [](const QString &baseName) -> QIcon {
        QIcon icon(QString(":/filetypes/%1.png").arg(baseName));
        if (icon.isNull()) {
            icon = QIcon(QString(":/filetypes/%1.ico").arg(baseName));
        }
        return icon;
    };

    QString lowerPath = path.toLower();
    if (lowerPath.endsWith(".tar.gz") || lowerPath.endsWith(".tgz")) return getCustomIcon("tgz");
    if (lowerPath.endsWith(".tar.bz2") || lowerPath.endsWith(".tbz2") || lowerPath.endsWith(".tbz")) return getCustomIcon("tbz2");
    if (lowerPath.endsWith(".tar.xz") || lowerPath.endsWith(".txz")) return getCustomIcon("txz");

    QString ext = QFileInfo(path).suffix().toLower();
    if (ext == "zip" || ext == "zipx") return getCustomIcon("zip");
    if (ext == "7z") return getCustomIcon("7z");
    if (ext == "tar") return getCustomIcon("tar");
    if (ext == "gz" || ext == "gzip") return getCustomIcon("gz");
    if (ext == "bz2" || ext == "bzip2") return getCustomIcon("bz2");
    if (ext == "xz") return getCustomIcon("txz");
    if (ext == "rar") return getCustomIcon("rar");
    if (ext == "iso") return getCustomIcon("iso");
    if (ext == "cab") return getCustomIcon("cab");
    if (ext == "img" || ext == "bin") return getCustomIcon("img");
    if (ext == "cpio") return getCustomIcon("cpio");
    if (ext == "ar" || ext == "a") return getCustomIcon("ar");
    return getCustomIcon("archive");
}

void FavoritesDialog::setupUi() {
    auto *mainLayout = new QVBoxLayout(this);
    mainLayout->setContentsMargins(18, 16, 18, 16);
    mainLayout->setSpacing(10);

    // 1. Header with Icon and Top Controls
    auto *headerLayout = new QHBoxLayout();
    headerLayout->setSpacing(12);

    auto *lblIcon = new QLabel(this);
    lblIcon->setPixmap(QIcon(":/toolbar/favorites.svg").pixmap(32, 32));
    headerLayout->addWidget(lblIcon, 0, Qt::AlignTop);

    auto *textLayout = new QVBoxLayout();
    textLayout->setSpacing(2);

    auto *lblTitle = new QLabel(tr("Favorite Archives & Bookmarks"), this);
    lblTitle->setStyleSheet("font-size: 14px; font-weight: bold;");
    textLayout->addWidget(lblTitle);

    auto *lblSub = new QLabel(
        tr("Quick access index for your archives. Select an archive and press Open, or double-click to open immediately."), this);
    lblSub->setWordWrap(true);
    lblSub->setStyleSheet("color: #9ca3af; font-size: 11px;");
    textLayout->addWidget(lblSub);

    headerLayout->addLayout(textLayout, 1);
    mainLayout->addLayout(headerLayout);

    // 2. Search Filter and Quick Add Bar
    auto *filterBarLayout = new QHBoxLayout();
    filterBarLayout->setSpacing(8);

    m_searchEdit = new QLineEdit(this);
    m_searchEdit->setPlaceholderText(tr("Search favorites by name or path..."));
    m_searchEdit->setClearButtonEnabled(true);
    m_searchEdit->setStyleSheet("QLineEdit { padding: 5px 8px; border-radius: 6px; }");
    connect(m_searchEdit, &QLineEdit::textChanged, this, &FavoritesDialog::onFilterChanged);
    filterBarLayout->addWidget(m_searchEdit, 1);

    m_btnAddCurrent = new QPushButton(tr("⭐ Add Current"), this);
    m_btnAddCurrent->setToolTip(tr("Bookmark the currently open archive"));
    m_btnAddCurrent->setEnabled(!m_currentArchivePath.isEmpty());
    connect(m_btnAddCurrent, &QPushButton::clicked, this, &FavoritesDialog::onAddCurrent);
    filterBarLayout->addWidget(m_btnAddCurrent);

    m_btnAddOther = new QPushButton(tr("＋ Add from Disk..."), this);
    m_btnAddOther->setToolTip(tr("Browse for an archive file on disk to bookmark"));
    connect(m_btnAddOther, &QPushButton::clicked, this, &FavoritesDialog::onAddFromDisk);
    filterBarLayout->addWidget(m_btnAddOther);

    mainLayout->addLayout(filterBarLayout);

    // 3. Card-based List of Favorites
    m_list = new QListWidget(this);
    m_list->setSpacing(4);
    m_list->setSelectionMode(QAbstractItemView::SingleSelection);
    m_list->setContextMenuPolicy(Qt::CustomContextMenu);
    m_list->setStyleSheet(
        "QListWidget {"
        "  border: 1px solid palette(mid);"
        "  border-radius: 8px;"
        "  padding: 4px;"
        "}"
        "QListWidget::item {"
        "  border-radius: 6px;"
        "  margin: 1px 2px;"
        "}"
        "QListWidget::item:hover {"
        "  background: rgba(59, 130, 246, 0.12);"
        "}"
        "QListWidget::item:selected {"
        "  background: rgba(59, 130, 246, 0.28);"
        "  border: 1px solid #3b82f6;"
        "}"
    );

    connect(m_list, &QListWidget::itemDoubleClicked, this, [this](QListWidgetItem *) {
        onOpenSelected();
    });
    connect(m_list, &QListWidget::itemSelectionChanged, this, &FavoritesDialog::onSelectionChanged);
    connect(m_list, &QListWidget::customContextMenuRequested, this, &FavoritesDialog::onCustomContextMenuRequested);

    mainLayout->addWidget(m_list, 1);

    // 4. Status Bar
    m_lblStatus = new QLabel(this);
    m_lblStatus->setStyleSheet("color: #9ca3af; font-size: 11px;");
    mainLayout->addWidget(m_lblStatus);

    // 5. Action Buttons Bar
    auto *btnLayout = new QHBoxLayout();
    btnLayout->setSpacing(8);

    m_btnRemove = new QPushButton(tr("Remove"), this);
    m_btnRemove->setToolTip(tr("Remove selected archive from Favorites (Delete)"));
    m_btnRemove->setEnabled(false);
    connect(m_btnRemove, &QPushButton::clicked, this, &FavoritesDialog::onRemoveSelected);
    btnLayout->addWidget(m_btnRemove);

    m_btnExplore = new QPushButton(tr("Open Folder"), this);
    m_btnExplore->setToolTip(tr("Show archive in File Explorer"));
    m_btnExplore->setEnabled(false);
    connect(m_btnExplore, &QPushButton::clicked, this, &FavoritesDialog::onExploreFolder);
    btnLayout->addWidget(m_btnExplore);

    btnLayout->addStretch(1);

    auto *btnClose = new QPushButton(tr("Cancel"), this);
    connect(btnClose, &QPushButton::clicked, this, &QDialog::reject);
    btnLayout->addWidget(btnClose);

    m_btnOpen = new QPushButton(tr("Open Archive"), this);
    m_btnOpen->setObjectName("btnPrimary");
    m_btnOpen->setDefault(true);
    m_btnOpen->setEnabled(false);
    connect(m_btnOpen, &QPushButton::clicked, this, &FavoritesDialog::onOpenSelected);
    btnLayout->addWidget(m_btnOpen);

    mainLayout->addLayout(btnLayout);
}

QWidget *FavoritesDialog::createCardWidget(const FavoriteArchiveEntry &entry) {
    auto *card = new QWidget(m_list);
    card->setStyleSheet("QWidget { background: transparent; } QLabel { background: transparent; }");

    auto *hLayout = new QHBoxLayout(card);
    hLayout->setContentsMargins(10, 6, 12, 6);
    hLayout->setSpacing(12);

    // Archive icon (32x32)
    auto *iconLbl = new QLabel(card);
    iconLbl->setPixmap(iconForPath(entry.name.isEmpty() ? entry.path : entry.name).pixmap(30, 30));
    iconLbl->setFixedSize(30, 30);
    hLayout->addWidget(iconLbl, 0, Qt::AlignVCenter);

    // Name + Path
    auto *vLayout = new QVBoxLayout();
    vLayout->setSpacing(2);
    vLayout->setContentsMargins(0, 0, 0, 0);

    auto *titleLbl = new QLabel(entry.name, card);
    titleLbl->setStyleSheet("font-size: 12px; font-weight: bold;");
    vLayout->addWidget(titleLbl);

    auto *pathLbl = new QLabel(entry.path, card);
    pathLbl->setStyleSheet("font-size: 10.5px; color: #9ca3af; font-family: monospace;");
    vLayout->addWidget(pathLbl);

    hLayout->addLayout(vLayout, 1);

    // Right-side badges: Size & Item Count / Date
    auto *badgeLayout = new QVBoxLayout();
    badgeLayout->setSpacing(2);
    badgeLayout->setContentsMargins(0, 0, 0, 0);
    badgeLayout->setAlignment(Qt::AlignRight | Qt::AlignVCenter);

    auto *sizeLbl = new QLabel(entry.size, card);
    sizeLbl->setAlignment(Qt::AlignRight);
    sizeLbl->setStyleSheet("font-size: 11px; font-weight: 600; color: #9ca3af;");
    badgeLayout->addWidget(sizeLbl);

    QString subBadge = entry.count > 0 ? tr("%1 files").arg(entry.count) : entry.date;
    auto *countLbl = new QLabel(subBadge, card);
    countLbl->setAlignment(Qt::AlignRight);
    countLbl->setStyleSheet("font-size: 10px; color: #10b981; font-weight: 600;");
    badgeLayout->addWidget(countLbl);

    hLayout->addLayout(badgeLayout);
    return card;
}

void FavoritesDialog::refreshList(const QString &filter) {
    m_list->clear();

    int visibleCount = 0;
    for (const auto &fav : m_favorites) {
        if (!filter.isEmpty()) {
            bool matches = fav.name.contains(filter, Qt::CaseInsensitive) ||
                           fav.path.contains(filter, Qt::CaseInsensitive);
            if (!matches) continue;
        }

        auto *item = new QListWidgetItem();
        item->setSizeHint(QSize(0, 50));
        item->setData(Qt::UserRole, fav.path);
        item->setData(Qt::UserRole + 1, fav.name);

        m_list->addItem(item);
        m_list->setItemWidget(item, createCardWidget(fav));
        visibleCount++;
    }

    if (m_favorites.isEmpty()) {
        m_lblStatus->setText(tr("No favorite archives bookmarked."));
    } else if (!filter.isEmpty()) {
        m_lblStatus->setText(tr("Showing %1 of %2 favorite archives").arg(visibleCount).arg(m_favorites.size()));
    } else {
        m_lblStatus->setText(tr("Total: %1 bookmarked archive(s)").arg(m_favorites.size()));
    }

    onSelectionChanged();
}

void FavoritesDialog::onFilterChanged(const QString &text) {
    refreshList(text.trimmed());
}

void FavoritesDialog::onSelectionChanged() {
    auto *item = m_list->currentItem();
    bool hasSel = (item != nullptr);
    m_btnOpen->setEnabled(hasSel);
    m_btnRemove->setEnabled(hasSel);
    m_btnExplore->setEnabled(hasSel);
}

void FavoritesDialog::onOpenSelected() {
    auto *item = m_list->currentItem();
    if (!item) return;

    m_selectedPath = item->data(Qt::UserRole).toString();
    accept();
}

void FavoritesDialog::onAddCurrent() {
    QString msg;
    if (!addCurrentToFavorites(m_currentArchivePath, &msg)) {
        QMessageBox::information(this, tr("Favorites"), msg);
        return;
    }

    m_favorites = loadFavoritesList();
    refreshList(m_searchEdit->text());

    // Highlight newly added item
    for (int i = 0; i < m_list->count(); ++i) {
        if (m_list->item(i)->data(Qt::UserRole).toString() == QDir::toNativeSeparators(m_currentArchivePath)) {
            m_list->setCurrentRow(i);
            break;
        }
    }
}

void FavoritesDialog::onAddFromDisk() {
    QString filename = QFileDialog::getOpenFileName(
        this, tr("Add Archive to Favorites"), QString(),
        tr("Supported Archives (*.zip *.7z *.tar *.tar.gz *.tgz *.gz *.tar.bz2 "
           "*.tbz2 *.tar.xz *.txz *.rar *.iso *.cab *.img *.cpio *.ar);;All Files (*.*)"));
    if (filename.isEmpty()) return;

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

    if (!addFavoriteEntry(entry)) {
        QMessageBox::information(this, tr("Favorites"),
                                 tr("The archive <b>%1</b> is already in your Favorites.").arg(name));
        return;
    }

    m_favorites = loadFavoritesList();
    refreshList(m_searchEdit->text());

    for (int i = 0; i < m_list->count(); ++i) {
        if (m_list->item(i)->data(Qt::UserRole).toString() == cleanPath) {
            m_list->setCurrentRow(i);
            break;
        }
    }
}

void FavoritesDialog::onRemoveSelected() {
    auto *item = m_list->currentItem();
    if (!item) return;

    QString targetPath = item->data(Qt::UserRole).toString();
    for (int i = 0; i < m_favorites.size(); ++i) {
        if (m_favorites[i].path == targetPath) {
            m_favorites.removeAt(i);
            break;
        }
    }

    saveFavoritesList(m_favorites);
    refreshList(m_searchEdit->text());
}

void FavoritesDialog::onExploreFolder() {
    auto *item = m_list->currentItem();
    if (!item) return;

    QString path = item->data(Qt::UserRole).toString();
    QString folderPath = QFileInfo(path).absolutePath();
    QDesktopServices::openUrl(QUrl::fromLocalFile(folderPath));
}

void FavoritesDialog::onCopyPath() {
    auto *item = m_list->currentItem();
    if (!item) return;
    QString path = item->data(Qt::UserRole).toString();
    QGuiApplication::clipboard()->setText(path);
}

void FavoritesDialog::onCustomContextMenuRequested(const QPoint &pos) {
    auto *item = m_list->itemAt(pos);
    if (!item) return;

    QMenu menu(this);
    auto *actOpen = menu.addAction(tr("Open Archive"), this, &FavoritesDialog::onOpenSelected);
    actOpen->setIcon(QIcon(":/toolbar/open.svg"));

    auto *actExplore = menu.addAction(tr("Show in File Explorer"), this, &FavoritesDialog::onExploreFolder);
    auto *actCopy = menu.addAction(tr("Copy Path"), this, &FavoritesDialog::onCopyPath);
    menu.addSeparator();
    auto *actRemove = menu.addAction(tr("Remove from Favorites"), this, &FavoritesDialog::onRemoveSelected);

    menu.exec(m_list->viewport()->mapToGlobal(pos));
}

void FavoritesDialog::keyPressEvent(QKeyEvent *event) {
    if (event->key() == Qt::Key_Return || event->key() == Qt::Key_Enter) {
        if (m_list->currentItem()) {
            onOpenSelected();
            return;
        }
    } else if (event->key() == Qt::Key_Delete) {
        if (m_list->currentItem()) {
            onRemoveSelected();
            return;
        }
    }
    QDialog::keyPressEvent(event);
}

QString FavoritesDialog::selectedArchivePath() const {
    return m_selectedPath;
}
