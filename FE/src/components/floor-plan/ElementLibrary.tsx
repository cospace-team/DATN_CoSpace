/**
 * ElementLibrary — Left sidebar panel showing draggable element palette.
 * Redesigned with Pro Max dark glass aesthetics, search filter, item badges,
 * glowing drag handles, and smooth accordions.
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
    <div className="flex flex-col h-full overflow-hidden bg-slate-950/95 border-r border-slate-800 text-slate-200 select-none">
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 shrink-0 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <FiLayers className="h-4 w-4 text-violet-400" />
          <span>Thư viện vật tư</span>
        </h3>
        <span className="text-[10px] font-mono font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full">
          {ELEMENT_CATALOG.length} items
        </span>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950 shrink-0">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-3.5 w-3.5" />
          <input
            type="text"
            placeholder="Tìm vật tư (VD: Bàn, Tường...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
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
            <div className="px-1 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Kết quả tìm kiếm</span>
              <span className="font-mono text-violet-400">({filteredCatalog.length})</span>
            </div>
            {filteredCatalog.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500 space-y-1">
                <p>Không tìm thấy vật tư nào</p>
                <p className="text-[10px] text-slate-600">Thử từ khóa khác như "bàn", "tường", "phòng"...</p>
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
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-900/80 hover:text-slate-200 transition-all duration-150 group"
              >
                {expanded[category] ? (
                  <FiChevronDown className="h-3.5 w-3.5 text-slate-500 group-hover:text-violet-400" />
                ) : (
                  <FiChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-violet-400" />
                )}
                <span className="truncate">{CATEGORY_LABELS[category]}</span>
                <span className="ml-auto text-[10px] font-mono bg-slate-900 px-2 py-0.5 rounded-md text-slate-400 border border-slate-800">
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
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 text-[10px] text-slate-500 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-violet-500 shrink-0 animate-ping" />
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
      className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border border-slate-800/90 bg-slate-900/50
        hover:border-violet-500/50 hover:bg-slate-900 hover:shadow-lg hover:shadow-violet-500/10 cursor-grab active:cursor-grabbing
        transition-all duration-200 select-none group relative overflow-hidden"
      title={item.label}
    >
      {/* Visual Accent Bar */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-violet-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Icon Container */}
      <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-950/80 group-hover:bg-violet-950/30 border border-slate-800 group-hover:border-violet-500/30 shadow-inner group-hover:scale-110 transition-all duration-200">
        <span className="text-xl leading-none">
          {item.icon}
        </span>
      </div>
      
      {/* Label */}
      <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-100 text-center leading-tight truncate w-full transition-colors duration-150">
        {item.label}
      </span>
    </div>
  );
};

export default React.memo(ElementLibrary);
