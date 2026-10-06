const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const crypto = require('crypto');
const { createServer } = require('../src/app');
const { db } = require('../src/models/Database');

/**
 * System Integration Test Suite: ST-TASK-01, ST-TASK-02, ST-FILE-01
 * Verifies End-to-End RESTful API flows over HTTP
 * Traces to RTM Table: ST-TASK-01, ST-TASK-02, ST-FILE-01
 */

function request(server, options, body = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(rawData);
        } catch (e) {
          parsed = rawData;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

test('System Integration: End-to-End Task & Subtask Lifecycle', async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));

  const workspaceId = crypto.randomUUID();
  const userId = crypto.randomUUID();

  t.after(() => {
    server.close();
  });

  t.beforeEach(() => {
    db.reset();
  });

  await t.test('ST-TASK-01: Complete Task Lifecycle via HTTP', async () => {
    // 1. Create Task
    const createRes = await request(server, { method: 'POST', path: '/api/v1/tasks' }, {
      workspace_id: workspaceId,
      created_by: userId,
      title: 'Full Stack Sprint Integration',
      description: 'End-to-end testing of REST endpoints',
      priority: 'High',
      status: 'To-Do'
    });
    assert.equal(createRes.statusCode, 201);
    const taskId = createRes.data.data.task_id;
    assert.ok(taskId);

    // 2. Fetch Task
    const getRes = await request(server, { method: 'GET', path: `/api/v1/tasks/${taskId}` });
    assert.equal(getRes.statusCode, 200);
    assert.equal(getRes.data.data.title, 'Full Stack Sprint Integration');

    // 3. Update Task
    const updateRes = await request(server, { method: 'PUT', path: `/api/v1/tasks/${taskId}` }, {
      status: 'In-Progress',
      priority: 'Medium'
    });
    assert.equal(updateRes.statusCode, 200);
    assert.equal(updateRes.data.data.status, 'In-Progress');
    assert.equal(updateRes.data.data.priority, 'Medium');

    // 4. Archive Task (Soft Delete)
    const archiveRes = await request(server, { method: 'POST', path: `/api/v1/tasks/${taskId}/archive` });
    assert.equal(archiveRes.statusCode, 200);

    // Task not found on active query
    const afterArchiveRes = await request(server, { method: 'GET', path: `/api/v1/tasks/${taskId}` });
    assert.equal(afterArchiveRes.statusCode, 404);

    // Task accessible with includeArchived=true
    const includeArchivedRes = await request(server, { method: 'GET', path: `/api/v1/tasks/${taskId}?includeArchived=true` });
    assert.equal(includeArchivedRes.statusCode, 200);
    assert.equal(includeArchivedRes.data.data.is_archived, true);
  });

  await t.test('ST-TASK-02: Subtask Checklist & Progress Tracking via HTTP', async () => {
    // Create Task
    const taskRes = await request(server, { method: 'POST', path: '/api/v1/tasks' }, {
      workspace_id: workspaceId,
      created_by: userId,
      title: 'Feature Module Verification',
      priority: 'Medium'
    });
    const taskId = taskRes.data.data.task_id;

    // Add 2 Subtasks
    const sub1Res = await request(server, { method: 'POST', path: `/api/v1/tasks/${taskId}/subtasks` }, {
      title: 'Step 1: Write Unit Tests'
    });
    assert.equal(sub1Res.statusCode, 201);
    const sub1Id = sub1Res.data.data.subtask.subtask_id;

    const sub2Res = await request(server, { method: 'POST', path: `/api/v1/tasks/${taskId}/subtasks` }, {
      title: 'Step 2: Deploy to Staging'
    });
    assert.equal(sub2Res.statusCode, 201);
    const sub2Id = sub2Res.data.data.subtask.subtask_id;

    // Check Task Progress (0%)
    let taskCheck = await request(server, { method: 'GET', path: `/api/v1/tasks/${taskId}` });
    assert.equal(taskCheck.data.data.progress_percentage, 0);

    // Toggle Subtask 1 as Completed
    const toggleRes = await request(server, { method: 'PUT', path: `/api/v1/subtasks/${sub1Id}` }, {
      is_completed: true
    });
    assert.equal(toggleRes.statusCode, 200);
    assert.equal(toggleRes.data.data.task_progress_percentage, 50);

    // Verify Task Progress (50%)
    taskCheck = await request(server, { method: 'GET', path: `/api/v1/tasks/${taskId}` });
    assert.equal(taskCheck.data.data.progress_percentage, 50);

    // Toggle Subtask 2 as Completed
    await request(server, { method: 'PUT', path: `/api/v1/subtasks/${sub2Id}` }, {
      is_completed: true
    });

    // Verify Task Progress (100%)
    taskCheck = await request(server, { method: 'GET', path: `/api/v1/tasks/${taskId}` });
    assert.equal(taskCheck.data.data.progress_percentage, 100);
  });

  await t.test('ST-FILE-01: File Attachment Upload and Secure Download via HTTP', async () => {
    // Create Task
    const taskRes = await request(server, { method: 'POST', path: '/api/v1/tasks' }, {
      workspace_id: workspaceId,
      created_by: userId,
      title: 'Design Assets Task',
      priority: 'Low'
    });
    const taskId = taskRes.data.data.task_id;

    // Upload Attachment
    const uploadRes = await request(server, { method: 'POST', path: `/api/v1/tasks/${taskId}/attachments` }, {
      file_name: 'system_architecture.pdf',
      file_size: 1024 * 1024 * 2, // 2MB
      mime_type: 'application/pdf',
      uploaded_by: userId
    });
    assert.equal(uploadRes.statusCode, 201);
    const downloadUrl = uploadRes.data.data.secure_download_url;
    assert.ok(downloadUrl);

    // Verify Download Authorization Endpoint
    const downloadRes = await request(server, { method: 'GET', path: downloadUrl });
    assert.equal(downloadRes.statusCode, 200);
    assert.equal(downloadRes.data.data.file_name, 'system_architecture.pdf');
  });
});
