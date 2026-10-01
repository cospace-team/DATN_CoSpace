/**
 * ElementLibrary — left panel listing the elements that can be placed on the floor plan.
 * Drag an item onto the canvas to place it where it is dropped, or click it to add it in the
 * middle of the visible area.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { FiChevronDown, FiChevronRight, FiSearch, FiX } from 'react-icons/fi';
import {
  CATALOG_BY_CATEGORY,
  CATEGORY_LABELS,
  ELEMENT_CATALOG,
} from '../../data/elementCatalog';
import type { ElementCatalogItem } from '../../types/floorPlan';
import { ElementTypeIcon } from './elementIcons';

interface Props {
  onDragStart: (item: ElementCatalogItem) => void;
  /** Adds the element without dragging (click or Enter). */
  onAdd: (item: ElementCatalogItem) => void;
}

const ElementLibrary: React.FC<Props> = ({ onDragStart, onAdd }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    workspace: true,
    structure: true,
    furniture: true,
    utility: true,
  });

  const toggleCategory = (cat: string) =>
    setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));

  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase().trim();
    return ELEMENT_CATALOG.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card text-foreground select-none">
      <div className="px-4 pt-4 pb-3 shrink-0 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Thêm phần tử</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Kéo vào sơ đồ hoặc bấm để thêm vào giữa.</p>
        </div>
        <div className="relative">
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
          <input
            type="text"
            placeholder="Tìm phần tử…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 bg-background border border-input rounded-md pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            aria-label="Tìm phần tử"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Xóa tìm kiếm"
            >
              <FiX className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 custom-scrollbar">
        {filteredCatalog ? (
          filteredCatalog.length === 0 ? (
            <p className="px-2 py-8 text-center text-xs text-muted-foreground">
              Không có phần tử nào khớp “{searchQuery.trim()}”.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filteredCatalog.map((item) => (
                <LibraryItem key={item.type} item={item} onDragStart={onDragStart} onAdd={onAdd} />
              ))}
            </ul>
          )
        ) : (
          Object.entries(CATALOG_BY_CATEGORY).map(([category, items]) => (
            <section key={category} className="mb-2">
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                aria-expanded={!!expanded[category]}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {expanded[category] ? <FiChevronDown className="h-3.5 w-3.5" /> : <FiChevronRight className="h-3.5 w-3.5" />}
                <span>{CATEGORY_LABELS[category]}</span>
                <span className="ml-auto tabular-nums">{items.length}</span>
              </button>
              {expanded[category] && (
                <ul className="space-y-0.5">
                  {items.map((item) => (
                    <LibraryItem key={item.type} item={item} onDragStart={onDragStart} onAdd={onAdd} />
                  ))}
                </ul>
              )}
            </section>
          ))
        )}
      </div>
    </div>
  );
};

/* ── One draggable / clickable row ── */

const LibraryItem: React.FC<{
  item: ElementCatalogItem;
  onDragStart: (item: ElementCatalogItem) => void;
  onAdd: (item: ElementCatalogItem) => void;
}> = ({ item, onDragStart, onAdd }) => {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('application/floor-plan-element', JSON.stringify(item));
      e.dataTransfer.effectAllowed = 'copy';
      onDragStart(item);
    },
    [item, onDragStart]
  );

  return (
    <li>
      <button
        type="button"
        draggable
        onDragStart={handleDragStart}
        onClick={() => onAdd(item)}
        title={`Thêm ${item.label.toLowerCase()}`}
        className="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground"
          // Tinted with the colour the element is drawn in, so the list matches the plan.
          style={item.defaultStroke && item.defaultStroke !== 'transparent' ? { borderColor: item.defaultStroke, color: item.defaultStroke } : undefined}
        >
          <ElementTypeIcon type={item.type} className="h-4 w-4" />
        </span>
        <span className="truncate">{item.label}</span>
      </button>
    </li>
  );
};

export default React.memo(ElementLibrary);
