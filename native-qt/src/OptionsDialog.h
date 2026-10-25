#pragma once

#include <QDialog>
#include <QTabWidget>
#include <QCheckBox>
#include <QComboBox>
#include <QSpinBox>
#include <QPushButton>

class OptionsDialog : public QDialog {
    Q_OBJECT

public:
    explicit OptionsDialog(QWidget *parent = nullptr);

    bool showCheckboxes() const;
    QString theme() const;
    int workerThreads() const;
    QString defaultCipher() const;

private:
    void setupUi();

    QTabWidget *m_tabWidget;
    QCheckBox *m_chkShowCheckboxes;
    QComboBox *m_cmbTheme;
    QSpinBox *m_spnThreads;
    QComboBox *m_cmbCipher;
    QPushButton *m_btnOk;
    QPushButton *m_btnCancel;
};
