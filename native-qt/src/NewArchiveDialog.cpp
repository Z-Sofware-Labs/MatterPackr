#include "NewArchiveDialog.h"

#include <QCheckBox>
#include <QColor>
#include <QDialogButtonBox>
#include <QApplication>
#include <QFileDialog>
#include <QFileInfo>
#include <QLabel>
#include <QLineEdit>
#include <QListWidget>
#include <QPushButton>
#include <QMenu>
#include <QVBoxLayout>

NewArchiveDialog::NewArchiveDialog(const QString &archivePath, QWidget *parent)
    : QDialog(parent), m_archivePath(archivePath) {
  setWindowTitle(tr("Set Up New Archive"));
  setModal(true);
  setMinimumSize(520, 430);
  setWindowFlags(windowFlags() | Qt::WindowMinimizeButtonHint
                 | Qt::WindowMaximizeButtonHint);
  setAutoFillBackground(true);
  const bool lightMode =
      qApp->property("matterpackrTheme").toString() == QStringLiteral("light");
  const QString windowColor = lightMode ? QStringLiteral("#f8fafc")
                                        : QStringLiteral("#181920");
  const QString textColor = lightMode ? QStringLiteral("#1e293b")
                                      : QStringLiteral("#e5e7eb");
  const QString inputColor = lightMode ? QStringLiteral("#ffffff")
                                       : QStringLiteral("#2c2f3d");
  const QString borderColor = lightMode ? QStringLiteral("#94a3b8")
                                        : QStringLiteral("#4b516b");
  const QString buttonColor = lightMode ? QStringLiteral("#e2e8f0")
                                        : QStringLiteral("#313444");
  setStyleSheet(QStringLiteral(
      "QDialog { background-color: %1; color: %2; }"
      "QLabel, QCheckBox { color: %2; }"
      "QLineEdit, QListWidget, QPushButton {"
      " background-color: %3; color: %2; border: 1px solid %4;"
      " border-radius: 4px; padding: 4px; }"
      "QLineEdit:disabled, QPushButton:disabled {"
      " background-color: %1; color: %4; }"
      "QCheckBox:disabled { color: %4; }"
      "QPushButton, QDialogButtonBox QPushButton {"
      " color: %2; background-color: %5; border: 1px solid %4;"
      " border-radius: 4px; padding: 5px 12px; }")
      .arg(windowColor, textColor, inputColor, borderColor, buttonColor));

  auto *layout = new QVBoxLayout(this);
  auto *heading = new QLabel(
      tr("<b>%1</b><br>Select files to add now and optionally protect the archive with a password.")
          .arg(QFileInfo(archivePath).fileName()), this);
  heading->setWordWrap(true);
  layout->addWidget(heading);

  auto *formatLabel = new QLabel(tr("Archive format:"), this);
  layout->addWidget(formatLabel);
  m_format = new QPushButton(this);
  m_format->setFixedHeight(32);
  m_format->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Fixed);
  auto *formatMenu = new QMenu(m_format);
  const auto addFormat = [this, formatMenu](const QString &label,
                                             const QString &value) {
    auto *action = formatMenu->addAction(label);
    action->setData(value);
    connect(action, &QAction::triggered, this, [this, action]() {
      m_formatValue = action->data().toString();
      m_format->setText(action->text());
      updateFormatCapabilities(m_formatValue);
    });
  };
  addFormat(tr("7Z archive (.7z)"), QStringLiteral("7z"));
  addFormat(tr("ZIP archive (.zip)"), QStringLiteral("zip"));
  addFormat(tr("TAR archive (.tar) — no encryption"), QStringLiteral("tar"));
  addFormat(tr("GZipped TAR archive (.tar.gz) — no encryption"),
            QStringLiteral("tar.gz"));
  connect(formatMenu, &QMenu::aboutToShow, this, [this, formatMenu]() {
    formatMenu->setFixedWidth(m_format->width());
  });
  m_formatValue = archivePath.endsWith(QStringLiteral(".zip"), Qt::CaseInsensitive)
      ? QStringLiteral("zip")
      : QStringLiteral("7z");
  m_format->setText(m_formatValue == QStringLiteral("zip")
                        ? tr("ZIP archive (.zip)")
                        : tr("7Z archive (.7z)"));
  m_format->setMenu(formatMenu);
  layout->addWidget(m_format);

  auto *filesLabel = new QLabel(tr("Files to add:"), this);
  layout->addWidget(filesLabel);
  m_fileList = new QListWidget(this);
  m_fileList->setSelectionMode(QAbstractItemView::ExtendedSelection);
  layout->addWidget(m_fileList, 1);

  auto *chooseButton = new QPushButton(tr("Add Files..."), this);
  connect(chooseButton, &QPushButton::clicked, this, &NewArchiveDialog::chooseFiles);
  layout->addWidget(chooseButton, 0, Qt::AlignLeft);

  m_encrypt = new QCheckBox(tr("Encrypt archive with a password"), this);
  m_encrypt->setToolTip(tr("Uses AES encryption. 7Z also encrypts file names."));
  connect(m_encrypt, &QCheckBox::toggled, this, &NewArchiveDialog::updateEncryptionState);
  layout->addWidget(m_encrypt);

  m_password = new QLineEdit(this);
  m_password->setPlaceholderText(tr("Password"));
  m_password->setEchoMode(QLineEdit::Password);
  m_password->setEnabled(false);
  layout->addWidget(m_password);
  m_confirmPassword = new QLineEdit(this);
  m_confirmPassword->setPlaceholderText(tr("Confirm password"));
  m_confirmPassword->setEchoMode(QLineEdit::Password);
  m_confirmPassword->setEnabled(false);
  layout->addWidget(m_confirmPassword);
  updateFormatCapabilities(m_formatValue);

  auto *buttons = new QDialogButtonBox(QDialogButtonBox::Cancel, this);
  auto *createButton = buttons->addButton(tr("Create Archive"), QDialogButtonBox::AcceptRole);
  createButton->setDefault(true);
  connect(buttons, &QDialogButtonBox::rejected, this, &QDialog::reject);
  connect(createButton, &QPushButton::clicked, this, [this]() {
    if (m_encrypt->isChecked()) {
      if (m_password->text().isEmpty()) {
        m_password->setFocus();
        return;
      }
      if (m_password->text() != m_confirmPassword->text()) {
        m_confirmPassword->setFocus();
        return;
      }
    }
    accept();
  });
  layout->addWidget(buttons);
}

