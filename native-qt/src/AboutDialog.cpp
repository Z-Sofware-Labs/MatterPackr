#include "AboutDialog.h"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QTextEdit>
#include <QPushButton>
#include <QIcon>
#include <QPixmap>
#include <QApplication>
#include <QColor>

#ifdef Q_OS_WIN
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <dwmapi.h>
#endif

AboutDialog::AboutDialog(QWidget *parent)
    : QDialog(parent) {
    setWindowTitle(tr("About MatterPackr"));
    setModal(true);
    setFixedSize(350, 480);
    setWindowFlags(Qt::Dialog | Qt::CustomizeWindowHint | Qt::WindowTitleHint | Qt::WindowCloseButtonHint);

    setAutoFillBackground(true);

#ifdef Q_OS_WIN
    HWND hwnd = reinterpret_cast<HWND>(winId());
    if (hwnd) {
        const bool darkMode =
            qApp->property("matterpackrTheme").toString() != QStringLiteral("light");
        const BOOL useDarkMode = darkMode ? TRUE : FALSE;
        if (FAILED(DwmSetWindowAttribute(hwnd, 20, &useDarkMode,
                                         sizeof(useDarkMode)))) {
            DwmSetWindowAttribute(hwnd, 19, &useDarkMode,
                                  sizeof(useDarkMode));
        }
    }
#endif

    setupUi();
}

