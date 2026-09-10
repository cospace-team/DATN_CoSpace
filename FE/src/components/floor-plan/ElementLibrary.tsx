/**
 * ElementLibrary — Left sidebar panel showing draggable element palette.
 * Theme-aware (light/dark) glass panel with search filter, item badges,
 * and smooth accordions, matching the rest of the app's design system.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { FiChevronDown, FiChevronRight, FiSearch, FiLayers, FiX } from 'react-icons/fi';
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

  const toggleCategory = (cat: string) =>
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
    <div className="flex flex-col h-full overflow-hidden bg-card border-r border-border text-foreground select-none">

      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/40 shrink-0 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <FiLayers className="h-4 w-4 text-primary" />
          <span>Thư viện vật tư</span>
        </h3>
        <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
          {ELEMENT_CATALOG.length} items
        </span>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-border bg-card shrink-0">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
          <input
            type="text"
            placeholder="Tìm vật tư (VD: Bàn, Tường...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-muted/40 border border-border rounded-xl pl-9 pr-8 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <FiX className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Element Palette Scroller */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {filteredCatalog ? (
          // Search results view
          <div>
            <div className="px-1 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Kết quả tìm kiếm</span>
              <span className="font-mono text-primary">({filteredCatalog.length})</span>
            </div>
            {filteredCatalog.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground space-y-1">
                <p>Không tìm thấy vật tư nào</p>
                <p className="text-[10px] opacity-70">Thử từ khóa khác như "bàn", "tường", "phòng"...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
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
          // Categorized view
          Object.entries(CATALOG_BY_CATEGORY).map(([category, items]) => (
            <div key={category} className="space-y-1.5">
              {/* Category Accordion Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150 group"
              >
                {expanded[category] ? (
                  <FiChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                ) : (
                  <FiChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                )}
                <span className="truncate">{CATEGORY_LABELS[category]}</span>
                <span className="ml-auto text-[10px] font-mono bg-muted px-2 py-0.5 rounded-md text-muted-foreground border border-border">
                  {items.length}
                </span>
              </button>

              {/* Items Grid */}
              {expanded[category] && (
                <div className="grid grid-cols-2 gap-2 px-1 pt-0.5 pb-1">
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

      {/* Helper Footer */}
      <div className="p-3 border-t border-border bg-muted/20 text-[10px] text-muted-foreground flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-primary shrink-0 animate-ping" />
        <span>Kéo thả vật tư lên canvas để vẽ layout</span>
      </div>
    </div>
  );
};

/* ── Draggable Item Card ── */

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
      className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border border-border bg-muted/30
        hover:border-primary/50 hover:bg-muted hover:shadow-lg hover:shadow-primary/10 cursor-grab active:cursor-grabbing
        transition-all duration-200 select-none group relative overflow-hidden"
      title={item.label}
    >
      {/* Visual Accent Bar */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Icon Container */}
      <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-background/70 group-hover:bg-primary/10 border border-border group-hover:border-primary/30 shadow-inner group-hover:scale-110 transition-all duration-200">
        <span className="text-xl leading-none">
          {item.icon}
        </span>
      </div>

      {/* Label */}
      <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground text-center leading-tight truncate w-full transition-colors duration-150">
        {item.label}
      </span>
    </div>
  );
};

export default React.memo(ElementLibrary);
