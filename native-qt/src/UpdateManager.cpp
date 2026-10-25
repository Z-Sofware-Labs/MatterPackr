#include "UpdateManager.h"
#include <QMessageBox>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QStandardPaths>
#include <QDir>
#include <QFile>
#include <QApplication>
#include <QProcess>
#include <QDesktopServices>
#include <QUrl>

#ifdef Q_OS_WIN
#include <windows.h>
#include <shellapi.h>
#endif

UpdateManager::UpdateManager(QWidget *parent)
    : QObject(parent)
    , m_parent(parent)
    , m_network(new QNetworkAccessManager(this)) {}

void UpdateManager::checkForUpdates() {
    QUrl url("https://api.github.com/repos/Z-Sofware-Labs/MatterPackr/releases/latest");
    QNetworkRequest request(url);
    request.setHeader(QNetworkRequest::UserAgentHeader, "MatterPackr-Qt6-Client");
    request.setRawHeader("Accept", "application/vnd.github.v3+json");

    if (m_currentReply) {
        m_currentReply->abort();
        m_currentReply->deleteLater();
    }

    m_currentReply = m_network->get(request);
    connect(m_currentReply, &QNetworkReply::finished, this, &UpdateManager::onReleaseInfoFetched);
}

bool UpdateManager::isNewerVersion(const QString &remoteVersion, const QString &localVersion) {
    auto cleanRemote = remoteVersion.trimmed();
    if (cleanRemote.startsWith('v', Qt::CaseInsensitive)) {
        cleanRemote.remove(0, 1);
    }
    auto cleanLocal = localVersion.trimmed();
    if (cleanLocal.startsWith('v', Qt::CaseInsensitive)) {
        cleanLocal.remove(0, 1);
    }

    auto parseParts = [](const QString &v) -> QVector<int> {
        QVector<int> parts;
        for (const auto &p : v.split('.')) {
            parts.append(p.toInt());
        }
        while (parts.size() < 3) parts.append(0);
        return parts;
    };

    auto rParts = parseParts(cleanRemote);
    auto lParts = parseParts(cleanLocal);

    for (int i = 0; i < 3; ++i) {
        if (rParts[i] > lParts[i]) return true;
        if (rParts[i] < lParts[i]) return false;
    }
    return false;
}

void UpdateManager::onReleaseInfoFetched() {
    if (!m_currentReply) return;

    if (m_currentReply->error() != QNetworkReply::NoError) {
        QMessageBox::warning(m_parent, tr("Check for Updates"),
                             tr("Unable to check for updates.\nError: %1").arg(m_currentReply->errorString()));
        m_currentReply->deleteLater();
        m_currentReply = nullptr;
        return;
    }

    QByteArray data = m_currentReply->readAll();
    m_currentReply->deleteLater();
    m_currentReply = nullptr;

    QJsonDocument doc = QJsonDocument::fromJson(data);
    if (!doc.isObject()) {
        QMessageBox::warning(m_parent, tr("Check for Updates"), tr("Invalid response received from update server."));
        return;
    }

    QJsonObject release = doc.object();
    QString tagName = release.value("tag_name").toString();
    QString body = release.value("body").toString();
    QJsonArray assets = release.value("assets").toArray();

    QString currentVersion = qApp->applicationVersion();
    if (!isNewerVersion(tagName, currentVersion)) {
        QMessageBox::information(m_parent, tr("Check for Updates"),
                                 tr("MatterPackr is up to date!\n\nCurrent version: %1\nLatest version: %2")
                                 .arg(currentVersion, tagName));
        return;
    }

    // Match platform asset
    QString targetAssetUrl;
    QString targetFileName;

#if defined(Q_OS_WIN)
    for (const auto &val : assets) {
        QJsonObject asset = val.toObject();
        QString name = asset.value("name").toString();
        if (name.endsWith("-Setup.exe", Qt::CaseInsensitive) || name.endsWith(".exe", Qt::CaseInsensitive)) {
            targetAssetUrl = asset.value("browser_download_url").toString();
            targetFileName = name;
            break;
        }
    }
#elif defined(Q_OS_MACOS)
    for (const auto &val : assets) {
        QJsonObject asset = val.toObject();
        QString name = asset.value("name").toString();
        if (name.contains("macos", Qt::CaseInsensitive) && name.endsWith(".zip", Qt::CaseInsensitive)) {
            targetAssetUrl = asset.value("browser_download_url").toString();
            targetFileName = name;
            break;
        }
    }
#else
    for (const auto &val : assets) {
        QJsonObject asset = val.toObject();
        QString name = asset.value("name").toString();
        if (name.contains("linux", Qt::CaseInsensitive) && (name.endsWith(".tar.gz", Qt::CaseInsensitive) || name.endsWith(".deb", Qt::CaseInsensitive))) {
            targetAssetUrl = asset.value("browser_download_url").toString();
            targetFileName = name;
            break;
        }
    }
#endif

    if (targetAssetUrl.isEmpty()) {
        QMessageBox::information(m_parent, tr("Update Available"),
                                 tr("A newer version (%1) is available, but no matching package was found for your OS.\nVisit GitHub to download.")
                                 .arg(tagName));
        return;
    }

    promptAndUpdate(tagName, body, targetAssetUrl, targetFileName);
}

