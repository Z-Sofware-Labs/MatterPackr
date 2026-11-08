#pragma once

#include <QTableView>
#include <QPoint>
#include <QItemSelection>
#include <QRubberBand>

class ArchiveTableView : public QTableView {
    Q_OBJECT

public:
    explicit ArchiveTableView(QWidget *parent = nullptr);
    ~ArchiveTableView() override = default;

signals:
    void dragExtractionRequested(const QModelIndexList &selectedRows);
    void filesDropped(const QStringList &filePaths);

protected:
    void mousePressEvent(QMouseEvent *event) override;
    void mouseMoveEvent(QMouseEvent *event) override;
    void mouseReleaseEvent(QMouseEvent *event) override;
    void mouseDoubleClickEvent(QMouseEvent *event) override;
    void paintEvent(QPaintEvent *event) override;
    void dragEnterEvent(QDragEnterEvent *event) override;
    void dragMoveEvent(QDragMoveEvent *event) override;
    void dropEvent(QDropEvent *event) override;

private:
    void updateRubberBandSelection(const QRect &rect);

    QPixmap m_watermarkPixmap;
    QPoint m_dragStartPos;
    QPoint m_currentDragPos;
    bool m_isRubberBanding = false;
    bool m_isDraggingItems = false;
    QModelIndex m_dragItemIndex;
    QModelIndex m_pendingSingleSelectIndex;
    QRubberBand *m_rubberBand = nullptr;
    QItemSelection m_initialSelection;
    Qt::KeyboardModifiers m_modifiers = Qt::NoModifier;
};
