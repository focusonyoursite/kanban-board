'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Board, Column, Task } from '../types';
import TaskModal from '@/components/TaskModal';
import TaskDetailsModal from '@/components/TaskDetailsModal';

export default function KanbanBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<Column | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  useEffect(() => {
    // Fetch initial board data
    const fetchBoard = async () => {
      try {
        const response = await fetch('/api/board');
        const data = await response.json();
        setBoard(data);
      } catch (error) {
        console.error('Failed to fetch board:', error);
      }
    };

    fetchBoard();
  }, []);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    console.log('Drag ended:', { source, destination });

    // If dropped outside a droppable or in the same position, do nothing
    if (!destination || !board) {
      console.log('No destination or board not loaded, cancelling drag');
      return;
    }

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      console.log('Dropped in same position, no action needed');
      return;
    }

    // Create a copy of the board to modify
    const newBoard = JSON.parse(JSON.stringify(board)) as Board;
    
    // Find source and destination columns
    const sourceColumn = newBoard.columns.find(col => col.id === source.droppableId);
    const destColumn = newBoard.columns.find(col => col.id === destination.droppableId);

    if (!sourceColumn || !destColumn) {
      console.error('Source or destination column not found:', { 
        sourceId: source.droppableId, 
        destId: destination.droppableId,
        columns: newBoard.columns.map(c => ({ id: c.id, title: c.title }))
      });
      return;
    }

    console.log('Moving task between columns:', {
      from: sourceColumn.title,
      to: destColumn.title,
      sourceIndex: source.index,
      destIndex: destination.index
    });

    // Remove task from source column
    const [movedTask] = sourceColumn.tasks.splice(source.index, 1);
    
    // Update task status based on destination column
    movedTask.status = destColumn.title.toLowerCase().replace(' ', '-') as Task['status'];

    // Add task to destination column
    destColumn.tasks.splice(destination.index, 0, movedTask);

    // Update board state
    setBoard(newBoard);

    // Send update to backend
    try {
      console.log('Sending move request to backend:', {
        taskId: movedTask.id,
        newColumnId: destination.droppableId
      });

      const response = await fetch('/api/tasks/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: movedTask.id,
          newColumnId: destination.droppableId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to move task: ' + await response.text());
      }

      console.log('Task moved successfully');
    } catch (error) {
      console.error('Failed to move task:', error);
      // Revert the state if the API call fails
      setBoard(board);
    }
  };

  const handleAddTask = async (title: string, description: string) => {
    if (!selectedColumn || !board) return;

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          columnId: selectedColumn.id,
          title,
          description,
          status: selectedColumn.title.toLowerCase().replace(' ', '-')
        })
      });

      if (!response.ok) throw new Error('Failed to create task');

      const newTask = await response.json();

      // Update local state
      const newBoard = JSON.parse(JSON.stringify(board)) as Board;
      const column = newBoard.columns.find(col => col.id === selectedColumn.id);
      if (column) {
        column.tasks.push(newTask);
        setBoard(newBoard);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleUpdateTask = async (taskId: string, title: string, description: string) => {
    if (!board) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
      });

      if (!response.ok) throw new Error('Failed to update task');

      const updatedTask = await response.json();

      // Update local state
      const newBoard = JSON.parse(JSON.stringify(board)) as Board;
      const column = newBoard.columns.find(col => 
        col.tasks.some(task => task.id === taskId)
      );

      if (column) {
        const taskIndex = column.tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
          column.tasks[taskIndex] = updatedTask;
          setBoard(newBoard);
        }
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!board) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete task');

      // Update local state
      const newBoard = JSON.parse(JSON.stringify(board)) as Board;
      const column = newBoard.columns.find(col => 
        col.tasks.some(task => task.id === taskId)
      );

      if (column) {
        column.tasks = column.tasks.filter(task => task.id !== taskId);
        setBoard(newBoard);
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  if (!board) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">{board.title}</h1>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="board-container">
          {board.columns.map((column) => (
            <div key={column.id} className="column">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{column.title}</h2>
                <button
                  onClick={() => {
                    setSelectedColumn(column);
                    setModalOpen(true);
                  }}
                  className="px-2 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Add Task
                </button>
              </div>
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
                    className={`column-content ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  >
                    {column.tasks.map((task, index) => (
                      <Draggable 
                        key={task.id} 
                        draggableId={task.id} 
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`task-card ${snapshot.isDragging ? 'dragging' : ''}`}
                            onClick={() => {
                              setSelectedTask(task);
                              setDetailsModalOpen(true);
                            }}
                          >
                            <h3 className="font-medium">{task.title}</h3>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
      
      {selectedColumn && (
        <TaskModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedColumn(null);
          }}
          onSubmit={handleAddTask}
          columnTitle={selectedColumn.title}
        />
      )}

      {selectedTask && (
        <TaskDetailsModal
          isOpen={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setSelectedTask(null);
          }}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          task={selectedTask}
          columnTitle={board.columns.find(col => 
            col.tasks.some(task => task.id === selectedTask.id)
          )?.title || ''}
        />
      )}
    </div>
  );
}