void UpdateManager::promptAndUpdate(const QString &latestVersion, const QString &notes, const QString &downloadUrl, const QString &fileName) {
    auto reply = QMessageBox::question(
        m_parent,
        tr("Update Available"),
        tr("A new version of MatterPackr is available!\n\n"
           "Current version: %1\n"
           "Latest version: %2\n\n"
           "Release Notes:\n%3\n\n"
           "Would you like to download and install this update now?")
        .arg(qApp->applicationVersion(), latestVersion, notes.left(300)),
        QMessageBox::Yes | QMessageBox::No,
        QMessageBox::Yes
    );

    if (reply != QMessageBox::Yes) {
        return;
    }

    QString tempDir = QStandardPaths::writableLocation(QStandardPaths::TempLocation);
    m_downloadTargetFile = QDir(tempDir).filePath(fileName);

    QFile::remove(m_downloadTargetFile);

    QNetworkRequest request(QUrl(downloadUrl));
    request.setHeader(QNetworkRequest::UserAgentHeader, "MatterPackr-Qt6-Client");
    request.setAttribute(QNetworkRequest::RedirectPolicyAttribute, QNetworkRequest::NoLessSafeRedirectPolicy);

    m_currentReply = m_network->get(request);

    m_progressDialog = new QProgressDialog(tr("Downloading update..."), tr("Cancel"), 0, 100, m_parent);
    m_progressDialog->setWindowTitle(tr("Updating MatterPackr"));
    m_progressDialog->setWindowModality(Qt::WindowModal);
    m_progressDialog->setMinimumDuration(200);

    connect(m_progressDialog, &QProgressDialog::canceled, m_currentReply, &QNetworkReply::abort);
    connect(m_currentReply, &QNetworkReply::downloadProgress, this, &UpdateManager::onDownloadProgress);
    connect(m_currentReply, &QNetworkReply::finished, this, &UpdateManager::onDownloadFinished);
}

void UpdateManager::onDownloadProgress(qint64 bytesReceived, qint64 bytesTotal) {
    if (m_progressDialog && bytesTotal > 0) {
        int percent = static_cast<int>((bytesReceived * 100) / bytesTotal);
        m_progressDialog->setValue(percent);
        m_progressDialog->setLabelText(tr("Downloading update: %1% (%2 MB / %3 MB)")
            .arg(percent)
            .arg(bytesReceived / (1024.0 * 1024.0), 0, 'f', 1)
            .arg(bytesTotal / (1024.0 * 1024.0), 0, 'f', 1));
    }
}

void UpdateManager::onDownloadFinished() {
    if (m_progressDialog) {
        m_progressDialog->close();
        m_progressDialog->deleteLater();
        m_progressDialog = nullptr;
    }

    if (!m_currentReply) return;

    if (m_currentReply->error() != QNetworkReply::NoError) {
        if (m_currentReply->error() != QNetworkReply::OperationCanceledError) {
            QMessageBox::warning(m_parent, tr("Update Error"),
                                 tr("Failed to download update: %1").arg(m_currentReply->errorString()));
        }
        m_currentReply->deleteLater();
        m_currentReply = nullptr;
        return;
    }

    QFile file(m_downloadTargetFile);
    if (!file.open(QIODevice::WriteOnly)) {
        QMessageBox::critical(m_parent, tr("Update Error"),
                              tr("Unable to save downloaded update to disk."));
        m_currentReply->deleteLater();
        m_currentReply = nullptr;
        return;
    }

    file.write(m_currentReply->readAll());
    file.close();

    m_currentReply->deleteLater();
    m_currentReply = nullptr;

    launchInstallerAndExit(m_downloadTargetFile);
}

void UpdateManager::launchInstallerAndExit(const QString &installerPath) {
#if defined(Q_OS_WIN)
    // On Windows: Elevate privileges using ShellExecuteW "runas" with silent or passive flags
    // to perform a seamless unattended upgrade and immediately exit current instance
    std::wstring pathW = QDir::toNativeSeparators(installerPath).toStdWString();
    // /S for silent unattended upgrade
    std::wstring paramsW = L"/S";

    HINSTANCE result = ShellExecuteW(
        nullptr,
        L"runas", // UAC elevation prompt
        pathW.c_str(),
        paramsW.c_str(),
        nullptr,
        SW_SHOWNORMAL
    );

    if ((INT_PTR)result > 32) {
        qApp->quit();
    } else {
        // Fallback without runas or launch GUI installer
        QProcess::startDetached(installerPath, QStringList());
        qApp->quit();
    }
#else
    // On macOS / Linux: open downloaded archive or prompt user
    QDesktopServices::openUrl(QUrl::fromLocalFile(installerPath));
    QMessageBox::information(m_parent, tr("Update Downloaded"),
                             tr("The update package has been downloaded to:\n%1\nPlease install it to complete the update.")
                             .arg(installerPath));
#endif
}
