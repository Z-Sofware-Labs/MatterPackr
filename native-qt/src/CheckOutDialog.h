#pragma once

#include <QDialog>
#include <QString>

class QLineEdit;
class QCheckBox;

class CheckOutDialog : public QDialog {
    Q_OBJECT

public:
    explicit CheckOutDialog(const QString &archiveName, int filesCount, QWidget *parent = nullptr);

    QString targetDirectory() const;
    bool createShortcuts() const;
    bool openFolderWhenDone() const;

private slots:
    void onBrowseFolder();

private:
    void setupUi();

    QString m_archiveName;
    int m_filesCount = 0;

    QLineEdit *m_txtFolder = nullptr;
    QCheckBox *m_chkShortcuts = nullptr;
    QCheckBox *m_chkOpenFolder = nullptr;
};
