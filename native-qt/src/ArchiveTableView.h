#pragma once

#include <QTableView>
#include <QRubberBand>
#include <QPoint>
#include <QItemSelection>

class ArchiveTableView : public QTableView {
    Q_OBJECT

public:
    explicit ArchiveTableView(QWidget *parent = nullptr);
    ~ArchiveTableView() override;

protected:
    void mousePressEvent(QMouseEvent *event) override;
    void mouseMoveEvent(QMouseEvent *event) override;
    void mouseReleaseEvent(QMouseEvent *event) override;

private:
    void updateRubberBandSelection(const QRect &rect);

    QRubberBand *m_rubberBand = nullptr;
    QPoint m_dragStartPos;
    bool m_isRubberBanding = false;
    QItemSelection m_initialSelection;
    Qt::KeyboardModifiers m_modifiers = Qt::NoModifier;
};
