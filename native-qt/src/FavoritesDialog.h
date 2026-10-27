#pragma once

#include <QDialog>
#include <QString>
#include <QVector>
#include <QIcon>
#include <QPoint>

class QListWidget;
class QListWidgetItem;
class QPushButton;
class QLabel;
class QLineEdit;
class QKeyEvent;

struct FavoriteArchiveEntry {
    QString name;
    QString path;
    QString size;
    QString date;
    int count = 0;
};

class FavoritesDialog : public QDialog {
    Q_OBJECT

public:
    explicit FavoritesDialog(const QString &currentArchivePath, QWidget *parent = nullptr);

    QString selectedArchivePath() const;

    // Static backend helpers for seamless app-wide favorites access
    static QVector<FavoriteArchiveEntry> loadFavoritesList();
    static void saveFavoritesList(const QVector<FavoriteArchiveEntry> &favorites);
    static bool addFavoriteEntry(const FavoriteArchiveEntry &entry);
    static bool addCurrentToFavorites(const QString &currentArchivePath, QString *outMessage = nullptr);
    static QIcon iconForPath(const QString &path);

protected:
    void keyPressEvent(QKeyEvent *event) override;

private slots:
    void onOpenSelected();
    void onAddCurrent();
    void onAddFromDisk();
    void onRemoveSelected();
    void onExploreFolder();
    void onCopyPath();
    void onFilterChanged(const QString &text);
    void onSelectionChanged();
    void onCustomContextMenuRequested(const QPoint &pos);

private:
    void setupUi();
    void refreshList(const QString &filter = QString());
    QWidget *createCardWidget(const FavoriteArchiveEntry &entry);

    QString m_currentArchivePath;
    QString m_selectedPath;
    QVector<FavoriteArchiveEntry> m_favorites;

    QLineEdit *m_searchEdit = nullptr;
    QListWidget *m_list = nullptr;
    QPushButton *m_btnOpen = nullptr;
    QPushButton *m_btnAddCurrent = nullptr;
    QPushButton *m_btnAddOther = nullptr;
    QPushButton *m_btnRemove = nullptr;
    QPushButton *m_btnExplore = nullptr;
    QLabel *m_lblStatus = nullptr;
};
