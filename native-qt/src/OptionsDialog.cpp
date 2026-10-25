#include "OptionsDialog.h"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFormLayout>
#include <QGroupBox>
#include <QLabel>
#include <QThread>

OptionsDialog::OptionsDialog(QWidget *parent)
    : QDialog(parent) {
    setWindowTitle(tr("Options"));
    setModal(true);
    resize(420, 260);
    setupUi();
}

void OptionsDialog::setupUi() {
    auto *mainLayout = new QVBoxLayout(this);
    mainLayout->setContentsMargins(10, 10, 10, 10);
    mainLayout->setSpacing(8);

    m_tabWidget = new QTabWidget(this);

    // Tab 1: Appearance & View Controls (Combined, compact)
    auto *tabAppearance = new QWidget(this);
    auto *layoutAppearance = new QVBoxLayout(tabAppearance);
    layoutAppearance->setContentsMargins(12, 12, 12, 12);
    layoutAppearance->setSpacing(10);

    auto *formAppearance = new QFormLayout();
    formAppearance->setLabelAlignment(Qt::AlignRight | Qt::AlignVCenter);
    formAppearance->setFieldGrowthPolicy(QFormLayout::ExpandingFieldsGrow);

    m_cmbTheme = new QComboBox(tabAppearance);
    m_cmbTheme->addItems({tr("System Device Setting"), tr("Dark Mode"), tr("Light Mode")});
    formAppearance->addRow(tr("Interface Theme:"), m_cmbTheme);

    m_chkShowCheckboxes = new QCheckBox(tr("Show multi-selection checkboxes on rows"), tabAppearance);
    formAppearance->addRow(QString(), m_chkShowCheckboxes);

    layoutAppearance->addLayout(formAppearance);
    layoutAppearance->addStretch();
    m_tabWidget->addTab(tabAppearance, tr("Appearance"));

    // Tab 2: Compression & Multi-threading
    auto *tabEngine = new QWidget(this);
    auto *layoutEngine = new QVBoxLayout(tabEngine);
    layoutEngine->setContentsMargins(12, 12, 12, 12);
    layoutEngine->setSpacing(10);

    auto *formEngine = new QFormLayout();
    m_spnThreads = new QSpinBox(tabEngine);
    m_spnThreads->setRange(1, 64);
    m_spnThreads->setValue(qMax(1, QThread::idealThreadCount()));
    formEngine->addRow(tr("Worker Thread Pool:"), m_spnThreads);

    m_cmbCipher = new QComboBox(tabEngine);
    m_cmbCipher->addItems({"AES-256 (CTR)", "AES-128", "Standard Zip 2.0"});
    formEngine->addRow(tr("Default Cipher:"), m_cmbCipher);

    layoutEngine->addLayout(formEngine);
    layoutEngine->addStretch();
    m_tabWidget->addTab(tabEngine, tr("Compression"));

    mainLayout->addWidget(m_tabWidget);

    // Dialog Action Buttons
    auto *buttonLayout = new QHBoxLayout();
    buttonLayout->addStretch();

    m_btnOk = new QPushButton(tr("OK"), this);
    m_btnOk->setDefault(true);
    connect(m_btnOk, &QPushButton::clicked, this, &QDialog::accept);
    buttonLayout->addWidget(m_btnOk);

    m_btnCancel = new QPushButton(tr("Cancel"), this);
    connect(m_btnCancel, &QPushButton::clicked, this, &QDialog::reject);
    buttonLayout->addWidget(m_btnCancel);

    mainLayout->addLayout(buttonLayout);
}

bool OptionsDialog::showCheckboxes() const {
    return m_chkShowCheckboxes->isChecked();
}

QString OptionsDialog::theme() const {
    return m_cmbTheme->currentText();
}

int OptionsDialog::workerThreads() const {
    return m_spnThreads->value();
}

QString OptionsDialog::defaultCipher() const {
    return m_cmbCipher->currentText();
}
