import React, { useEffect, useState } from 'react';
import { amenityApi, type WorkspaceTypeAmenitiesDto } from '../api/loyaltyApi';
import { AmenityIcon } from './AmenityIcon';

// Amenities change rarely; share one request across every panel opened in this page session.
let cachedRequest: Promise<WorkspaceTypeAmenitiesDto[]> | null = null;
const loadAmenities = () => {
  if (!cachedRequest) {
    cachedRequest = amenityApi.listPublic().catch((err) => {
      cachedRequest = null; // allow a retry next time
      throw err;
    });
  }
  return cachedRequest;
};

/** Amenity chips for a workspace type, matched by id or (for mock data) by type code. */
export const WorkspaceAmenities: React.FC<{ workspaceTypeId?: string | null; workspaceTypeCode?: string | null }> = ({
  workspaceTypeId,
  workspaceTypeCode,
}) => {
  const [types, setTypes] = useState<WorkspaceTypeAmenitiesDto[] | null>(null);

  useEffect(() => {
    let alive = true;
    loadAmenities()
      .then((data) => alive && setTypes(data))
      .catch(() => alive && setTypes([]));
    return () => { alive = false; };
  }, []);

  const match = types?.find((t) =>
    (workspaceTypeId && t.workspaceTypeId === workspaceTypeId)
    || (workspaceTypeCode && t.workspaceTypeCode === workspaceTypeCode));

  if (!match || match.amenities.length === 0) return null;

  return (
    <div className="rounded-2xl bg-[var(--bg-surface-hover)] p-3">
      <p className="text-xs text-[var(--text-tertiary)] mb-2">Tiện ích</p>
      <div className="flex flex-wrap gap-1.5">
        {match.amenities.map((a) => (
          <span key={a.amenityId} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium">
            <AmenityIcon name={a.iconName} className="h-3.5 w-3.5 text-primary" />
            {a.name}{a.quantity > 1 ? ` ×${a.quantity}` : ''}
          </span>
        ))}
      </div>
    </div>
  );
};
