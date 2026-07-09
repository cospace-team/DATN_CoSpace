/**
 * ElementLibrary — Left panel showing draggable element types.
 * Users drag items from here onto the canvas to create new elements.
 * Features search filtering, category expanding, and premium item cards.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { FiChevronDown, FiChevronRight, FiSearch, FiSliders } from 'react-icons/fi';
import {
  CATALOG_BY_CATEGORY,
  CATEGORY_LABELS,
  ELEMENT_CATALOG,
} from '../../data/elementCatalog';
import type { ElementCatalogItem } from '../../types/floorPlan';

interface Props {
  onDragStart: (item: ElementCatalogItem) => void;
}

const ElementLibrary: React.FC<Props> = ({ onDragStart }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    workspace: true,
    structure: true,
    furniture: false,
    utility: false,
  });

  const toggle = (cat: string) =>
    setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));

  // Filter elements based on search query
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
    <div className="flex flex-col h-full overflow-hidden bg-card select-none">
      {/* Header */}
      <div className="px-3.5 py-3 border-b border-border bg-muted/20 shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <FiSliders className="h-3.5 w-3.5 text-primary" />
          <span>Thư viện vật tư</span>
        </h3>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-border bg-card shrink-0">
        <div className="relative">
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
          <input
            type="text"
            placeholder="Tìm vật tư..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-muted/60 border border-border/80 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-primary focus:bg-card transition-all"
          />
        </div>
      </div>

      {/* Element List (Scroller) */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
        {filteredCatalog ? (
          // Search results
          <div>
            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Kết quả tìm kiếm ({filteredCatalog.length})
            </div>
            {filteredCatalog.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Không tìm thấy vật tư nào
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {filteredCatalog.map((item) => (
                  <DraggableItem
                    key={item.type}
                    item={item}
                    onDragStart={onDragStart}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Standard Category list
          Object.entries(CATALOG_BY_CATEGORY).map(([category, items]) => (
            <div key={category} className="space-y-1">
              {/* Category header */}
              <button
                onClick={() => toggle(category)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold text-muted-foreground/80 hover:bg-muted/60 hover:text-foreground transition-all duration-150"
              >
                {expanded[category] ? (
                  <FiChevronDown className="h-3.5 w-3.5 text-muted-foreground/65" />
                ) : (
                  <FiChevronRight className="h-3.5 w-3.5 text-muted-foreground/65" />
                )}
                <span className="truncate">{CATEGORY_LABELS[category]}</span>
                <span className="ml-auto text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground/70">
                  {items.length}
                </span>
              </button>

              {/* Items */}
              {expanded[category] && (
                <div className="grid grid-cols-2 gap-1.5 px-1 pt-0.5 pb-1">
                  {items.map((item) => (
                    <DraggableItem
                      key={item.type}
                      item={item}
                      onDragStart={onDragStart}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/* ─── Draggable Item Card ─── */

const DraggableItem: React.FC<{
  item: ElementCatalogItem;
  onDragStart: (item: ElementCatalogItem) => void;
}> = ({ item, onDragStart }) => {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData(
        'application/floor-plan-element',
        JSON.stringify(item)
      );
      e.dataTransfer.effectAllowed = 'copy';
      onDragStart(item);
    },
    [item, onDragStart]
  );

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-border/60 bg-card
        hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm cursor-grab active:cursor-grabbing
        transition-all duration-200 select-none group"
      title={item.label}
    >
      {/* Icon Wrapper */}
      <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-muted/40 group-hover:bg-card border border-border/30 group-hover:border-primary/20 shadow-sm group-hover:scale-105 transition-all duration-200">
        <span className="text-xl leading-none">
          {item.icon}
        </span>
      </div>
      
      {/* Label */}
      <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-foreground text-center leading-tight truncate w-full transition-colors duration-150">
        {item.label}
      </span>
    </div>
  );
};

export default React.memo(ElementLibrary);
