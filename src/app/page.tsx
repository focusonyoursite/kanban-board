'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Board, Column, Task } from '../types';

export default function KanbanBoard() {
  const [board, setBoard] = useState<Board | null>(null);

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

  if (!board) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">{board.title}</h1>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="board-container">
          {board.columns.map((column) => (
            <div key={column.id} className="column">
              <h2 className="text-xl font-semibold mb-4">{column.title}</h2>
              <Droppable droppableId={column.id}>
                {(provided) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
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
    </div>
  );
}
