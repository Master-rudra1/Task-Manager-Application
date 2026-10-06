const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { db } = require('../src/models/Database');
const subtaskController = require('../src/controllers/subtaskController');

/**
 * Unit Test Suite: UT-TASK-02
 * Traces to SRS Requirement: REQ-4.1, REQ-4.2 (Feature 4: Subtasks, Checklists & Progress Calculation)
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

test('UT-TASK-02: Subtasks Checklist & Progress Percentage Calculation', async (t) => {
  const workspaceId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  let parentTaskId;

  t.beforeEach(() => {
    db.reset();
    const task = db.createTask({
      workspace_id: workspaceId,
      created_by: userId,
      title: 'Sprint 1 Core Deliverables',
      priority: 'High'
    });
    parentTaskId = task.task_id;
  });

  await t.test('REQ-4.1: Adds subtask checklist items to task', async () => {
    const req = {
      params: { taskId: parentTaskId },
      body: { title: 'Draft API contracts' }
    };
    const res = mockRes();

    await subtaskController.addSubtask(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.subtask.title, 'Draft API contracts');
    assert.equal(res.body.data.subtask.is_completed, false);
    assert.equal(res.body.data.subtask.order_index, 0);
    assert.equal(res.body.data.task_progress_percentage, 0);
  });

  await t.test('REQ-4.2: Accurately calculates progress percentage upon toggling completion', async () => {
    // Add 4 subtasks
    const s1 = db.createSubtask({ task_id: parentTaskId, title: 'Item 1' });
    const s2 = db.createSubtask({ task_id: parentTaskId, title: 'Item 2' });
    const s3 = db.createSubtask({ task_id: parentTaskId, title: 'Item 3' });
    const s4 = db.createSubtask({ task_id: parentTaskId, title: 'Item 4' });

    // Initial progress = 0%
    assert.equal(db.getTask(parentTaskId).progress_percentage, 0);

    // Complete item 1 -> 1/4 = 25%
    const req1 = {
      params: { subtaskId: s1.subtask_id },
      body: { is_completed: true }
    };
    const res1 = mockRes();
    await subtaskController.updateSubtask(req1, res1);
    assert.equal(res1.body.data.task_progress_percentage, 25);
    assert.equal(db.getTask(parentTaskId).progress_percentage, 25);

    // Complete item 2 -> 2/4 = 50%
    const req2 = {
      params: { subtaskId: s2.subtask_id },
      body: { is_completed: true }
    };
    const res2 = mockRes();
    await subtaskController.updateSubtask(req2, res2);
    assert.equal(res2.body.data.task_progress_percentage, 50);

    // Complete item 3 and 4 -> 4/4 = 100%
    db.updateSubtask(s3.subtask_id, { is_completed: true });
    db.updateSubtask(s4.subtask_id, { is_completed: true });
    assert.equal(db.getTask(parentTaskId).progress_percentage, 100);

    // Uncheck item 1 -> 3/4 = 75%
    const reqUncheck = {
      params: { subtaskId: s1.subtask_id },
      body: { is_completed: false }
    };
    const resUncheck = mockRes();
    await subtaskController.updateSubtask(reqUncheck, resUncheck);
    assert.equal(resUncheck.body.data.task_progress_percentage, 75);
  });

  await t.test('REQ-4.1: Reorders subtask checklist items', async () => {
    const s1 = db.createSubtask({ task_id: parentTaskId, title: 'First' });
    const s2 = db.createSubtask({ task_id: parentTaskId, title: 'Second' });
    const s3 = db.createSubtask({ task_id: parentTaskId, title: 'Third' });

    const req = {
      params: { taskId: parentTaskId },
      body: { orderedSubtaskIds: [s3.subtask_id, s1.subtask_id, s2.subtask_id] }
    };
    const res = mockRes();

    await subtaskController.reorderSubtasks(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data[0].subtask_id, s3.subtask_id);
    assert.equal(res.body.data[0].order_index, 0);
    assert.equal(res.body.data[1].subtask_id, s1.subtask_id);
    assert.equal(res.body.data[1].order_index, 1);
    assert.equal(res.body.data[2].subtask_id, s2.subtask_id);
    assert.equal(res.body.data[2].order_index, 2);
  });

  await t.test('REQ-4.1 & REQ-4.2: Deletes a subtask and dynamically recalculates progress', async () => {
    const s1 = db.createSubtask({ task_id: parentTaskId, title: 'Sub 1', is_completed: true });
    const s2 = db.createSubtask({ task_id: parentTaskId, title: 'Sub 2', is_completed: false });

    // 1 of 2 completed = 50%
    assert.equal(db.getTask(parentTaskId).progress_percentage, 50);

    // Delete uncompleted subtask -> 1 of 1 completed = 100%
    const req = { params: { subtaskId: s2.subtask_id } };
    const res = mockRes();

    await subtaskController.deleteSubtask(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.task_progress_percentage, 100);
    assert.equal(db.getTask(parentTaskId).progress_percentage, 100);
  });
});
