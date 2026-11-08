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
    setFixedWidth(350);
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
    layout->setSizeConstraint(QLayout::SetFixedSize);
    layout->setContentsMargins(22, 20, 22, 18);
    layout->setSpacing(0);

    // 1. App Icon
    auto *lblIcon = new QLabel(this);
    lblIcon->setAlignment(Qt::AlignCenter);
    QIcon icon(":/app.png");
    if (icon.isNull()) {
        icon = QIcon(":/app.ico");
    }
    lblIcon->setPixmap(icon.pixmap(56, 56));
    layout->addWidget(lblIcon);
    layout->addSpacing(12);

    // 2. Title, Version & Copyright — strictly grouped in headerGroup with NO blank lines
    auto *headerGroup = new QWidget(this);
    headerGroup->setSizePolicy(QSizePolicy::Preferred, QSizePolicy::Fixed);
    auto *headerLayout = new QVBoxLayout(headerGroup);
    headerLayout->setContentsMargins(0, 0, 0, 0);
    headerLayout->setSpacing(2);

    auto *lblTitle = new QLabel("MatterPackr", headerGroup);
    lblTitle->setAlignment(Qt::AlignCenter);
    lblTitle->setStyleSheet("font-size: 16px; font-weight: bold; margin: 0; padding: 0;");
    headerLayout->addWidget(lblTitle);

    auto *lblVersion = new QLabel(tr("Version %1").arg(qApp->applicationVersion()), headerGroup);
    lblVersion->setAlignment(Qt::AlignCenter);
    lblVersion->setStyleSheet(
        QStringLiteral("font-size: 11px; color: %1; margin: 0; padding: 0;").arg(mutedColor));
    headerLayout->addWidget(lblVersion);

    auto *copyrightLayout = new QHBoxLayout();
    copyrightLayout->setAlignment(Qt::AlignCenter);
    copyrightLayout->setSpacing(4);
    copyrightLayout->setContentsMargins(0, 0, 0, 0);

    auto *lblCopyPrefix = new QLabel(tr("Copyright © 2026"), headerGroup);
    lblCopyPrefix->setStyleSheet(QStringLiteral("font-size: 10.5px; color: %1; margin: 0; padding: 0;").arg(mutedColor));

    auto *lblZLogo = new QLabel(headerGroup);
    QPixmap zPix(":/zsoftwarelabs.png");
    if (!zPix.isNull()) {
        lblZLogo->setPixmap(zPix.scaled(13, 13, Qt::KeepAspectRatio, Qt::SmoothTransformation));
    }
    lblZLogo->setStyleSheet("margin: 0; padding: 0;");

    auto *lblCopySuffix = new QLabel(tr("Z Software Labs. All rights reserved."), headerGroup);
    lblCopySuffix->setStyleSheet(QStringLiteral("font-size: 10.5px; color: %1; margin: 0; padding: 0;").arg(mutedColor));

    copyrightLayout->addWidget(lblCopyPrefix);
    copyrightLayout->addWidget(lblZLogo);
    copyrightLayout->addWidget(lblCopySuffix);
    headerLayout->addLayout(copyrightLayout);

    layout->addWidget(headerGroup);
    layout->addSpacing(18);

    // 3. Description
    auto *lblDesc = new QLabel(
        tr("MatterPackr is a lightweight, utility-driven desktop archive manager "
           "designed for effortless local compression management."), this);
    lblDesc->setAlignment(Qt::AlignCenter);
    lblDesc->setWordWrap(true);
    lblDesc->setStyleSheet(QStringLiteral(
        "font-size: 11px; color: %1; line-height: 1.45; margin: 0; padding: 0;").arg(descColor));
    layout->addWidget(lblDesc);
    layout->addSpacing(14);

    // 4. License header link
    auto *lblLicense = new QLabel(
        QStringLiteral("<span style='color: %1;'>This application is licensed under </span>"
                       "<a href=\"https://opensource.org/licenses/MIT\" style=\"color: #2563eb; text-decoration: none;\"><b>MIT ↗</b></a>")
            .arg(mutedColor), this);
    lblLicense->setAlignment(Qt::AlignCenter);
    lblLicense->setOpenExternalLinks(true);
    lblLicense->setStyleSheet("font-size: 11px; margin: 0; padding: 0;");
    layout->addWidget(lblLicense);
    layout->addSpacing(10);

    // 5. Compact Scrollable License text box with pure MIT License
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

    // 6. OK Button (Properly compliant with both Light Mode and Dark Mode)
    auto *btnLayout = new QHBoxLayout();
    btnLayout->addStretch();
    auto *btnOk = new QPushButton(tr("OK"), this);
    btnOk->setDefault(true);
    btnOk->setFixedWidth(84);
    btnOk->setFixedHeight(28);

    if (darkMode) {
        btnOk->setStyleSheet(
            "QPushButton { background: qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 #333842, stop:1 #22252c);"
            " color: #f3f4f6; border: 1px solid #4a5060; border-radius: 4px; font-size: 11px; font-weight: 600; padding: 3px 16px; }"
            "QPushButton:hover { background: #3e4452; border-color: #60687d; color: #ffffff; }"
            "QPushButton:pressed { background: #1c1e24; }");
    } else {
        btnOk->setStyleSheet(
            "QPushButton { background-color: #ffffff; color: #0f172a; border: 1px solid #cbd5e1;"
            " border-radius: 4px; font-size: 11px; font-weight: 600; padding: 3px 16px; }"
            "QPushButton:hover { background-color: #f1f5f9; border-color: #94a3b8; color: #000000; }"
            "QPushButton:pressed { background-color: #e2e8f0; }");
    }

    connect(btnOk, &QPushButton::clicked, this, &QDialog::accept);
    btnLayout->addWidget(btnOk);
    btnLayout->addStretch();
    layout->addLayout(btnLayout);
}
