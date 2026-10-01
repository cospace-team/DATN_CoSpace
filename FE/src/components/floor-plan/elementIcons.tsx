/**
 * Line icons for each element type, used in the editor's library and properties panel.
 * The emoji in ELEMENT_CATALOG stay for the drawing itself, where they act as map glyphs.
 */

import React from 'react';
import type { IconType } from 'react-icons';
import {
  MdOutlineDesk,
  MdOutlineChair,
  MdOutlineAccessibilityNew,
  MdOutlineMeetingRoom,
  MdOutlineBusiness,
  MdOutlinePhoneInTalk,
  MdOutlineCelebration,
  MdOutlineDashboardCustomize,
  MdOutlineHorizontalRule,
  MdOutlineDoorFront,
  MdOutlineWindow,
  MdOutlineViewColumn,
  MdOutlineWeekend,
  MdOutlineSupportAgent,
  MdOutlineLocalFlorist,
  MdOutlineWc,
  MdOutlineLocalCafe,
  MdOutlineStairs,
  MdOutlineElevator,
  MdOutlineLabel,
  MdOutlineCropSquare,
} from 'react-icons/md';
import type { ElementType } from '../../types/floorPlan';

const ICONS: Partial<Record<ElementType, IconType>> = {
  desk: MdOutlineDesk,
  chair: MdOutlineChair,
  standing_desk: MdOutlineAccessibilityNew,
  meeting_room: MdOutlineMeetingRoom,
  private_office: MdOutlineBusiness,
  phone_booth: MdOutlinePhoneInTalk,
  event_space: MdOutlineCelebration,
  custom_workspace: MdOutlineDashboardCustomize,
  wall: MdOutlineHorizontalRule,
  door: MdOutlineDoorFront,
  window: MdOutlineWindow,
  pillar: MdOutlineViewColumn,
  lounge: MdOutlineWeekend,
  reception: MdOutlineSupportAgent,
  plant: MdOutlineLocalFlorist,
  restroom: MdOutlineWc,
  kitchen: MdOutlineLocalCafe,
  staircase: MdOutlineStairs,
  elevator: MdOutlineElevator,
  label: MdOutlineLabel,
};

export const ElementTypeIcon: React.FC<{ type: string; className?: string }> = ({ type, className = 'h-4 w-4' }) => {
  const Icon = ICONS[type as ElementType] ?? MdOutlineCropSquare;
  return <Icon className={className} aria-hidden="true" />;
};
