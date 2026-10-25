#pragma once

#include <QObject>
#include <QString>
#include <QStringList>
#include <QThreadPool>
#include <QRunnable>
#include <QElapsedTimer>
#include <QAtomicInt>

struct CompressionConfig {
    QString archivePath;
    QStringList sourceFiles;
    int compressionLevel = 6; // 0-9
    int threadCount = 8;
    bool enableEncryption = false;
    QString password;
    QString encryptionMethod = "AES-256";
    qint64 chunkSize = 1024 * 1024; // 1 MB chunks
};

class CompressionEngine : public QObject {
    Q_OBJECT

public:
    explicit CompressionEngine(QObject *parent = nullptr);
    ~CompressionEngine();

    void startCompression(const CompressionConfig &config);
    void cancel();
    void pause();
    void resume();

    bool isRunning() const { return m_isRunning; }
    int threadCount() const { return m_threadPool.maxThreadCount(); }

signals:
    void progressUpdated(int overallPercent, qint64 processedBytes, qint64 totalBytes, double throughputMBps);
    void fileProgress(const QString &currentFile, int filePercent);
    void finished(bool success, const QString &message);
    void logMessage(const QString &msg);

private:
    QThreadPool m_threadPool;
    QAtomicInt m_isCancelled{0};
    QAtomicInt m_isPaused{0};
    bool m_isRunning = false;
    QElapsedTimer m_timer;
};
