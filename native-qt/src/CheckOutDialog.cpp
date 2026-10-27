#include "CheckOutDialog.h"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QCheckBox>
#include <QFileDialog>
#include <QStandardPaths>
#include <QDir>
#include <QIcon>
#include <QFileInfo>
#include <QFrame>

CheckOutDialog::CheckOutDialog(const QString &archiveName, int filesCount, QWidget *parent)
    : QDialog(parent), m_archiveName(archiveName), m_filesCount(filesCount) {
    setWindowTitle(tr("CheckOut Archive"));
    setWindowIcon(QIcon(":/app.ico"));
    setModal(true);
    setMinimumWidth(480);
    setupUi();
}

void CheckOutDialog::setupUi() {
    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(18, 16, 18, 16);
    layout->setSpacing(12);

    // 1. Header with Icon and Explanatory Text
    auto *headerLayout = new QHBoxLayout();
    headerLayout->setSpacing(12);

    auto *lblIcon = new QLabel(this);
    lblIcon->setPixmap(QIcon(":/toolbar/checkout.svg").pixmap(32, 32));
    headerLayout->addWidget(lblIcon, 0, Qt::AlignTop);

    auto *descLayout = new QVBoxLayout();
    descLayout->setSpacing(4);

    auto *lblTitle = new QLabel(tr("MatterPackr CheckOut"), this);
    lblTitle->setStyleSheet("font-size: 13px; font-weight: 700;");
    descLayout->addWidget(lblTitle);

    QString cleanName = m_archiveName.isEmpty() ? tr("current archive") : QFileInfo(m_archiveName).fileName();
    auto *lblInfo = new QLabel(
        tr("CheckOut temporarily unpacks <b>%1 file(s)</b> from <b>%2</b> to a designated "
           "temporary working directory for inspection and testing without organizing or cluttering your hard drive.<br>"
           "When you close the archive or exit MatterPackr, you will be prompted to clean up and delete the temporary files.")
            .arg(m_filesCount)
            .arg(cleanName),
        this);
    lblInfo->setWordWrap(true);
    lblInfo->setStyleSheet("color: #9ca3af; font-size: 11px; line-height: 1.4;");
    descLayout->addWidget(lblInfo);

    headerLayout->addLayout(descLayout, 1);
    layout->addLayout(headerLayout);

    // Separator line
    auto *sep = new QFrame(this);
    sep->setFrameShape(QFrame::HLine);
    sep->setFrameShadow(QFrame::Sunken);
    sep->setStyleSheet("background-color: #2b2d38;");
    layout->addWidget(sep);

    // 2. Target Directory Selection
    auto *lblPathTitle = new QLabel(tr("Temporary Working Directory:"), this);
    lblPathTitle->setStyleSheet("font-weight: 600; font-size: 11px;");
    layout->addWidget(lblPathTitle);

    auto *pathLayout = new QHBoxLayout();
    pathLayout->setSpacing(8);

    QString subName = m_archiveName.isEmpty() ? "NEW_ARCHIVE" : QFileInfo(m_archiveName).completeBaseName();
    QString defaultDir = QDir::toNativeSeparators(QDir::tempPath() + "/MatterPackr_CheckOut/" + subName);

    m_txtFolder = new QLineEdit(defaultDir, this);
    m_txtFolder->setStyleSheet("font-size: 11px; padding: 4px 8px;");
    pathLayout->addWidget(m_txtFolder, 1);

    auto *btnBrowse = new QPushButton(tr("Browse..."), this);
    btnBrowse->setStyleSheet("padding: 4px 12px; font-size: 11px; min-height: 22px;");
    connect(btnBrowse, &QPushButton::clicked, this, &CheckOutDialog::onBrowseFolder);
    pathLayout->addWidget(btnBrowse);

    layout->addLayout(pathLayout);

    // 3. Options Checkboxes
    m_chkShortcuts = new QCheckBox(
        tr("Create quick-access shortcuts on Desktop for executables and documents"), this);
    m_chkShortcuts->setChecked(true);
    m_chkShortcuts->setCursor(Qt::PointingHandCursor);
    layout->addWidget(m_chkShortcuts);

    m_chkOpenFolder = new QCheckBox(
        tr("Open destination folder in File Explorer when done"), this);
    m_chkOpenFolder->setChecked(true);
    m_chkOpenFolder->setCursor(Qt::PointingHandCursor);
    layout->addWidget(m_chkOpenFolder);

    layout->addSpacing(6);

    // 4. Action Buttons
    auto *buttonLayout = new QHBoxLayout();
    buttonLayout->addStretch();

    auto *btnCancel = new QPushButton(tr("Cancel"), this);
    connect(btnCancel, &QPushButton::clicked, this, &QDialog::reject);
    buttonLayout->addWidget(btnCancel);

    auto *btnCheckOut = new QPushButton(tr("CheckOut"), this);
    btnCheckOut->setObjectName("btnPrimary");
    btnCheckOut->setDefault(true);
    connect(btnCheckOut, &QPushButton::clicked, this, &QDialog::accept);
    buttonLayout->addWidget(btnCheckOut);

    layout->addLayout(buttonLayout);
}

void CheckOutDialog::onBrowseFolder() {
    QString dir = QFileDialog::getExistingDirectory(
        this, tr("Select CheckOut Temporary Directory"), m_txtFolder->text());
    if (!dir.isEmpty()) {
        m_txtFolder->setText(QDir::toNativeSeparators(dir));
    }
}

QString CheckOutDialog::targetDirectory() const {
    return m_txtFolder->text().trimmed();
}

bool CheckOutDialog::createShortcuts() const {
    return m_chkShortcuts->isChecked();
}

bool CheckOutDialog::openFolderWhenDone() const {
    return m_chkOpenFolder->isChecked();
}
