/**
 * Line icons for each element type: the editor's library and properties panel, the shapes drawn
 * on the floor plan itself, and the plan's badges and hover tooltip.
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

/** The icon for an element type; unknown types fall back to a plain square. */
export const getElementIcon = (type: string): IconType => ICONS[type as ElementType] ?? MdOutlineCropSquare;

export const ElementTypeIcon: React.FC<{ type: string; className?: string }> = ({ type, className = 'h-4 w-4' }) => {
  const Icon = getElementIcon(type);
  return <Icon className={className} aria-hidden="true" />;
};
