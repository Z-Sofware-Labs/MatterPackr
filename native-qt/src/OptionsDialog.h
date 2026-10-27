#pragma once

#include <QDialog>
#include <QTabWidget>
#include <QCheckBox>
#include <QRadioButton>
#include <QButtonGroup>
#include <QPushButton>
#include <QLabel>
#include <QStringList>
#include <QVector>

struct SupportedFileType {
    QString id;
    QString ext;
    QString shortLabel;
    QString name;
    QString category; // "read_write" or "read_only"
    QString specs;
    QString iconPath;
    QCheckBox *checkBox = nullptr;
};

class OptionsDialog : public QDialog {
    Q_OBJECT

public:
    explicit OptionsDialog(QWidget *parent = nullptr);

    // Getters for configuration
    QStringList selectedAssociations() const;
    bool showCheckboxes() const;
    QString themeMode() const; // "device", "light", "dark"

    // Set active tab (0: File Formats, 1: Appearance)
    void setCurrentTab(int index);

    // Cross-platform Shell File Association Handler (Windows, macOS, Linux)
    static void registerFileAssociations(const QStringList &extensions);

signals:
    void settingsApplied();

private slots:
    void onSelectAll();
    void onSelectReadWrite();
    void onSelectReadOnly();
    void onClearAll();
    void updateAssociationCount();
    void onApply();
    void onOk();

private:
    void setupUi();
    void initFileTypes();
    void loadSettings();
    void saveSettings();

    QTabWidget *m_tabWidget;
    QLabel *m_lblCount;

    QVector<SupportedFileType> m_fileTypes;

    // Appearance tab
    QCheckBox *m_chkShowCheckboxes;
    QButtonGroup *m_themeGroup;
    QRadioButton *m_radDeviceTheme;
    QRadioButton *m_radLightTheme;
    QRadioButton *m_radDarkTheme;

    // Bottom action buttons
    QPushButton *m_btnOk;
    QPushButton *m_btnCancel;
    QPushButton *m_btnApply;
};