void NewArchiveDialog::chooseFiles() {
  const QStringList selected = QFileDialog::getOpenFileNames(
      this, tr("Select Files to Add"), QString(), tr("All Files (*.*)"));
  for (const QString &file : selected) {
    if (m_fileList->findItems(file, Qt::MatchExactly).isEmpty())
      m_fileList->addItem(file);
  }
}

void NewArchiveDialog::updateEncryptionState(bool enabled) {
  m_password->setEnabled(enabled);
  m_confirmPassword->setEnabled(enabled);
}

void NewArchiveDialog::updateFormatCapabilities(const QString &format) {
  const bool supportsEncryption = format == QStringLiteral("7z")
      || format == QStringLiteral("zip");
  m_encrypt->setEnabled(supportsEncryption);
  if (!supportsEncryption) {
    m_encrypt->setChecked(false);
    m_password->clear();
    m_confirmPassword->clear();
  }
  m_encrypt->setToolTip(
      supportsEncryption
          ? tr("Uses AES encryption. 7Z also encrypts file names.")
          : tr("TAR archives do not support password encryption."));
}

QStringList NewArchiveDialog::files() const {
  QStringList result;
  for (int i = 0; i < m_fileList->count(); ++i)
    result.append(m_fileList->item(i)->text());
  return result;
}

QString NewArchiveDialog::password() const {
  return m_encrypt->isChecked() ? m_password->text() : QString();
}

QString NewArchiveDialog::format() const {
  return m_formatValue;
}
