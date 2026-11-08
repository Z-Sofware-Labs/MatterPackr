#include "ArchiveTableView.h"
#include <QApplication>
#include <QDragEnterEvent>
#include <QDragMoveEvent>
#include <QDropEvent>
#include <QMimeData>
#include <QMouseEvent>
#include <QScrollBar>
#include <QPainter>
#include <QUrl>

ArchiveTableView::ArchiveTableView(QWidget *parent)
    : QTableView(parent) {
    // Ensure viewport receives mouse moves and paints cleanly
    viewport()->setAttribute(Qt::WA_Hover, true);
    setAcceptDrops(true);

    QPixmap raw(":/app.png");
    if (!raw.isNull()) {
        QPixmap scaled = raw.scaled(280, 280, Qt::KeepAspectRatio, Qt::SmoothTransformation);
        QPixmap transparent(scaled.size());
        transparent.fill(Qt::transparent);
        QPainter p(&transparent);
        p.setOpacity(0.06);
        p.drawPixmap(0, 0, scaled);
        p.end();
        m_watermarkPixmap = transparent;
    }
}

void ArchiveTableView::paintEvent(QPaintEvent *event) {
    // Paint lower-right enlarged washed-out watermark on viewport background
    if (!m_watermarkPixmap.isNull()) {
        int margin = 16;
        int x = viewport()->width() - m_watermarkPixmap.width() - margin;
        int y = viewport()->height() - m_watermarkPixmap.height() - margin;
        QRect wmRect(x, y, m_watermarkPixmap.width(), m_watermarkPixmap.height());

        // Fast clip test: only draw if watermark intersects the repaint region
        if (event->rect().intersects(wmRect)) {
            QPainter p(viewport());
            p.drawPixmap(x, y, m_watermarkPixmap);
        }
    }

    QTableView::paintEvent(event);
}

