#pragma once

#include <QDialog>
#include <QStringList>

class QListWidget;
class QCheckBox;
class QLineEdit;
class QPushButton;

class NewArchiveDialog : public QDialog {
  Q_OBJECT

public:
  explicit NewArchiveDialog(const QString &archivePath, QWidget *parent = nullptr);

  QStringList files() const;
  void addFiles(const QStringList &files);
  QString password() const;
  QString format() const;

private:
  void chooseFiles();
  void updateEncryptionState(bool enabled);
  void updateFormatCapabilities(const QString &format);

  QString m_archivePath;
  QPushButton *m_format = nullptr;
  QString m_formatValue;
  QListWidget *m_fileList = nullptr;
  QCheckBox *m_encrypt = nullptr;
  QLineEdit *m_password = nullptr;
  QLineEdit *m_confirmPassword = nullptr;
};
