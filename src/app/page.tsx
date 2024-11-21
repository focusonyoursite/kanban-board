'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Board, Column, Task } from '../types';
import TaskModal from '@/components/TaskModal';

export default function KanbanBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<Column | null>(null);

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

    // If dropped outside a droppable or in the same position, do nothing
    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Create a copy of the board to modify
    const newBoard = JSON.parse(JSON.stringify(board)) as Board;
    
    // Find source and destination columns
    const sourceColumn = newBoard.columns.find(col => col.id === source.droppableId);
    const destColumn = newBoard.columns.find(col => col.id === destination.droppableId);

    if (!sourceColumn || !destColumn) return;

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
      await fetch('/api/tasks/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: movedTask.id,
          newColumnId: destination.droppableId
        })
      });
    } catch (error) {
      console.error('Failed to move task:', error);
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
                {(provided) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
                    className="min-h-[200px]"
                  >
                    {column.tasks.map((task, index) => (
                      <Draggable 
                        key={task.id} 
                        draggableId={task.id} 
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="task-card"
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
    </div>
  );
}
