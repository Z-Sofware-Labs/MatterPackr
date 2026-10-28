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
#include <QDateTime>

#ifdef Q_OS_WIN
#include <windows.h>
#include <shellapi.h>
#endif

UpdateManager::UpdateManager(QWidget *parent)
    : QObject(parent)
    , m_parent(parent)
    , m_network(new QNetworkAccessManager(this)) {}

void UpdateManager::checkForUpdates() {
    if (m_checkingDialog) {
        m_checkingDialog->close();
        m_checkingDialog->deleteLater();
        m_checkingDialog = nullptr;
    }

    m_checkingDialog = new QProgressDialog(tr("Checking for updates..."), tr("Cancel"), 0, 0, m_parent);
    m_checkingDialog->setWindowTitle(tr("Check for Updates"));
    m_checkingDialog->setWindowModality(Qt::WindowModal);
    m_checkingDialog->setMinimumDuration(0);
    connect(m_checkingDialog, &QProgressDialog::canceled, [this]() {
        if (m_currentReply) {
            m_currentReply->abort();
        }
    });
    m_checkingDialog->show();

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
    if (m_checkingDialog) {
        m_checkingDialog->close();
        m_checkingDialog->deleteLater();
        m_checkingDialog = nullptr;
    }

    if (!m_currentReply) return;

    if (m_currentReply->error() != QNetworkReply::NoError) {
        if (m_currentReply->error() != QNetworkReply::OperationCanceledError) {
            QMessageBox::warning(m_parent, tr("Check for Updates"),
                                 tr("Unable to check for updates.\nError: %1").arg(m_currentReply->errorString()));
        }
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
    bool newer = isNewerVersion(tagName, currentVersion);
    if (!newer) {
        QMessageBox::information(
            m_parent, tr("Check for Updates"),
            tr("MatterPackr is currently up to date!\n\n"
               "Current version: %1\n"
               "Latest version: %2\n\n"
               "No update is available.")
            .arg(currentVersion, tagName));
        return;
    }

    // Match platform asset across Windows, macOS, and Linux
    QString targetAssetUrl;
    QString targetFileName;

#if defined(Q_OS_WIN)
    for (const auto &val : assets) {
        QJsonObject asset = val.toObject();
        QString name = asset.value("name").toString();
        if (name.endsWith(".sig", Qt::CaseInsensitive))
            continue;
        if (name.contains("setup", Qt::CaseInsensitive) && name.endsWith(".exe", Qt::CaseInsensitive)) {
            targetAssetUrl = asset.value("browser_download_url").toString();
            targetFileName = name;
            break;
        }
    }
    // Fallback to any non-sig .exe or .msi if setup.exe was not found
    if (targetAssetUrl.isEmpty()) {
        for (const auto &val : assets) {
            QJsonObject asset = val.toObject();
            QString name = asset.value("name").toString();
            if (name.endsWith(".sig", Qt::CaseInsensitive))
                continue;
            if (name.endsWith(".exe", Qt::CaseInsensitive) || name.endsWith(".msi", Qt::CaseInsensitive)) {
                targetAssetUrl = asset.value("browser_download_url").toString();
                targetFileName = name;
                break;
            }
        }
    }
#elif defined(Q_OS_MACOS) || defined(Q_OS_MAC)
    for (const auto &val : assets) {
        QJsonObject asset = val.toObject();
        QString name = asset.value("name").toString();
        if (name.endsWith(".sig", Qt::CaseInsensitive))
            continue;
        if (name.endsWith(".dmg", Qt::CaseInsensitive) ||
            name.endsWith(".pkg", Qt::CaseInsensitive) ||
            (name.contains("mac", Qt::CaseInsensitive) && name.endsWith(".zip", Qt::CaseInsensitive))) {
            targetAssetUrl = asset.value("browser_download_url").toString();
            targetFileName = name;
            break;
        }
    }
#else
    for (const auto &val : assets) {
        QJsonObject asset = val.toObject();
        QString name = asset.value("name").toString();
        if (name.endsWith(".sig", Qt::CaseInsensitive))
            continue;
        if (name.endsWith(".deb", Qt::CaseInsensitive) ||
            name.endsWith(".AppImage", Qt::CaseInsensitive) ||
            name.endsWith(".tar.gz", Qt::CaseInsensitive) ||
            name.contains("linux", Qt::CaseInsensitive)) {
            targetAssetUrl = asset.value("browser_download_url").toString();
            targetFileName = name;
            break;
        }
    }
#endif

    if (targetAssetUrl.isEmpty()) {
        QMessageBox::information(m_parent, tr("Update Available"),
                                 tr("A newer version (%1) is available, but no matching installer was found for your operating system.\nVisit GitHub to download.")
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

    QNetworkRequest request(QUrl{downloadUrl});
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
    // On Windows: Create a self-deleting helper batch script in Temp that executes
    // the installer silently (/S), waits for installation to finish, and automatically
    // relaunches MatterPackr.
    QString currentExe = QDir::toNativeSeparators(qApp->applicationFilePath());
    QString cleanInstaller = QDir::toNativeSeparators(installerPath);

    QString tempDir = QStandardPaths::writableLocation(QStandardPaths::TempLocation);
    QString scriptPath = QDir(tempDir).filePath(QString("apply_update_%1.cmd").arg(QDateTime::currentMSecsSinceEpoch()));

    QFile script(scriptPath);
    if (script.open(QIODevice::WriteOnly | QIODevice::Text)) {
        QTextStream out(&script);
        out << "@echo off\r\n";
        out << "setlocal\r\n";
        out << "timeout /t 1 /nobreak >nul\r\n";
        out << "start /wait \"\" \"" << cleanInstaller << "\" /S\r\n";
        out << "timeout /t 1 /nobreak >nul\r\n";
        out << "tasklist /FI \"IMAGENAME eq MatterPackr.exe\" 2>nul | find /I \"MatterPackr.exe\" >nul\r\n";
        out << "if errorlevel 1 (\r\n";
        out << "    start \"\" \"" << currentExe << "\"\r\n";
        out << ")\r\n";
        out << "endlocal\r\n";
        out << "(goto) 2>nul & del \"%~f0\"\r\n";
        script.close();
    }

    std::wstring scriptW = QDir::toNativeSeparators(scriptPath).toStdWString();
    HINSTANCE result = ShellExecuteW(
        nullptr,
        L"runas", // UAC elevation prompt
        L"cmd.exe",
        (L"/c \"" + scriptW + L"\"").c_str(),
        nullptr,
        SW_HIDE
    );

    if ((INT_PTR)result > 32) {
        qApp->quit();
    } else {
        // Fallback without runas or launch GUI installer
        QProcess::startDetached("cmd.exe", QStringList() << "/c" << scriptPath);
        qApp->quit();
    }

#elif defined(Q_OS_MACOS)
    // On macOS: Extract new .app bundle, elevate via osascript administrator privileges,
    // swap the bundle in-place, relaunch new version, and exit immediately.
    QString appPath = qApp->applicationDirPath();
    // In macOS bundles, applicationDirPath is inside MatterPackr.app/Contents/MacOS
    QDir dir(appPath);
    dir.cdUp();
    dir.cdUp();
    QString targetBundle = dir.absolutePath(); // Path to current MatterPackr.app

    QString tempExtractDir = QDir::temp().filePath("matterpackr_update_" + QString::number(QDateTime::currentMSecsSinceEpoch()));
    QDir().mkpath(tempExtractDir);

    // Unzip update bundle
    QProcess unzipProc;
    unzipProc.start("/usr/bin/ditto", QStringList() << "-x" << "-k" << installerPath << tempExtractDir);
    unzipProc.waitForFinished(60000);

    QString newBundlePath = tempExtractDir + "/MatterPackr.app";
    if (!QDir(newBundlePath).exists()) {
        // Look inside root of extracted dir
        QDir extracted(tempExtractDir);
        for (const QString &entry : extracted.entryList(QStringList() << "*.app", QDir::Dirs)) {
            newBundlePath = extracted.filePath(entry);
            break;
        }
    }

    if (!QDir(newBundlePath).exists()) {
        QMessageBox::critical(m_parent, tr("Update Error"), tr("Unable to locate updated application bundle."));
        return;
    }

    // Write a standalone updater shell script to execute atomically and reopen app
    QString scriptPath = tempExtractDir + "/update.sh";
    QFile script(scriptPath);
    if (script.open(QIODevice::WriteOnly)) {
        QTextStream out(&script);
        out << "#!/bin/bash\n";
        out << "sleep 1\n";
        out << "rm -rf \"" << targetBundle << "\"\n";
        out << "mv \"" << newBundlePath << "\" \"" << targetBundle << "\"\n";
        out << "xattr -dr com.apple.quarantine \"" << targetBundle << "\" 2>/dev/null || true\n";
        out << "CONSOLE_USER=$(stat -f '%Su' /dev/console 2>/dev/null || echo \"$USER\")\n";
        out << "if [ -n \"$CONSOLE_USER\" ] && [ \"$CONSOLE_USER\" != \"root\" ]; then\n";
        out << "    sudo -u \"$CONSOLE_USER\" open \"" << targetBundle << "\" 2>/dev/null || open \"" << targetBundle << "\"\n";
        out << "else\n";
        out << "    open \"" << targetBundle << "\"\n";
        out << "fi\n";
        script.close();
        script.setPermissions(QFile::ReadOwner | QFile::WriteOwner | QFile::ExeOwner | QFile::ReadGroup | QFile::ExeGroup);
    }

    // Elevate with Administrator privileges if necessary
    QString appleScript = QString("do shell script \"/bin/bash '%1'\" with administrator privileges").arg(scriptPath);
    QProcess::startDetached("osascript", QStringList() << "-e" << appleScript);

    qApp->quit();

#elif defined(Q_OS_LINUX)
    // On Linux: Check if installed via package or standalone binary.
    // Use pkexec (PolicyKit standard GUI prompt) to elevate and install automatically.
    QString currentExe = qApp->applicationFilePath();
    QString tempDir = QFileInfo(installerPath).absolutePath();

    if (installerPath.endsWith(".deb", Qt::CaseInsensitive)) {
        // Native deb package upgrade via pkexec apt-get
        QString scriptPath = tempDir + "/apply_update_deb.sh";
        QFile script(scriptPath);
        if (script.open(QIODevice::WriteOnly)) {
            QTextStream out(&script);
            out << "#!/bin/sh\n";
            out << "apt-get install -y --reinstall \"" << installerPath << "\"\n";
            out << "CONSOLE_USER=$(logname 2>/dev/null || who -m 2>/dev/null | awk '{print $1}' || echo \"$USER\")\n";
            out << "if [ -n \"$CONSOLE_USER\" ] && [ \"$CONSOLE_USER\" != \"root\" ]; then\n";
            out << "    su - \"$CONSOLE_USER\" -c \"" << currentExe << "\" 2>/dev/null || \"" << currentExe << "\" &\n";
            out << "else\n";
            out << "    \"" << currentExe << "\" &\n";
            out << "fi\n";
            script.close();
            script.setPermissions(QFile::ReadOwner | QFile::WriteOwner | QFile::ExeOwner);
        }
        QProcess::startDetached("pkexec", QStringList() << "sh" << scriptPath);
        qApp->quit();
    } else {
        // Extracted tar.gz binary swap
        QProcess tarProc;
        tarProc.start("tar", QStringList() << "-xzf" << installerPath << "-C" << tempDir);
        tarProc.waitForFinished(30000);

        QString extractedExe = tempDir + "/MatterPackr/MatterPackr";
        if (!QFile::exists(extractedExe)) {
            extractedExe = tempDir + "/MatterPackr";
        }

        if (QFile::exists(extractedExe)) {
            QString scriptPath = tempDir + "/apply_update.sh";
            QFile script(scriptPath);
            if (script.open(QIODevice::WriteOnly)) {
                QTextStream out(&script);
                out << "#!/bin/sh\n";
                out << "sleep 1\n";
                out << "cp -f \"" << extractedExe << "\" \"" << currentExe << "\"\n";
                out << "chmod +x \"" << currentExe << "\"\n";
                out << "CONSOLE_USER=$(logname 2>/dev/null || who -m 2>/dev/null | awk '{print $1}' || echo \"$USER\")\n";
                out << "if [ -n \"$CONSOLE_USER\" ] && [ \"$CONSOLE_USER\" != \"root\" ]; then\n";
                out << "    su - \"$CONSOLE_USER\" -c \"" << currentExe << "\" 2>/dev/null || \"" << currentExe << "\" &\n";
                out << "else\n";
                out << "    \"" << currentExe << "\" &\n";
                out << "fi\n";
                script.close();
                script.setPermissions(QFile::ReadOwner | QFile::WriteOwner | QFile::ExeOwner);
            }

            // Run with pkexec if target directory is not writable, else normal sh
            if (QFileInfo(currentExe).isWritable()) {
                QProcess::startDetached("sh", QStringList() << scriptPath);
            } else {
                QProcess::startDetached("pkexec", QStringList() << "sh" << scriptPath);
            }
            qApp->quit();
        } else {
            QDesktopServices::openUrl(QUrl::fromLocalFile(installerPath));
            QMessageBox::information(m_parent, tr("Update Downloaded"),
                                     tr("The update package has been downloaded to:\n%1")
                                     .arg(installerPath));
        }
    }
#endif
}
