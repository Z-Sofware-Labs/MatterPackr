#pragma once

#include <QObject>
#include <QString>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QProgressDialog>
#include <QWidget>

class UpdateManager : public QObject {
    Q_OBJECT

public:
    explicit UpdateManager(QWidget *parent = nullptr);

    // Initiates manual check for updates
    void checkForUpdates();

private slots:
    void onReleaseInfoFetched();
    void onDownloadProgress(qint64 bytesReceived, qint64 bytesTotal);
    void onDownloadFinished();

private:
    void promptAndUpdate(const QString &latestVersion, const QString &notes, const QString &downloadUrl, const QString &fileName);
    void launchInstallerAndExit(const QString &installerPath);
    bool isNewerVersion(const QString &remoteVersion, const QString &localVersion);

    QWidget *m_parent = nullptr;
    QNetworkAccessManager *m_network = nullptr;
    QNetworkReply *m_currentReply = nullptr;
    QProgressDialog *m_progressDialog = nullptr;
    QProgressDialog *m_checkingDialog = nullptr;
    QString m_downloadTargetFile;
};
