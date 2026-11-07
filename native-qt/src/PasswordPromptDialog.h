#pragma once

#include <QDialog>
#include <QString>

class QLineEdit;
class QCheckBox;

class PasswordPromptDialog : public QDialog {
  Q_OBJECT

public:
  explicit PasswordPromptDialog(const QString &title,
                                const QString &heading,
                                const QString &actionButtonText = QString(),
                                QWidget *parent = nullptr);
  ~PasswordPromptDialog() override = default;

  QString password() const;

private:
  QLineEdit *m_passwordEdit = nullptr;
  QCheckBox *m_showPasswordCheck = nullptr;
};