void ArchiveTableView::mousePressEvent(QMouseEvent *event) {
    if (event->button() == Qt::LeftButton) {
        m_dragStartPos = event->pos();
        m_currentDragPos = event->pos();
        m_isRubberBanding = false;
        m_isDraggingItems = false;
        m_pendingSingleSelectIndex = QModelIndex();
        m_modifiers = event->modifiers();

        if (selectionModel()) {
            m_initialSelection = selectionModel()->selection();
        } else {
            m_initialSelection.clear();
        }

        QModelIndex index = indexAt(event->pos());
        if (!index.isValid()) {
            int row = rowAt(event->pos().y());
            if (row >= 0 && model()) {
                index = model()->index(row, 0);
            }
        }
        if (index.isValid()) {
            m_dragItemIndex = index;
            bool alreadySelected = false;
            if (selectionModel()) {
                const int clickedRow = index.row();
                const QModelIndexList selIndexes = selectionModel()->selectedIndexes();
                for (const QModelIndex &selIdx : selIndexes) {
                    if (selIdx.row() == clickedRow) {
                        alreadySelected = true;
                        break;
                    }
                }
            }

            if (alreadySelected && !(m_modifiers & (Qt::ControlModifier | Qt::MetaModifier | Qt::ShiftModifier))) {
                // Clicking an already selected item without Ctrl/Cmd/Shift:
                // Defer changing selection to mouseReleaseEvent so dragging multiple items remains possible.
                m_pendingSingleSelectIndex = index;
                event->accept();
                return;
            } else if (!alreadySelected && !(m_modifiers & (Qt::ControlModifier | Qt::MetaModifier | Qt::ShiftModifier))) {
                selectionModel()->select(index, QItemSelectionModel::ClearAndSelect | QItemSelectionModel::Rows);
                setCurrentIndex(index);
                event->accept();
                return;
            }
        } else {
            m_dragItemIndex = QModelIndex();
            // Clicked on empty space strictly below all table items
            if (!(m_modifiers & (Qt::ControlModifier | Qt::MetaModifier | Qt::ShiftModifier))) {
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
        int distance = (event->pos() - m_dragStartPos).manhattanLength();
        int dragThreshold = qMax(14, QApplication::startDragDistance() * 2);
        if (distance >= dragThreshold) {
            if (m_dragItemIndex.isValid() && !m_isRubberBanding) {
                m_pendingSingleSelectIndex = QModelIndex();
                m_isDraggingItems = true;
                QModelIndexList selectedRows;
                if (selectionModel()) {
                    QSet<int> rowSet;
                    const QModelIndexList selectedIndexes = selectionModel()->selectedIndexes();
                    for (const QModelIndex &idx : selectedIndexes) {
                        if (!rowSet.contains(idx.row())) {
                            rowSet.insert(idx.row());
                            selectedRows.append(idx.siblingAtColumn(0));
                        }
                    }
                }
                if (selectedRows.isEmpty() && m_dragItemIndex.isValid()) {
                    selectedRows.append(m_dragItemIndex.siblingAtColumn(0));
                }
                emit dragExtractionRequested(selectedRows);
                m_isDraggingItems = false;
                m_dragItemIndex = QModelIndex();
                event->accept();
                return;
            } else if (!m_dragItemIndex.isValid() && !m_isRubberBanding) {
                m_isRubberBanding = true;
                if (!m_rubberBand) {
                    m_rubberBand = new QRubberBand(QRubberBand::Rectangle, viewport());
                }
                if (!(m_modifiers & (Qt::ControlModifier | Qt::MetaModifier))) {
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
        m_dragItemIndex = QModelIndex();
        m_isDraggingItems = false;
        if (m_isRubberBanding) {
            m_isRubberBanding = false;
            if (m_rubberBand) {
                m_rubberBand->hide();
            }
            event->accept();
            return;
        }
        if (m_pendingSingleSelectIndex.isValid()) {
            if (selectionModel()) {
                selectionModel()->select(m_pendingSingleSelectIndex, QItemSelectionModel::ClearAndSelect | QItemSelectionModel::Rows);
                setCurrentIndex(m_pendingSingleSelectIndex);
            }
            m_pendingSingleSelectIndex = QModelIndex();
            event->accept();
            return;
        }
    }
    QTableView::mouseReleaseEvent(event);
}

void ArchiveTableView::mouseDoubleClickEvent(QMouseEvent *event) {
    if (event->button() == Qt::LeftButton) {
        m_dragItemIndex = QModelIndex();
        m_pendingSingleSelectIndex = QModelIndex();
        m_isDraggingItems = false;

        QModelIndex index = indexAt(event->pos());
        if (!index.isValid()) {
            int row = rowAt(event->pos().y());
            if (row >= 0 && model()) {
                index = model()->index(row, 0);
            }
        }
        if (index.isValid()) {
            emit doubleClicked(index);
            event->accept();
            return;
        }
    }
    QTableView::mouseDoubleClickEvent(event);
}

void ArchiveTableView::dragEnterEvent(QDragEnterEvent *event) {
    if (event->mimeData()->hasUrls()) {
        event->acceptProposedAction();
    } else {
        event->ignore();
    }
}

void ArchiveTableView::dragMoveEvent(QDragMoveEvent *event) {
    if (event->mimeData()->hasUrls()) {
        event->acceptProposedAction();
    } else {
        event->ignore();
    }
}

void ArchiveTableView::dropEvent(QDropEvent *event) {
    if (event->mimeData()->hasUrls()) {
        QStringList paths;
        for (const QUrl &url : event->mimeData()->urls()) {
            if (url.isLocalFile()) {
                paths.append(url.toLocalFile());
            }
        }
        if (!paths.isEmpty()) {
            event->acceptProposedAction();
            emit filesDropped(paths);
            return;
        }
    }
    event->ignore();
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
        if (m_modifiers & (Qt::ControlModifier | Qt::MetaModifier)) {
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
        if (m_modifiers & (Qt::ControlModifier | Qt::MetaModifier)) {
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

    if (m_modifiers & (Qt::ControlModifier | Qt::MetaModifier)) {
        QItemSelection combined = m_initialSelection;
        combined.merge(rubberBandSelection, QItemSelectionModel::Select);
        selectionModel()->select(combined, QItemSelectionModel::ClearAndSelect | QItemSelectionModel::Rows);
    } else {
        selectionModel()->select(rubberBandSelection, QItemSelectionModel::ClearAndSelect | QItemSelectionModel::Rows);
    }
}
