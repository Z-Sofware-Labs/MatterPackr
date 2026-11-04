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
    setMinimumSize(440, 520);
    setWindowFlags(windowFlags() | Qt::WindowMinimizeButtonHint
                   | Qt::WindowMaximizeButtonHint);

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
    const QString inputColor = darkMode ? QStringLiteral("#16171c")
                                        : QStringLiteral("#ffffff");
    const QString borderColor = darkMode ? QStringLiteral("#4b516b")
                                         : QStringLiteral("#94a3b8");
    setStyleSheet(QStringLiteral(
        "QDialog { background-color: %1; color: %2; }"
        "QLabel { color: %2; }"
        "QTextEdit { background-color: %3; color: %2; border: 1px solid %4;"
        " border-radius: 6px; padding: 8px; }"
        "QPushButton { color: %2; background-color: %3; border: 1px solid %4;"
        " border-radius: 4px; padding: 5px 12px; }")
        .arg(windowColor, textColor, inputColor, borderColor));

    auto *layout = new QVBoxLayout(this);
    layout->setContentsMargins(24, 20, 24, 20);
    layout->setSpacing(8);

    // 1. App Icon
    auto *lblIcon = new QLabel(this);
    lblIcon->setAlignment(Qt::AlignCenter);
    QIcon icon(":/app.png");
    if (icon.isNull()) {
        icon = QIcon(":/app.ico");
    }
    lblIcon->setPixmap(icon.pixmap(64, 64));
    layout->addWidget(lblIcon);

    // 2. Title & Version
    auto *lblTitle = new QLabel("MatterPackr", this);
    lblTitle->setAlignment(Qt::AlignCenter);
    lblTitle->setStyleSheet("font-size: 18px; font-weight: bold; margin-top: 2px;");
    layout->addWidget(lblTitle);

    auto *lblVersion = new QLabel(tr("Version %1").arg(qApp->applicationVersion()), this);
    lblVersion->setAlignment(Qt::AlignCenter);
    lblVersion->setStyleSheet(
        QStringLiteral("font-size: 12px; color: %1;").arg(mutedColor));
    layout->addWidget(lblVersion);

    // 3. Copyright
    auto *lblCopyright = new QLabel(tr("Copyright © 2026 Z Software Labs. All rights reserved."), this);
    lblCopyright->setAlignment(Qt::AlignCenter);
    lblCopyright->setStyleSheet(
        QStringLiteral("font-size: 11px; color: %1; margin-top: 2px;")
            .arg(mutedColor));
    layout->addWidget(lblCopyright);

    // 4. Description
    auto *lblDesc = new QLabel(
        tr("MatterPackr is a lightweight, utility-driven desktop archive manager "
           "designed for fast, effortless compression workflows."), this);
    lblDesc->setAlignment(Qt::AlignCenter);
    lblDesc->setWordWrap(true);
    lblDesc->setStyleSheet("font-size: 12px; margin-top: 4px; margin-bottom: 2px;");
    layout->addWidget(lblDesc);

    // 5. License header link
    auto *lblLicense = new QLabel(
        tr("This application is licensed under "
           "<a href=\"https://opensource.org/licenses/MIT\" style=\"color: #2563eb; text-decoration: none;\"><b>MIT ↗</b></a>"), this);
    lblLicense->setAlignment(Qt::AlignCenter);
    lblLicense->setOpenExternalLinks(true);
    lblLicense->setStyleSheet("font-size: 13px; margin-bottom: 4px;");
    layout->addWidget(lblLicense);

    // 6. Scrollable License text box with MIT + Third-Party Credits
    auto *txtLicense = new QTextEdit(this);
    txtLicense->setReadOnly(true);
    txtLicense->setStyleSheet(QStringLiteral(
        "QTextEdit { font-family: Consolas, 'Courier New', monospace;"
        " font-size: 10pt; line-height: 1.4; background-color: %1;"
        " color: %2; border: 1px solid %3; border-radius: 6px; padding: 8px; }")
        .arg(inputColor, textColor, borderColor));

    const QString licenseHtml = QString(
        "<p style='margin-bottom: 8px;'>Permission is hereby granted, free of charge, to any person obtaining a copy "
        "of this software and associated documentation files (the \"Software\"), to deal in the Software without "
        "restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, "
        "sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, "
        "subject to the following conditions:</p>"
        "<p style='margin-bottom: 8px;'>The above copyright notice and this permission notice shall be included in all "
        "copies or substantial portions of the Software.</p>"
        "<p style='margin-bottom: 12px;'>THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR "
        "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND "
        "NONINFRINGEMENT.</p>"
        "<hr style='border: none; border-top: 1px solid #9ca3af; margin: 8px 0;'/>"
        "<p style='font-family: sans-serif; font-size: 10pt; font-weight: bold; margin-bottom: 4px;'>Third-Party Licenses</p>"
        "<p style='margin-bottom: 3px;'><b>libarchive:</b> Copyright © 2003-2007 Tim Kientzle. BSD License.</p>"
        "<p style='margin-bottom: 3px;'><b>7-Zip:</b> Copyright © 1999-2026 Igor Pavlov. GNU Lesser GPL.</p>"
        "<p style='margin-bottom: 3px;'><b>UnRAR:</b> Copyright © Alexander Roshal. Freeware license.</p>"
    );

    txtLicense->setHtml(licenseHtml);
    layout->addWidget(txtLicense);

    // 7. OK Button
    auto *btnLayout = new QHBoxLayout();
    btnLayout->addStretch();
    auto *btnOk = new QPushButton(tr("OK"), this);
    btnOk->setDefault(true);
    btnOk->setFixedWidth(100);
    connect(btnOk, &QPushButton::clicked, this, &QDialog::accept);
    btnLayout->addWidget(btnOk);
    btnLayout->addStretch();
    layout->addLayout(btnLayout);
}
