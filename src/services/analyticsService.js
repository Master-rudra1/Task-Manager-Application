const { db } = require('../models/Database');

/**
 * Progress Analytics & Reporting Service
 * Owner: Harsh Pandya | PES1UG24CS182
 * Feature 7 — Progress Analytics, Metrics & Exportable Reports
 * REQ-7.1, REQ-7.2 | ARC-RPT | DSN-07
 */
class AnalyticsService {
  /**
   * REQ-7.1 (KPI Dashboard):
   * Calculates Total Tasks, Completed Tasks, Overdue Tasks, and Team Velocity.
   */
  getKPIMetrics(workspaceId, sprintDays = 14) {
    const tasks = db.findTasks(t => !workspaceId || t.workspace_id === workspaceId);
    const now = new Date();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Done').length;

    // Overdue tasks: Due date has passed and status is not 'Done'
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'Done' || !t.due_date) return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(23, 59, 59, 999);
      return dueDate < now;
    }).length;

    // Sprint window completion velocity
    const sprintCutoff = new Date(now.getTime() - sprintDays * 24 * 60 * 60 * 1000);
    const sprintCompleted = tasks.filter(t => {
      if (t.status !== 'Done') return false;
      const updatedDate = new Date(t.updated_at);
      return updatedDate >= sprintCutoff;
    }).length;

    // Velocity = tasks completed per 7 days
    const teamVelocity = sprintDays > 0 ? Number(((sprintCompleted / sprintDays) * 7).toFixed(1)) : 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      overdue_tasks: overdueTasks,
      team_velocity_per_week: teamVelocity,
      completion_rate_percentage: completionRate
    };
  }

  /**
   * REQ-7.2 (Visual Charting):
   * Returns dynamic status distribution and member workload allocation.
   */
  getVisualDistribution(workspaceId) {
    const tasks = db.findTasks(t => !workspaceId || t.workspace_id === workspaceId);

    // Status distribution
    const statusDistribution = {
      'To-Do': 0,
      'In-Progress': 0,
      'Review': 0,
      'Done': 0
    };

    // Member workload allocation
    const memberWorkload = {}; // userId -> { name, assigned_count, completed_count }

    tasks.forEach(t => {
      if (statusDistribution[t.status] !== undefined) {
        statusDistribution[t.status]++;
      }

      const assignees = t.assignees || [];
      assignees.forEach(uid => {
        if (!memberWorkload[uid]) {
          const user = db.getUser(uid);
          memberWorkload[uid] = {
            user_id: uid,
            name: user ? user.full_name : 'Unknown User',
            assigned_count: 0,
            completed_count: 0
          };
        }
        memberWorkload[uid].assigned_count++;
        if (t.status === 'Done') {
          memberWorkload[uid].completed_count++;
        }
      });
    });

    return {
      status_distribution: statusDistribution,
      member_workload: Object.values(memberWorkload)
    };
  }
}

module.exports = new AnalyticsService();
