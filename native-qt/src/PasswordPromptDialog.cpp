#include "PasswordPromptDialog.h"

#include <QApplication>
#include <QCheckBox>
#include <QDialogButtonBox>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QVBoxLayout>

PasswordPromptDialog::PasswordPromptDialog(const QString &title,
                                           const QString &heading,
                                           const QString &actionButtonText,
                                           QWidget *parent)
    : QDialog(parent) {
  setWindowTitle(title.isEmpty() ? tr("Enter Password") : title);
  setModal(true);
  setMinimumWidth(440);
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
      "QLineEdit {"
      " background-color: %3; color: %2; border: 1px solid %4;"
      " border-radius: 4px; padding: 6px; font-size: 13px; }"
      "QLineEdit:focus { border: 1px solid #3b82f6; }"
      "QPushButton, QDialogButtonBox QPushButton {"
      " color: %2; background-color: %5; border: 1px solid %4;"
      " border-radius: 4px; padding: 6px 16px; font-weight: bold; }"
      "QPushButton:hover, QDialogButtonBox QPushButton:hover {"
      " border-color: #3b82f6; }")
      .arg(windowColor, textColor, inputColor, borderColor, buttonColor));

  auto *layout = new QVBoxLayout(this);
  layout->setSpacing(14);
  layout->setContentsMargins(20, 20, 20, 20);

  auto *label = new QLabel(heading, this);
  label->setWordWrap(true);
  layout->addWidget(label);

  m_passwordEdit = new QLineEdit(this);
  m_passwordEdit->setEchoMode(QLineEdit::Password);
  m_passwordEdit->setPlaceholderText(tr("Password"));
  layout->addWidget(m_passwordEdit);

  m_showPasswordCheck = new QCheckBox(tr("Show password"), this);
  connect(m_showPasswordCheck, &QCheckBox::toggled, this, [this](bool checked) {
    m_passwordEdit->setEchoMode(checked ? QLineEdit::Normal : QLineEdit::Password);
  });
  layout->addWidget(m_showPasswordCheck);

  auto *buttons = new QDialogButtonBox(QDialogButtonBox::Cancel, this);
  const QString btnLabel = actionButtonText.isEmpty() ? tr("OK") : actionButtonText;
  auto *okButton = buttons->addButton(btnLabel, QDialogButtonBox::AcceptRole);
  okButton->setDefault(true);

  connect(buttons, &QDialogButtonBox::rejected, this, &QDialog::reject);
  connect(okButton, &QPushButton::clicked, this, [this]() {
    if (m_passwordEdit->text().isEmpty()) {
      m_passwordEdit->setFocus();
      return;
    }
    accept();
  });
  connect(m_passwordEdit, &QLineEdit::returnPressed, this, [this, okButton]() {
    okButton->click();
  });

  layout->addWidget(buttons);
}

QString PasswordPromptDialog::password() const {
  return m_passwordEdit ? m_passwordEdit->text() : QString();
}

