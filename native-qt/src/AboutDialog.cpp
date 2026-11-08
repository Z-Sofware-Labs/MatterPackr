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
    setFixedSize(360, 480);
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
    const QString inputColor = darkMode ? QStringLiteral("#121318")
                                        : QStringLiteral("#ffffff");
    const QString borderColor = darkMode ? QStringLiteral("#2d313e")
                                         : QStringLiteral("#cbd5e1");
    setStyleSheet(QStringLiteral(
        "QDialog { background-color: %1; color: %2; }"
        "QLabel { color: %2; }")
        .arg(windowColor, textColor));

    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(20, 16, 20, 16);
    layout->setSpacing(6);

    // 1. App Icon
    auto *lblIcon = new QLabel(this);
    lblIcon->setAlignment(Qt::AlignCenter);
    QIcon icon(":/app.png");
    if (icon.isNull()) {
        icon = QIcon(":/app.ico");
    }
    lblIcon->setPixmap(icon.pixmap(56, 56));
    layout->addWidget(lblIcon);

    // 2. Title & Version
    auto *lblTitle = new QLabel("MatterPackr", this);
    lblTitle->setAlignment(Qt::AlignCenter);
    lblTitle->setStyleSheet("font-size: 16px; font-weight: bold; margin-top: 2px;");
    layout->addWidget(lblTitle);

    auto *lblVersion = new QLabel(tr("Version %1").arg(qApp->applicationVersion()), this);
    lblVersion->setAlignment(Qt::AlignCenter);
    lblVersion->setStyleSheet(
        QStringLiteral("font-size: 11px; color: %1;").arg(mutedColor));
    layout->addWidget(lblVersion);

    // 3. Copyright with Z Software Labs Logo
    auto *copyrightLayout = new QHBoxLayout();
    copyrightLayout->setAlignment(Qt::AlignCenter);
    copyrightLayout->setSpacing(4);
    copyrightLayout->setContentsMargins(0, 2, 0, 2);

    auto *lblCopyPrefix = new QLabel(tr("Copyright © 2026"), this);
    lblCopyPrefix->setStyleSheet(QStringLiteral("font-size: 10.5px; color: %1;").arg(mutedColor));

    auto *lblZLogo = new QLabel(this);
    QPixmap zPix(":/zsoftwarelabs.png");
    if (!zPix.isNull()) {
        lblZLogo->setPixmap(zPix.scaled(14, 14, Qt::KeepAspectRatio, Qt::SmoothTransformation));
    }

    auto *lblCopySuffix = new QLabel(tr("Z Software Labs. All rights reserved."), this);
    lblCopySuffix->setStyleSheet(QStringLiteral("font-size: 10.5px; color: %1;").arg(mutedColor));

    copyrightLayout->addWidget(lblCopyPrefix);
    copyrightLayout->addWidget(lblZLogo);
    copyrightLayout->addWidget(lblCopySuffix);
    layout->addLayout(copyrightLayout);

    // 4. Description
    auto *lblDesc = new QLabel(
        tr("MatterPackr is a lightweight, utility-driven desktop archive manager "
           "designed for fast, effortless compression workflows."), this);
    lblDesc->setAlignment(Qt::AlignCenter);
    lblDesc->setWordWrap(true);
    lblDesc->setStyleSheet("font-size: 11px; margin-top: 2px; margin-bottom: 2px;");
    layout->addWidget(lblDesc);

    // 5. License header link
    auto *lblLicense = new QLabel(
        tr("This application is licensed under "
           "<a href=\"https://opensource.org/licenses/MIT\" style=\"color: #3b82f6; text-decoration: none;\"><b>MIT ↗</b></a>"), this);
    lblLicense->setAlignment(Qt::AlignCenter);
    lblLicense->setOpenExternalLinks(true);
    lblLicense->setStyleSheet("font-size: 11.5px; margin-bottom: 2px;");
    layout->addWidget(lblLicense);

    // 6. Compact Scrollable License text box with MIT + Third-Party Credits
    auto *txtLicense = new QTextEdit(this);
    txtLicense->setReadOnly(true);
    txtLicense->setFixedHeight(120);
    txtLicense->setStyleSheet(QStringLiteral(
        "QTextEdit { font-family: Consolas, 'Courier New', monospace;"
        " font-size: 8.5pt; line-height: 1.35; background-color: %1;"
        " color: %2; border: 1px solid %3; border-radius: 6px; padding: 6px; }")
        .arg(inputColor, textColor, borderColor));

    const QString licenseHtml = QString(
        "<p style='margin-bottom: 6px;'>Permission is hereby granted, free of charge, to any person obtaining a copy "
        "of this software and associated documentation files (the \"Software\"), to deal in the Software without "
        "restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, "
        "sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, "
        "subject to the following conditions:</p>"
        "<p style='margin-bottom: 6px;'>The above copyright notice and this permission notice shall be included in all "
        "copies or substantial portions of the Software.</p>"
        "<p style='margin-bottom: 8px;'>THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR "
        "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND "
        "NONINFRINGEMENT.</p>"
        "<hr style='border: none; border-top: 1px solid %1; margin: 6px 0;'/>"
        "<p style='font-family: sans-serif; font-size: 8.5pt; font-weight: bold; margin-bottom: 3px;'>Third-Party Licenses</p>"
        "<p style='margin-bottom: 2px;'><b>libarchive:</b> Copyright © 2003-2007 Tim Kientzle. BSD License.</p>"
        "<p style='margin-bottom: 2px;'><b>7-Zip:</b> Copyright © 1999-2026 Igor Pavlov. GNU Lesser GPL.</p>"
        "<p style='margin-bottom: 2px;'><b>UnRAR:</b> Copyright © Alexander Roshal. Freeware license.</p>"
    ).arg(borderColor);

    txtLicense->setHtml(licenseHtml);
    layout->addWidget(txtLicense);

    // 7. OK Button
    auto *btnLayout = new QHBoxLayout();
    btnLayout->addStretch();
    auto *btnOk = new QPushButton(tr("OK"), this);
    btnOk->setDefault(true);
    btnOk->setFixedWidth(84);
    btnOk->setFixedHeight(28);
    const QString btnBg = darkMode ? QStringLiteral("qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 #333842, stop:1 #22252c)")
                                   : QStringLiteral("qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 #ffffff, stop:1 #e2e8f0)");
    const QString btnBorder = darkMode ? QStringLiteral("#4a5060") : QStringLiteral("#cbd5e1");
    btnOk->setStyleSheet(QStringLiteral(
        "QPushButton { color: %1; background: %2; border: 1px solid %3;"
        " border-radius: 5px; font-size: 11px; font-weight: 600; padding: 2px 14px; }"
        "QPushButton:hover { border-color: #60687d; }"
        "QPushButton:pressed { background: #1c1e24; }")
        .arg(textColor, btnBg, btnBorder));
    connect(btnOk, &QPushButton::clicked, this, &QDialog::accept);
    btnLayout->addWidget(btnOk);
    btnLayout->addStretch();
    layout->addLayout(btnLayout);
}