void AboutDialog::setupUi() {
    const bool darkMode =
        qApp->property("matterpackrTheme").toString() != QStringLiteral("light");
    const QString windowColor = darkMode ? QStringLiteral("#181920")
                                         : QStringLiteral("#f8fafc");
    const QString textColor = darkMode ? QStringLiteral("#e5e7eb")
                                       : QStringLiteral("#1e293b");
    const QString mutedColor = darkMode ? QStringLiteral("#9ca3af")
                                        : QStringLiteral("#64748b");
    const QString descColor = darkMode ? QStringLiteral("#d1d5db")
                                       : QStringLiteral("#334155");
    const QString inputColor = darkMode ? QStringLiteral("#121318")
                                        : QStringLiteral("#ffffff");
    const QString borderColor = darkMode ? QStringLiteral("#2d313e")
                                         : QStringLiteral("#cbd5e1");
    setStyleSheet(QStringLiteral(
        "QDialog { background-color: %1; color: %2; }"
        "QLabel { color: %2; }")
        .arg(windowColor, textColor));

    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(24, 24, 24, 20);
    layout->setSpacing(0);

    // 1. App Icon
    auto *lblIcon = new QLabel(this);
    lblIcon->setAlignment(Qt::AlignCenter);
    QIcon icon(":/app.png");
    if (icon.isNull()) {
        icon = QIcon(":/app.ico");
    }
    lblIcon->setPixmap(icon.pixmap(58, 58));
    layout->addWidget(lblIcon);
    layout->addSpacing(12);

    // 2. Title & Version (No blank line)
    auto *lblTitle = new QLabel("MatterPackr", this);
    lblTitle->setAlignment(Qt::AlignCenter);
    lblTitle->setStyleSheet("font-size: 17px; font-weight: bold; margin: 0; padding: 0;");
    layout->addWidget(lblTitle);
    layout->addSpacing(1);

    auto *lblVersion = new QLabel(tr("Version %1").arg(qApp->applicationVersion()), this);
    lblVersion->setAlignment(Qt::AlignCenter);
    lblVersion->setStyleSheet(
        QStringLiteral("font-size: 11px; color: %1; margin: 0; padding: 0;").arg(mutedColor));
    layout->addWidget(lblVersion);
    layout->addSpacing(2);

    // 3. Copyright with Z Software Labs Logo (No blank line above)
    auto *copyrightLayout = new QHBoxLayout();
    copyrightLayout->setAlignment(Qt::AlignCenter);
    copyrightLayout->setSpacing(4);
    copyrightLayout->setContentsMargins(0, 0, 0, 0);

    auto *lblCopyPrefix = new QLabel(tr("Copyright © 2026"), this);
    lblCopyPrefix->setStyleSheet(QStringLiteral("font-size: 10.5px; color: %1; margin: 0; padding: 0;").arg(mutedColor));

    auto *lblZLogo = new QLabel(this);
    QPixmap zPix(":/zsoftwarelabs.png");
    if (!zPix.isNull()) {
        lblZLogo->setPixmap(zPix.scaled(13, 13, Qt::KeepAspectRatio, Qt::SmoothTransformation));
    }
    lblZLogo->setStyleSheet("margin: 0; padding: 0;");

    auto *lblCopySuffix = new QLabel(tr("Z Software Labs. All rights reserved."), this);
    lblCopySuffix->setStyleSheet(QStringLiteral("font-size: 10.5px; color: %1; margin: 0; padding: 0;").arg(mutedColor));

    copyrightLayout->addWidget(lblCopyPrefix);
    copyrightLayout->addWidget(lblZLogo);
    copyrightLayout->addWidget(lblCopySuffix);
    layout->addLayout(copyrightLayout);
    layout->addSpacing(18);

    // 4. Description
    auto *lblDesc = new QLabel(
        tr("MatterPackr is a lightweight, utility-driven desktop archive manager "
           "designed for effortless local compression management."), this);
    lblDesc->setAlignment(Qt::AlignCenter);
    lblDesc->setWordWrap(true);
    lblDesc->setStyleSheet(QStringLiteral(
        "font-size: 11px; color: %1; line-height: 1.45; margin: 0;").arg(descColor));
    layout->addWidget(lblDesc);
    layout->addSpacing(14);

    // 5. License header link
    auto *lblLicense = new QLabel(
        QStringLiteral("<span style='color: %1;'>This application is licensed under </span>"
                       "<a href=\"https://opensource.org/licenses/MIT\" style=\"color: #3b82f6; text-decoration: none;\"><b>MIT ↗</b></a>")
            .arg(mutedColor), this);
    lblLicense->setAlignment(Qt::AlignCenter);
    lblLicense->setOpenExternalLinks(true);
    lblLicense->setStyleSheet("font-size: 11px; margin: 0;");
    layout->addWidget(lblLicense);
    layout->addSpacing(10);

    // 6. Compact Scrollable License text box with pure MIT License
    auto *txtLicense = new QTextEdit(this);
    txtLicense->setReadOnly(true);
    txtLicense->setFixedHeight(115);
    txtLicense->setStyleSheet(QStringLiteral(
        "QTextEdit { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;"
        " font-size: 8.5pt; line-height: 1.4; background-color: %1;"
        " color: %2; border: 1px solid %3; border-radius: 6px; padding: 7px; }")
        .arg(inputColor, mutedColor, borderColor));

    const QString licenseHtml = QString(
        "<p style='margin-bottom: 8px;'>Permission is hereby granted, free of charge, to any person obtaining a copy "
        "of this software and associated documentation files (the \"Software\"), to deal in the Software without "
        "restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, "
        "sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, "
        "subject to the following conditions:</p>"
        "<p style='margin-bottom: 8px;'>The above copyright notice and this permission notice shall be included in all "
        "copies or substantial portions of the Software.</p>"
        "<p style='margin-bottom: 0px;'>THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR "
        "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND "
        "NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER "
        "LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE "
        "SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.</p>"
    );

    txtLicense->setHtml(licenseHtml);
    layout->addWidget(txtLicense);
    layout->addSpacing(14);

    // 7. OK Button
    auto *btnLayout = new QHBoxLayout();
    btnLayout->addStretch();
    auto *btnOk = new QPushButton(tr("OK"), this);
    btnOk->setDefault(true);
    btnOk->setFixedWidth(80);
    btnOk->setFixedHeight(26);
    const QString btnBg = darkMode ? QStringLiteral("qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 #333842, stop:1 #22252c)")
                                   : QStringLiteral("qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 #ffffff, stop:1 #e2e8f0)");
    const QString btnBorder = darkMode ? QStringLiteral("#4a5060") : QStringLiteral("#cbd5e1");
    btnOk->setStyleSheet(QStringLiteral(
        "QPushButton { color: %1; background: %2; border: 1px solid %3;"
        " border-radius: 4px; font-size: 11px; font-weight: 600; padding: 2px 12px; }"
        "QPushButton:hover { border-color: #60687d; }"
        "QPushButton:pressed { background: #1c1e24; }")
        .arg(textColor, btnBg, btnBorder));
    connect(btnOk, &QPushButton::clicked, this, &QDialog::accept);
    btnLayout->addWidget(btnOk);
    btnLayout->addStretch();
    layout->addLayout(btnLayout);
}
