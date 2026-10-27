#include "ArchiveTableView.h"
#include <QApplication>
#include <QMouseEvent>
#include <QScrollBar>
#include <QPainter>

ArchiveTableView::ArchiveTableView(QWidget *parent)
    : QTableView(parent) {
    // Ensure viewport receives mouse moves and paints cleanly
    viewport()->setAttribute(Qt::WA_Hover, true);
}

void ArchiveTableView::mousePressEvent(QMouseEvent *event) {
    if (event->button() == Qt::LeftButton) {
        m_dragStartPos = event->pos();
        m_currentDragPos = event->pos();
        m_isRubberBanding = false;
        m_modifiers = event->modifiers();

        if (selectionModel()) {
            m_initialSelection = selectionModel()->selection();
        } else {
            m_initialSelection.clear();
        }

        QModelIndex index = indexAt(event->pos());
        if (!index.isValid()) {
            // Clicked on empty space below or beside table items
            if (!(m_modifiers & (Qt::ControlModifier | Qt::ShiftModifier))) {
                clearSelection();
                m_initialSelection.clear();
            }
            event->accept();
            return;
        }
    }
    QTableView::mousePressEvent(event);
}

void ArchiveTableView::mouseMoveEvent(QMouseEvent *event) {
    if (event->buttons() & Qt::LeftButton) {
        if (!m_isRubberBanding) {
            if ((event->pos() - m_dragStartPos).manhattanLength() >= QApplication::startDragDistance()) {
                m_isRubberBanding = true;
                if (!(m_modifiers & Qt::ControlModifier)) {
                    m_initialSelection.clear();
                }
            }
        }

        if (m_isRubberBanding) {
            m_currentDragPos = event->pos();
            QRect rect = QRect(m_dragStartPos, m_currentDragPos).normalized();

            // Smooth auto-scroll when dragging near viewport boundaries
            if (event->pos().y() < 15) {
                verticalScrollBar()->setValue(verticalScrollBar()->value() - 15);
            } else if (event->pos().y() > viewport()->height() - 15) {
                verticalScrollBar()->setValue(verticalScrollBar()->value() + 15);
            }

            updateRubberBandSelection(rect);
            viewport()->update();
            event->accept();
            return;
        }
    }
    QTableView::mouseMoveEvent(event);
}

void ArchiveTableView::mouseReleaseEvent(QMouseEvent *event) {
    if (event->button() == Qt::LeftButton) {
        if (m_isRubberBanding) {
            m_isRubberBanding = false;
            viewport()->update();
            event->accept();
            return;
        }
    }
    QTableView::mouseReleaseEvent(event);
}

void ArchiveTableView::paintEvent(QPaintEvent *event) {
    // 1. Let the default table view render rows, text, icons, and alternating background
    QTableView::paintEvent(event);

    // 2. Render visible marquee drag selection rectangle directly on top of viewport
    if (m_isRubberBanding) {
        QPainter painter(viewport());
        painter.setRenderHint(QPainter::Antialiasing, false);

        QRect rect = QRect(m_dragStartPos, m_currentDragPos).normalized();

        // Fluent / macOS / GNOME native semi-transparent blue fill
        QColor fillColor(0, 120, 215, 60);
        QColor borderColor(0, 120, 215, 230);

        painter.fillRect(rect, fillColor);
        painter.setPen(QPen(borderColor, 1, Qt::SolidLine));
        painter.drawRect(rect);
    }
}

void ArchiveTableView::updateRubberBandSelection(const QRect &rect) {
    if (!model() || !selectionModel()) return;

    int totalRows = model()->rowCount();
    if (totalRows == 0) return;

    int cols = model()->columnCount();
    if (cols == 0) cols = 1;

    QItemSelection rubberBandSelection;
    int maxBottom = qMax(viewport()->height(), rect.bottom());

    for (int r = 0; r < totalRows; ++r) {
        int rY = rowViewportPosition(r);
        int rH = rowHeight(r);

        if (rY + rH < 0) continue;
        if (rY > maxBottom) break;

        QRect rowRect(0, rY, viewport()->width(), rH);
        if (rect.intersects(rowRect)) {
            QModelIndex leftIdx = model()->index(r, 0);
            QModelIndex rightIdx = model()->index(r, cols - 1);
            rubberBandSelection.select(leftIdx, rightIdx);
        }
    }

    if (m_modifiers & Qt::ControlModifier) {
        QItemSelection combined = m_initialSelection;
        combined.merge(rubberBandSelection, QItemSelectionModel::Select);
        selectionModel()->select(combined, QItemSelectionModel::ClearAndSelect | QItemSelectionModel::Rows);
    } else {
        selectionModel()->select(rubberBandSelection, QItemSelectionModel::ClearAndSelect | QItemSelectionModel::Rows);
    }
}
