#include "ArchiveTableView.h"
#include <QApplication>
#include <QMouseEvent>
#include <QScrollBar>
#include <QPainter>

ArchiveTableView::ArchiveTableView(QWidget *parent)
    : QTableView(parent) {
    // Ensure viewport receives mouse moves and paints cleanly
    viewport()->setAttribute(Qt::WA_Hover, true);

    QPixmap raw(":/app.png");
    if (!raw.isNull()) {
        m_watermarkPixmap = raw.scaled(280, 280, Qt::KeepAspectRatio, Qt::SmoothTransformation);
    }
}

void ArchiveTableView::paintEvent(QPaintEvent *event) {
    // Paint lower-right enlarged washed-out watermark on viewport background
    if (!m_watermarkPixmap.isNull()) {
        QPainter p(viewport());
        p.setRenderHint(QPainter::Antialiasing);
        p.setRenderHint(QPainter::SmoothPixmapTransform);
        p.setOpacity(0.06);

        int margin = 16;
        int x = viewport()->width() - m_watermarkPixmap.width() - margin;
        int y = viewport()->height() - m_watermarkPixmap.height() - margin;
        p.drawPixmap(x, y, m_watermarkPixmap);
    }

    QTableView::paintEvent(event);
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

    // Fast vertical span calculation
    int topY = qMax(0, rect.top());
    int botY = qMin(viewport()->height() - 1, rect.bottom());

    if (topY > botY) {
        if (m_modifiers & Qt::ControlModifier) {
            selectionModel()->select(m_initialSelection, QItemSelectionModel::ClearAndSelect | QItemSelectionModel::Rows);
        } else {
            selectionModel()->clearSelection();
        }
        return;
    }

    int startRow = rowAt(topY);
    int endRow = rowAt(botY);

    // If top boundary didn't intersect a row directly, check if dragged above the first row
    if (startRow == -1) {
        if (topY <= 0) {
            startRow = 0;
        } else {
            // Below last item or in gap
            startRow = -1;
        }
    }

    // If bottom boundary didn't hit a row directly, find the nearest previous row that intersects rect
    if (endRow == -1) {
        int lastRowBottom = rowViewportPosition(totalRows - 1) + rowHeight(totalRows - 1);
        if (botY >= lastRowBottom && topY <= lastRowBottom) {
            endRow = totalRows - 1;
        } else {
            // Drag box is entirely in empty space below the last row
            for (int r = totalRows - 1; r >= 0; --r) {
                int rTop = rowViewportPosition(r);
                int rBot = rTop + rowHeight(r);
                if (rTop <= botY && rBot >= topY) {
                    endRow = r;
                    break;
                }
            }
        }
    }

    // Double check startRow intersects rect
    if (startRow != -1 && endRow != -1) {
        if (startRow > endRow) {
            std::swap(startRow, endRow);
        }

        // Verify startRow and endRow actually overlap with [topY, botY]
        while (startRow <= endRow) {
            int rTop = rowViewportPosition(startRow);
            int rBot = rTop + rowHeight(startRow);
            if (rBot >= topY && rTop <= botY) {
                break;
            }
            startRow++;
        }
        while (endRow >= startRow) {
            int rTop = rowViewportPosition(endRow);
            int rBot = rTop + rowHeight(endRow);
            if (rBot >= topY && rTop <= botY) {
                break;
            }
            endRow--;
        }
    }

    // If no row intersects the box, don't select anything
    if (startRow == -1 || endRow == -1 || startRow > endRow) {
        if (m_modifiers & Qt::ControlModifier) {
            selectionModel()->select(m_initialSelection, QItemSelectionModel::ClearAndSelect | QItemSelectionModel::Rows);
        } else {
            selectionModel()->clearSelection();
        }
        return;
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
