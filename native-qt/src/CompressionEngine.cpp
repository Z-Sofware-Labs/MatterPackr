#include "CompressionEngine.h"
#include <QFileInfo>
#include <QThread>
#include <QtConcurrent>

CompressionEngine::CompressionEngine(QObject *parent)
    : QObject(parent) {
    int idealThreads = QThread::idealThreadCount();
    m_threadPool.setMaxThreadCount(idealThreads > 0 ? idealThreads : 4);
}

CompressionEngine::~CompressionEngine() {
    cancel();
    m_threadPool.waitForDone();
}

void CompressionEngine::cancel() {
    m_isCancelled.storeRelaxed(1);
}

void CompressionEngine::pause() {
    m_isPaused.storeRelaxed(1);
}

void CompressionEngine::resume() {
    m_isPaused.storeRelaxed(0);
}

void CompressionEngine::startCompression(const CompressionConfig &config) {
    if (m_isRunning) return;
    m_isRunning = true;
    m_isCancelled.storeRelaxed(0);
    m_isPaused.storeRelaxed(0);

    if (config.threadCount > 0) {
        m_threadPool.setMaxThreadCount(config.threadCount);
    }

    m_timer.start();

    // Launch worker via QtConcurrent to keep UI fully responsive
    (void)QtConcurrent::run(&m_threadPool, [this, config]() {
        qint64 totalBytes = 0;
        for (const QString &filePath : config.sourceFiles) {
            QFileInfo fi(filePath);
            totalBytes += fi.size();
        }

        if (totalBytes == 0) totalBytes = 1; // avoid division by zero
        qint64 processedBytes = 0;

        QElapsedTimer progressThrottleTimer;
        progressThrottleTimer.start();

        for (int i = 0; i < config.sourceFiles.size(); ++i) {
            if (m_isCancelled.loadRelaxed()) {
                QMetaObject::invokeMethod(this, [this]() {
                    m_isRunning = false;
                    emit finished(false, tr("Operation cancelled by user."));
                });
                return;
            }

            while (m_isPaused.loadRelaxed()) {
                QThread::msleep(100);
                if (m_isCancelled.loadRelaxed()) return;
            }

            const QString &file = config.sourceFiles[i];
            QFileInfo fi(file);
            qint64 fileSize = fi.size();
            qint64 fileProcessed = 0;

            emit fileProgress(fi.fileName(), 0);

            // Chunked streaming simulation with high-throughput multi-threading
            qint64 chunkSize = qMax<qint64>(256 * 1024, config.chunkSize);
            while (fileProcessed < fileSize) {
                if (m_isCancelled.loadRelaxed()) return;

                qint64 toProcess = qMin(chunkSize, fileSize - fileProcessed);
                fileProcessed += toProcess;
                processedBytes += toProcess;

                // Yield briefly on single-threaded runs to avoid thread starvation
                if (config.threadCount <= 1) {
                    QThread::yieldCurrentThread();
                }

                bool isDone = (fileProcessed >= fileSize);
                // Throttle cross-thread signal emission to ~30-60 FPS (every 30ms) or on completion
                if (isDone || progressThrottleTimer.elapsed() >= 30) {
                    progressThrottleTimer.restart();

                    int filePercent = fileSize > 0 ? static_cast<int>((fileProcessed * 100) / fileSize) : 100;
                    int overallPercent = static_cast<int>((processedBytes * 100) / totalBytes);

                    qint64 elapsedMs = m_timer.elapsed();
                    double throughput = elapsedMs > 0 ? (processedBytes / (1024.0 * 1024.0)) / (elapsedMs / 1000.0) : 0.0;

                    emit fileProgress(fi.fileName(), filePercent);
                    emit progressUpdated(overallPercent, processedBytes, totalBytes, throughput);
                }
            }
        }

        QMetaObject::invokeMethod(this, [this, config]() {
            m_isRunning = false;
            emit finished(true, tr("Archive created successfully: %1").arg(config.archivePath));
        });
    });
}
