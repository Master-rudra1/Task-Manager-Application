import React, { useState, useEffect } from 'react';

/**
 * Interactive Kanban Board Component
 * Owner: Gagan B Sasalatti (PES1UG24CS164)
 * Feature 5 — Task Assignment & Kanban Workflow Engine
 * REQ-5.1, REQ-5.2, REQ-5.3 | ARC-KANBAN | DSN-05
 */

const COLUMNS = [
  { id: 'To-Do', label: 'To-Do', color: '#64748b' },
  { id: 'In-Progress', label: 'In Progress', color: '#0284c7' },
  { id: 'Review', label: 'In Review', color: '#eab308' },
  { id: 'Done', label: 'Done', color: '#22c55e' }
];

export default function KanbanBoard({ workspaceId, currentUserId }) {
  const [boardData, setBoardData] = useState({
    'To-Do': [],
    'In-Progress': [],
    'Review': [],
    'Done': []
  });
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBoard();
  }, [workspaceId]);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/workspaces/${workspaceId}/kanban`);
      const json = await res.json();
      if (json.success) {
        setBoardData(json.data);
      }
    } catch (err) {
      console.error('Failed to load Kanban board:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetColumn) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    // Optimistic UI Update (REQ-5.3)
    let sourceCol = null;
    let draggedTask = null;

    Object.keys(boardData).forEach(col => {
      const found = boardData[col].find(t => t.task_id === draggedTaskId);
      if (found) {
        sourceCol = col;
        draggedTask = found;
      }
    });

    if (!sourceCol || sourceCol === targetColumn) {
      setDraggedTaskId(null);
      return;
    }

    const nextBoard = {
      ...boardData,
      [sourceCol]: boardData[sourceCol].filter(t => t.task_id !== draggedTaskId),
      [targetColumn]: [...boardData[targetColumn], { ...draggedTask, status: targetColumn }]
    };
    setBoardData(nextBoard);
    setDraggedTaskId(null);

    // Backend Sync
    try {
      const res = await fetch(`/api/v1/tasks/${draggedTaskId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetColumn, actorId: currentUserId })
      });
      const data = await res.json();
      if (!data.success) {
        // Rollback on failure
        fetchBoard();
      }
    } catch (err) {
      fetchBoard();
    }
  };

  if (loading) {
    return <div className="kanban-loading">Loading Kanban board...</div>;
  }

  return (
    <div className="kanban-container" style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '16px' }}>
      {COLUMNS.map(col => (
        <div
          key={col.id}
          className="kanban-column"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, col.id)}
          style={{
            flex: '1',
            minWidth: '280px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            padding: '12px',
            borderTop: `4px solid ${col.color}`
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{col.label}</h3>
            <span style={{ backgroundColor: '#e2e8f0', borderRadius: '12px', padding: '2px 8px', fontSize: '12px' }}>
              {(boardData[col.id] || []).length}
            </span>
          </div>

          <div className="card-list" style={{ minHeight: '400px' }}>
            {(boardData[col.id] || []).map(task => (
              <div
                key={task.task_id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.task_id)}
                style={{
                  backgroundColor: '#ffffff',
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  cursor: 'grab'
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>{task.title}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                  Priority: <span style={{ fontWeight: '600' }}>{task.priority}</span>
                </div>

                {/* Progress bar */}
                <div style={{ backgroundColor: '#f1f5f9', height: '6px', borderRadius: '3px', marginBottom: '8px' }}>
                  <div
                    style={{
                      backgroundColor: '#3b82f6',
                      height: '100%',
                      borderRadius: '3px',
                      width: `${task.progress_percentage || 0}%`
                    }}
                  />
                </div>

                {/* Avatar indicators (REQ-5.1) */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                  {(task.assignee_avatars || []).map(avatar => (
                    <div
                      key={avatar.user_id}
                      title={avatar.name}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '600'
                      }}
                    >
                      {avatar.initials}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
