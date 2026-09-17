import React from 'react';
import BAWorkspacePage from '../branch-admin/BAWorkspacePage';

/**
 * Super Admin Space & Floor Management Page
 * Allows Super Admin to switch between branches and configure floors, floor plans, and workspaces.
 */
const AdminWorkspacePage: React.FC = () => {
  return <BAWorkspacePage isSuperAdminView={true} />;
};

export default AdminWorkspacePage;
