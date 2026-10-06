const { db } = require('../models/Database');

/**
 * RBAC Service (Owner: Chetana V Iyer | PES1UG24CS130)
 * Feature 2 — Workspace & Team Collaboration Management
 * REQ-2.2, REQ-2.3 | ARC-TEAM | DSN-02
 */
class RbacService {
  /**
   * Check if user is a member of workspace
   */
  isMember(workspaceId, userId) {
    const membership = db.getMembership(workspaceId, userId);
    return Boolean(membership);
  }

  /**
   * Get user's role in a workspace
   */
  getUserRole(workspaceId, userId) {
    const membership = db.getMembership(workspaceId, userId);
    return membership ? membership.role : null;
  }

  /**
   * REQ-2.3 (Access Enforcement):
   * Restricts destructive mutations (settings update, deletion, member revocation) strictly to Admin.
   */
  canPerformDestructiveAction(workspaceId, userId) {
    const role = this.getUserRole(workspaceId, userId);
    return role === 'Admin';
  }

  /**
   * Check if user can contribute (Admin or Member)
   */
  canContribute(workspaceId, userId) {
    const role = this.getUserRole(workspaceId, userId);
    return role === 'Admin' || role === 'Member';
  }

  /**
   * Check if user can view (Admin, Member, or Viewer)
   */
  canView(workspaceId, userId) {
    const role = this.getUserRole(workspaceId, userId);
    return Boolean(role);
  }
}

module.exports = new RbacService();
