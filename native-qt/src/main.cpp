#include <QApplication>
#include <QStyleFactory>
#include <QIcon>
#include <QFile>
#include <QFileInfo>
#include "MainWindow.h"

int main(int argc, char *argv[]) {
    // Enable High DPI scaling
    QApplication::setHighDpiScaleFactorRoundingPolicy(
        Qt::HighDpiScaleFactorRoundingPolicy::PassThrough
    );

    QApplication app(argc, argv);
    app.setApplicationName("MatterPackr");
    app.setApplicationVersion("3.0.4");
    app.setOrganizationName("MatterPackr Core Engineering");

    // Set application icon from embedded Qt resources
    QIcon appIcon(":/app.png");
    if (appIcon.isNull()) {
        appIcon = QIcon(":/app.ico");
    }
    app.setWindowIcon(appIcon);

    // Use modern Fusion style by default across platforms
    QApplication::setStyle(QStyleFactory::create("Fusion"));

    // Load embedded Fluent Dark stylesheet
    QFile styleFile(":/style.qss");
    if (styleFile.open(QIODevice::ReadOnly | QIODevice::Text)) {
        app.setStyleSheet(QString::fromUtf8(styleFile.readAll()));
        styleFile.close();
    }

    MainWindow window;
    window.setWindowIcon(appIcon);

    // Open file passed via command-line arguments (e.g. double-clicked associated archive)
    const QStringList args = QApplication::arguments();
    const QString selfExeName = QFileInfo(QApplication::applicationFilePath()).fileName();
    for (int i = 1; i < args.size(); ++i) {
        QString arg = args.at(i).trimmed();
        if (arg.startsWith('"') && arg.endsWith('"') && arg.length() >= 2) {
            arg = arg.mid(1, arg.length() - 2);
        }
        if (arg.isEmpty() || arg.startsWith('-') || arg.startsWith('/')) {
            continue;
        }

        QFileInfo fi(arg);
        if (fi.fileName().compare("MatterPackr.exe", Qt::CaseInsensitive) == 0 ||
            fi.fileName().compare(selfExeName, Qt::CaseInsensitive) == 0 ||
            fi.suffix().compare("exe", Qt::CaseInsensitive) == 0 ||
            fi.suffix().compare("dll", Qt::CaseInsensitive) == 0) {
            continue;
        }

        window.openArchiveFile(arg);
        break;
    }

    window.show();

    return app.exec();
}

