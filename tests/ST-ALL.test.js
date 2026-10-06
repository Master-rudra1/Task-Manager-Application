const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { createServer } = require('../src/app');
const { db } = require('../src/models/Database');

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
      res.on('data', chunk => { rawData += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(rawData); } catch (e) { parsed = rawData; }
        resolve({ statusCode: res.statusCode, headers: res.headers, data: parsed });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

test('Comprehensive System Integration (ST-AUTH, ST-WS, ST-TASK, ST-KB, ST-SRCH, ST-RPT, ST-NOTIF)', async (t) => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, resolve));

  t.after(() => {
    server.close();
  });

  t.beforeEach(() => {
    db.reset();
  });

  await t.test('Full End-to-End Collaborative Agile Workflow across all 4 Members Modules', async () => {
    // 1. Chetana (Feature Set A): Register & Auth
    const regRes = await request(server, { method: 'POST', path: '/api/v1/auth/register' }, {
      full_name: 'Chetana Admin',
      email: 'chetana@pes.edu',
      password: 'AdminPassword#2026'
    });
    assert.equal(regRes.statusCode, 201);
    const token = regRes.data.data.token;
    const adminId = regRes.data.data.user_id;

    // Create Workspace
    const wsRes = await request(server, {
      method: 'POST',
      path: '/api/v1/workspaces',
      headers: { Authorization: `Bearer ${token}` }
    }, {
      title: 'Full Team Agile Workspace',
      description: 'PES University Semester 5 Project'
    });
    assert.equal(wsRes.statusCode, 201);
    const workspaceId = wsRes.data.data.workspace_id;

    // Invite Rudra as Member
    const inviteRes = await request(server, {
      method: 'POST',
      path: `/api/v1/workspaces/${workspaceId}/invite`,
      headers: { Authorization: `Bearer ${token}` }
    }, {
      email: 'rudra@pes.edu',
      role: 'Member'
    });
    assert.equal(inviteRes.statusCode, 200);
    const rudraId = inviteRes.data.data.user_id;

    // 2. Rudra (Feature Set B): Create Task, Subtasks & Upload File
    const taskRes = await request(server, {
      method: 'POST',
      path: '/api/v1/tasks',
      headers: { Authorization: `Bearer ${token}` }
    }, {
      workspace_id: workspaceId,
      title: 'Setup Production Cluster',
      description: 'Provision AWS Kubernetes infrastructure',
      priority: 'High',
      status: 'To-Do',
      created_by: adminId,
      assignees: [rudraId]
    });
    assert.equal(taskRes.statusCode, 201);
    const taskId = taskRes.data.data.task_id;

    // Add subtasks
    const subRes = await request(server, {
      method: 'POST',
      path: `/api/v1/tasks/${taskId}/subtasks`
    }, { title: 'Configure VPC & Subnets' });
    assert.equal(subRes.statusCode, 201);

    // Upload attachment
    const attachRes = await request(server, {
      method: 'POST',
      path: `/api/v1/tasks/${taskId}/attachments`
    }, {
      file_name: 'cluster_spec.pdf',
      file_size: 1024 * 500,
      mime_type: 'application/pdf',
      uploaded_by: rudraId
    });
    assert.equal(attachRes.statusCode, 201);

    // 3. Gagan (Feature Set C): Kanban Board & Drag-Drop State Movement
    const kanbanRes = await request(server, {
      method: 'GET',
      path: `/api/v1/workspaces/${workspaceId}/kanban`
    });
    assert.equal(kanbanRes.statusCode, 200);
    assert.equal(kanbanRes.data.data['To-Do'].length, 1);

    // Move task from To-Do to In-Progress
    const moveRes = await request(server, {
      method: 'POST',
      path: `/api/v1/tasks/${taskId}/move`
    }, { targetColumn: 'In-Progress', actorId: rudraId });
    assert.equal(moveRes.statusCode, 200);

    // Search query
    const searchRes = await request(server, {
      method: 'GET',
      path: `/api/v1/search/tasks?workspace_id=${workspaceId}&q=Cluster`
    });
    assert.equal(searchRes.statusCode, 200);
    assert.equal(searchRes.data.total, 1);

    // 4. Harsh (Feature Set D): Analytics, Notifications & Audit Log
    const kpiRes = await request(server, {
      method: 'GET',
      path: `/api/v1/workspaces/${workspaceId}/analytics/kpi`
    });
    assert.equal(kpiRes.statusCode, 200);
    assert.equal(kpiRes.data.data.total_tasks, 1);

    // Verify Audit log captured events
    const auditRes = await request(server, {
      method: 'GET',
      path: `/api/v1/workspaces/${workspaceId}/audit-logs`
    });
    assert.equal(auditRes.statusCode, 200);
    assert.ok(auditRes.data.count >= 3); // WORKSPACE_CREATED, MEMBER_INVITED, TASK_CREATED, KANBAN_STATUS_TRANSITION
  });
});
