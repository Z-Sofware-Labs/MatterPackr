#pragma once

#include <QTableView>
#include <QPoint>
#include <QItemSelection>
#include <QPainter>

class ArchiveTableView : public QTableView {
    Q_OBJECT

public:
    explicit ArchiveTableView(QWidget *parent = nullptr);
    ~ArchiveTableView() override = default;

protected:
    void mousePressEvent(QMouseEvent *event) override;
    void mouseMoveEvent(QMouseEvent *event) override;
    void mouseReleaseEvent(QMouseEvent *event) override;
    void paintEvent(QPaintEvent *event) override;

private:
    void updateRubberBandSelection(const QRect &rect);

    QPoint m_dragStartPos;
    QPoint m_currentDragPos;
    bool m_isRubberBanding = false;
    QItemSelection m_initialSelection;
    Qt::KeyboardModifiers m_modifiers = Qt::NoModifier;
};
