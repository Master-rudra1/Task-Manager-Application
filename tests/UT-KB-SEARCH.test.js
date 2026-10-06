const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { db } = require('../src/models/Database');
const taskDragDrop = require('../src/services/taskDragDrop');
const searchService = require('../src/services/searchService');

test('Feature Set C: Workflow Engine & Discovery Services (Gagan B Sasalatti - PES1UG24CS164)', async (t) => {
  let workspaceId;
  let member1, member2, nonMember;

  t.beforeEach(() => {
    db.reset();
    member1 = db.createUser({ email: 'gagan@pes.edu', full_name: 'Gagan Sasalatti', password_hash: 'hash' });
    member2 = db.createUser({ email: 'chetana@pes.edu', full_name: 'Chetana Iyer', password_hash: 'hash' });
    nonMember = db.createUser({ email: 'outsider@other.edu', full_name: 'External User', password_hash: 'hash' });

    const ws = db.createWorkspace({ title: 'Agile Kanban Workspace', owner_id: member1.user_id });
    workspaceId = ws.workspace_id;
    db.addMembership({ workspace_id: workspaceId, user_id: member2.user_id, role: 'Member' });
  });

  await t.test('UT-KB-01: Renders interactive Kanban board with 4 workflow columns and avatars', async () => {
    const t1 = db.createTask({ workspace_id: workspaceId, title: 'Task in To-Do', status: 'To-Do', priority: 'Medium', created_by: member1.user_id, assignees: [member1.user_id] });
    const t2 = db.createTask({ workspace_id: workspaceId, title: 'Task in Progress', status: 'In-Progress', priority: 'High', created_by: member1.user_id, assignees: [member2.user_id] });
    const t3 = db.createTask({ workspace_id: workspaceId, title: 'Task in Review', status: 'Review', priority: 'Low', created_by: member2.user_id });
    const t4 = db.createTask({ workspace_id: workspaceId, title: 'Task in Done', status: 'Done', priority: 'Medium', created_by: member1.user_id });

    const board = taskDragDrop.getKanbanBoard(workspaceId);

    assert.ok(board['To-Do']);
    assert.ok(board['In-Progress']);
    assert.ok(board['Review']);
    assert.ok(board['Done']);

    assert.equal(board['To-Do'].length, 1);
    assert.equal(board['In-Progress'].length, 1);
    assert.equal(board['Review'].length, 1);
    assert.equal(board['Done'].length, 1);

    // Verify avatar hydration (REQ-5.1)
    const cardWithAssignee = board['In-Progress'][0];
    assert.equal(cardWithAssignee.assignee_avatars.length, 1);
    assert.equal(cardWithAssignee.assignee_avatars[0].name, 'Chetana Iyer');
    assert.equal(cardWithAssignee.assignee_avatars[0].initials, 'CI');
  });

  await t.test('UT-KB-02: Collaborator Assignment enforces Business Rule 1 and drag-and-drop state sync', async () => {
    const task = db.createTask({
      workspace_id: workspaceId,
      title: 'Kanban Movement Task',
      status: 'To-Do',
      priority: 'High',
      created_by: member1.user_id
    });

    // Attempt to assign non-member -> Rejection under Business Rule 1
    assert.throws(
      () => {
        taskDragDrop.assignCollaborators(task.task_id, [nonMember.user_id], member1.user_id);
      },
      /Business Rule 1 Violation/
    );

    // Assign valid workspace member -> Success
    const assignedTask = taskDragDrop.assignCollaborators(task.task_id, [member2.user_id], member1.user_id);
    assert.deepEqual(assignedTask.assignees, [member2.user_id]);

    // Drag and drop card from 'To-Do' to 'Done' (REQ-5.3)
    const transition = taskDragDrop.moveCard(task.task_id, 'Done', member2.user_id);
    assert.equal(transition.transitioned, true);
    assert.equal(transition.previous_status, 'To-Do');
    assert.equal(transition.new_status, 'Done');
    assert.equal(db.getTask(task.task_id).status, 'Done');
  });

  await t.test('UT-SRCH-01: Multi-Criteria Full-Text Search, Filtering, and Sorting', async () => {
    db.createTask({
      workspace_id: workspaceId,
      title: 'Implement Database Optimization',
      description: 'Add indexes for PostgreSQL query speed',
      priority: 'High',
      status: 'In-Progress',
      due_date: '2026-10-15',
      created_by: member1.user_id,
      tags: ['database', 'performance']
    });

    db.createTask({
      workspace_id: workspaceId,
      title: 'Design UI Mockups',
      description: 'Figma wireframes for mobile dashboard',
      priority: 'Low',
      status: 'To-Do',
      due_date: '2026-10-25',
      created_by: member1.user_id,
      tags: ['ui', 'design']
    });

    db.createTask({
      workspace_id: workspaceId,
      title: 'Database Security Audit',
      description: 'Sanitize inputs against SQL injection',
      priority: 'Medium',
      status: 'Done',
      due_date: '2026-10-10',
      created_by: member1.user_id,
      tags: ['security', 'database']
    });

    // 1. Full-text search for "database" (REQ-6.1)
    const searchDb = searchService.queryTasks({ workspaceId, queryText: 'database' });
    assert.equal(searchDb.total, 2);
    assert.ok(searchDb.execution_time_ms < 100); // Latency constraint check

    // 2. Multi-attribute filter: priority='High' AND status='In-Progress' (REQ-6.2)
    const filterRes = searchService.queryTasks({ workspaceId, priority: 'High', status: 'In-Progress' });
    assert.equal(filterRes.total, 1);
    assert.equal(filterRes.data[0].title, 'Implement Database Optimization');

    // 3. Sorting by priority descending (High > Medium > Low) (REQ-6.3)
    const sortedPriority = searchService.queryTasks({ workspaceId, sortBy: 'priority', sortOrder: 'desc' });
    assert.equal(sortedPriority.data[0].priority, 'High');
    assert.equal(sortedPriority.data[1].priority, 'Medium');
    assert.equal(sortedPriority.data[2].priority, 'Low');

    // 4. Custom Colored Tags creation (REQ-6.3)
    const newTag = searchService.createTag({ workspaceId, name: 'Frontend', color: '#10b981' });
    assert.equal(newTag.name, 'Frontend');
    assert.equal(newTag.color, '#10b981');
  });
});
