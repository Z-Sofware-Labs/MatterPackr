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
                if (!m_rubberBand) {
                    m_rubberBand = new QRubberBand(QRubberBand::Rectangle, viewport());
                }
                if (!(m_modifiers & Qt::ControlModifier)) {
                    m_initialSelection.clear();
                }
            }
        }

        if (m_isRubberBanding) {
            m_currentDragPos = event->pos();
            QRect rect = QRect(m_dragStartPos, m_currentDragPos).normalized();

            if (m_rubberBand) {
                m_rubberBand->setGeometry(rect);
                m_rubberBand->show();
            }

            // Smooth auto-scroll when dragging near viewport boundaries
            if (event->pos().y() < 15) {
                verticalScrollBar()->setValue(verticalScrollBar()->value() - 15);
            } else if (event->pos().y() > viewport()->height() - 15) {
                verticalScrollBar()->setValue(verticalScrollBar()->value() + 15);
            }

            updateRubberBandSelection(rect);
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
            if (m_rubberBand) {
                m_rubberBand->hide();
            }
            event->accept();
            return;
        }
    }
    QTableView::mouseReleaseEvent(event);
}

void ArchiveTableView::updateRubberBandSelection(const QRect &rect) {
    if (!model() || !selectionModel()) return;

    int totalRows = model()->rowCount();
    if (totalRows == 0) return;

    int cols = model()->columnCount();
    if (cols == 0) cols = 1;

    // Fast O(1) row range calculation using rowAt
    int topY = qMax(0, rect.top());
    int botY = qMin(viewport()->height() - 1, rect.bottom());

    int startRow = rowAt(topY);
    if (startRow == -1) {
        startRow = (topY <= 0) ? 0 : totalRows - 1;
    }

    int endRow = rowAt(botY);
    if (endRow == -1) {
        endRow = totalRows - 1;
    }

    if (startRow > endRow) {
        std::swap(startRow, endRow);
    }

    QItemSelection rubberBandSelection;
    QModelIndex leftIdx = model()->index(startRow, 0);
    QModelIndex rightIdx = model()->index(endRow, cols - 1);
    rubberBandSelection.select(leftIdx, rightIdx);

    if (m_modifiers & Qt::ControlModifier) {
        QItemSelection combined = m_initialSelection;
        combined.merge(rubberBandSelection, QItemSelectionModel::Select);
        selectionModel()->select(combined, QItemSelectionModel::ClearAndSelect | QItemSelectionModel::Rows);
    } else {
        selectionModel()->select(rubberBandSelection, QItemSelectionModel::ClearAndSelect | QItemSelectionModel::Rows);
    }
}
