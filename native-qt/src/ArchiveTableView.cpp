#include "ArchiveTableView.h"
#include <QApplication>
#include <QMouseEvent>
#include <QScrollBar>

ArchiveTableView::ArchiveTableView(QWidget *parent)
    : QTableView(parent) {}

ArchiveTableView::~ArchiveTableView() {
    if (m_rubberBand) {
        delete m_rubberBand;
        m_rubberBand = nullptr;
    }
}

void ArchiveTableView::mousePressEvent(QMouseEvent *event) {
    if (event->button() == Qt::LeftButton) {
        m_dragStartPos = event->pos();
        m_isRubberBanding = false;
        m_modifiers = event->modifiers();
        if (selectionModel()) {
            m_initialSelection = selectionModel()->selection();
        } else {
            m_initialSelection.clear();
        }

        QModelIndex index = indexAt(event->pos());
        if (!index.isValid()) {
            // Clicked on empty background of table
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
                    m_rubberBand->setAttribute(Qt::WA_TransparentForMouseEvents);
                    m_rubberBand->setStyleSheet(
                        "QRubberBand {"
                        "  background-color: rgba(59, 130, 246, 0.25);"
                        "  border: 1px solid #3b82f6;"
                        "}"
                    );
                }
                m_rubberBand->setGeometry(QRect(m_dragStartPos, QSize()));
                m_rubberBand->show();

                if (!(m_modifiers & Qt::ControlModifier)) {
                    m_initialSelection.clear();
                }
            }
        }

        if (m_isRubberBanding) {
            QRect rect = QRect(m_dragStartPos, event->pos()).normalized();
            if (m_rubberBand) {
                m_rubberBand->setGeometry(rect);
            }

            // Smooth auto-scroll when dragging near viewport top/bottom
            if (event->pos().y() < 12) {
                verticalScrollBar()->setValue(verticalScrollBar()->value() - 16);
            } else if (event->pos().y() > viewport()->height() - 12) {
                verticalScrollBar()->setValue(verticalScrollBar()->value() + 16);
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

    int numRows = model()->rowCount();
    if (numRows == 0) return;

    int cols = model()->columnCount();
    if (cols == 0) cols = 1;

    QItemSelection rubberBandSelection;
    int maxBottom = qMax(viewport()->height(), rect.bottom());

    for (int r = 0; r < numRows; ++r) {
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
