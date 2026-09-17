/**
 * Floor Plan Editor — Type Definitions
 * Shared types used by both the Editor (admin) and Viewer (customer) components.
 */

/* ─── Element Types ─── */

export type ElementType =
  | 'desk'
  | 'standing_desk'
  | 'chair'
  | 'meeting_room'
  | 'private_office'
  | 'phone_booth'
  | 'event_space'
  | 'custom_workspace'
  | 'wall'
  | 'door'
  | 'window'
  | 'lounge'
  | 'reception'
  | 'restroom'
  | 'kitchen'
  | 'plant'
  | 'pillar'
  | 'staircase'
  | 'elevator'
  | 'label'
  | 'zone'
  | 'custom_rect'
  | 'custom_circle';

/* ─── Layout Element ─── */

export interface LayoutElement {
  id: string;
  type: ElementType;

  // Position & Transform
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;

  // Visual
  label: string;
  sublabel?: string;
  fillColor?: string;
  strokeColor?: string;
  opacity: number;
  cornerRadius: number;

  // Workspace link (null for decorative elements)
  workspaceId: string | null;

  // Dynamic properties
  seatCount?: number; // Used by meeting_room and private_office

  // Grouping
  zoneId?: string;
  locked: boolean;
  visible: boolean;
}

/* ─── Floor Layout (stored in DB) ─── */

export interface FloorLayout {
  version: number;
  canvas: {
    width: number;
    height: number;
    gridSize: number;
    backgroundColor: string;
  };
  elements: LayoutElement[];
}

/* ─── Element Catalog ─── */

export interface ElementCatalogItem {
  type: ElementType;
  label: string;
  icon: string;        // emoji
  category: 'workspace' | 'structure' | 'furniture' | 'utility';
  defaultWidth: number;
  defaultHeight: number;
  defaultCornerRadius: number;
  defaultFill: string;
  defaultStroke: string;
  canLinkWorkspace: boolean;
}

/* ─── Editor State ─── */

export type EditorTool = 'select' | 'pan';

export interface EditorState {
  layout: FloorLayout;
  selectedIds: string[];
  hoveredId: string | null;
  tool: EditorTool;
  zoom: number;
  panOffset: { x: number; y: number };
  showGrid: boolean;
  snapToGrid: boolean;
  isDirty: boolean;
}

/* ─── History (Undo/Redo) ─── */

export interface HistoryEntry {
  elements: LayoutElement[];
  label: string;
}
