const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { db } = require('../src/models/Database');
const taskController = require('../src/controllers/taskController');

/**
 * Unit Test Suite: UT-TASK-01
 * Traces to SRS Requirement: REQ-3.1, REQ-3.2, REQ-3.3 (Feature 3: Task Lifecycle & Core CRUD Operations)
 * Owner: Dhadhal Rudra (PES1UG24CS146)
 */

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

test('UT-TASK-01: Task Lifecycle & Core CRUD Operations', async (t) => {
  const workspaceId = crypto.randomUUID();
  const userId = crypto.randomUUID();

  t.beforeEach(() => {
    db.reset();
  });

  await t.test('REQ-3.1: Successfully creates a task with valid attributes', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const req = {
      body: {
        workspace_id: workspaceId,
        created_by: userId,
        title: 'Implement Database Migrations',
        description: 'Set up Prisma ORM migration scripts for PostgreSQL.',
        priority: 'High',
        status: 'To-Do',
        due_date: futureDate.toISOString().split('T')[0],
        tags: ['backend', 'database']
      }
    };
    const res = mockRes();

    await taskController.createTask(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.title, 'Implement Database Migrations');
    assert.equal(res.body.data.priority, 'High');
    assert.equal(res.body.data.status, 'To-Do');
    assert.ok(res.body.data.task_id);
    assert.equal(res.body.data.is_archived, false);
    assert.equal(res.body.data.progress_percentage, 0);
  });

  await t.test('REQ-3.1: Fails to create task when mandatory fields are missing', async () => {
    const req = {
      body: {
        workspace_id: workspaceId
        // Missing created_by, title, priority
      }
    };
    const res = mockRes();

    await taskController.createTask(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.details.length >= 3);
  });

  await t.test('REQ-3.1 / Business Rule 3: Rejects task creation with past due date', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    const req = {
      body: {
        workspace_id: workspaceId,
        created_by: userId,
        title: 'Outdated Task',
        priority: 'Medium',
        due_date: pastDate.toISOString().split('T')[0]
      }
    };
    const res = mockRes();

    await taskController.createTask(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.details.some(err => err.includes('Business Rule 3 Violation')));
  });

  await t.test('REQ-3.2: Updates task parameters and dynamically updates updated_at timestamp', async () => {
    const createdTask = db.createTask({
      workspace_id: workspaceId,
      created_by: userId,
      title: 'Initial Title',
      priority: 'Low',
      status: 'To-Do'
    });

    const initialUpdatedAt = createdTask.updated_at;

    // Wait slightly to ensure timestamp increment
    await new Promise((resolve) => setTimeout(resolve, 10));

    const req = {
      params: { taskId: createdTask.task_id },
      body: {
        title: 'Updated Functional Title',
        priority: 'High',
        status: 'In-Progress'
      }
    };
    const res = mockRes();

    await taskController.updateTask(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.title, 'Updated Functional Title');
    assert.equal(res.body.data.priority, 'High');
    assert.equal(res.body.data.status, 'In-Progress');
    assert.notEqual(res.body.data.updated_at, initialUpdatedAt);
  });

  await t.test('REQ-3.3: Soft-delete (archiving) task cascades to child subtasks atomically', async () => {
    const task = db.createTask({
      workspace_id: workspaceId,
      created_by: userId,
      title: 'Parent Task for Archival',
      priority: 'Medium'
    });

    const sub1 = db.createSubtask({ task_id: task.task_id, title: 'Child Subtask 1' });
    const sub2 = db.createSubtask({ task_id: task.task_id, title: 'Child Subtask 2' });

    const req = { params: { taskId: task.task_id } };
    const res = mockRes();

    await taskController.archiveTask(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);

    // Verify task is soft deleted
    const taskInDb = db.getTask(task.task_id, true);
    assert.equal(taskInDb.is_archived, true);
    assert.ok(taskInDb.deleted_at);

    // Verify subtasks are cascaded atomically
    const sub1InDb = db.subtasks.get(sub1.subtask_id);
    const sub2InDb = db.subtasks.get(sub2.subtask_id);
    assert.equal(sub1InDb.is_archived, true);
    assert.equal(sub2InDb.is_archived, true);
  });

  await t.test('REQ-3.3 & REQ-NFR-3: Permanent deletion requires explicit confirmation and cascades atomically', async () => {
    const task = db.createTask({
      workspace_id: workspaceId,
      created_by: userId,
      title: 'Permanent Deletion Target',
      priority: 'Low'
    });

    const sub = db.createSubtask({ task_id: task.task_id, title: 'Subtask to be removed' });

    // Attempt without confirmation
    const reqWithoutConfirm = {
      params: { taskId: task.task_id },
      body: { confirm: false }
    };
    const resWithoutConfirm = mockRes();

    await taskController.deleteTaskPermanently(reqWithoutConfirm, resWithoutConfirm);
    assert.equal(resWithoutConfirm.statusCode, 400);
    assert.ok(db.getTask(task.task_id)); // Task still exists

    // Attempt with explicit confirmation
    const reqWithConfirm = {
      params: { taskId: task.task_id },
      body: { confirm: true }
    };
    const resWithConfirm = mockRes();

    await taskController.deleteTaskPermanently(reqWithConfirm, resWithConfirm);
    assert.equal(resWithConfirm.statusCode, 200);
    assert.equal(db.getTask(task.task_id, true), null);
    assert.equal(db.subtasks.get(sub.subtask_id), undefined);
  });
});
