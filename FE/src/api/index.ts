/**
 * Central API Service Layer Barrel Export
 * Provides a unified entry point for all API service modules in CoSpace.
 */

// Domain API Services
export * from './addonApi';
export * from './adminApi';
export * from './loyaltyApi';
export * from './refundApi';
export {
  staffApi,
  type CheckinLogDto,
  type BookingWithDetailsDto,
  type BranchTodayBookingDto,
  type MaintenanceResponseDto,
} from './staffApi';

// Re-exports from lib for clean architecture layer access
export {
  bookingApi,
  type BookingCreatePayload,
  type BookingResponse,
} from '../lib/bookingApi';

export {
  chatbotApi,
  type ChatTurn,
  type PendingAction,
  type ChatActionResult,
  type ChatBooking,
} from '../lib/chatbotApi';

export {
  communityApi,
  type CommunityPost,
  type PostType,
} from '../lib/communityApi';

export {
  customerSpaceApi,
  adminBranchApi,
  type BranchResponse,
  type StartingPriceResponse,
  type FloorResponse,
  type WorkspaceResponse,
  type BranchPriceResponse,
  type PublicWorkspaceAvailability,
  type ExtraServiceResponse,
} from '../lib/spaceApi';
