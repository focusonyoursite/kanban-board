import { sql } from '@vercel/postgres';
import { Task, Column, Board } from '../types';
import { v4 as uuidv4 } from 'uuid';

export async function createBoard(title: string): Promise<Board> {
  const boardId = uuidv4();
  
  // Create default columns
  const columns = [
    { id: uuidv4(), title: 'To Do', tasks: [] },
    { id: uuidv4(), title: 'In Progress', tasks: [] },
    { id: uuidv4(), title: 'Done', tasks: [] }
  ];

  await sql`
    INSERT INTO boards (id, title) 
    VALUES (${boardId}, ${title})
  `;

  await Promise.all(columns.map(column => 
    sql`
      INSERT INTO columns (id, board_id, title) 
      VALUES (${column.id}, ${boardId}, ${column.title})
    `
  ));

  return {
    id: boardId,
    title,
    columns
  };
}

export async function addTask(columnId: string, task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  const taskId = uuidv4();
  const now = new Date().toISOString();

  await sql`
    INSERT INTO tasks (id, column_id, title, description, status, created_at, updated_at)
    VALUES (
      ${taskId}, 
      ${columnId}, 
      ${task.title}, 
      ${task.description || ''}, 
      ${task.status}, 
      ${now}, 
      ${now}
    )
  `;

  return {
    id: taskId,
    ...task,
    createdAt: new Date(now),
    updatedAt: new Date(now)
  };
}

export async function moveTask(taskId: string, newColumnId: string): Promise<void> {
  const now = new Date().toISOString();
  await sql`
    UPDATE tasks 
    SET column_id = ${newColumnId}, updated_at = ${now}
    WHERE id = ${taskId}
  `;
}

export async function getBoard(boardId: string): Promise<Board | null> {
  try {
    const boardResult = await sql`
      SELECT * FROM boards WHERE id = ${boardId}
    `;

    if (boardResult.rows.length === 0) return null;

    const columnsResult = await sql`
      SELECT * FROM columns WHERE board_id = ${boardId}
    `;

    const tasksResult = await sql`
      SELECT * FROM tasks WHERE column_id IN (
        SELECT id FROM columns WHERE board_id = ${boardId}
      )
    `;

    const columns = columnsResult.rows.map(column => ({
      id: column.id,
      title: column.title,
      tasks: tasksResult.rows
        .filter(task => task.column_id === column.id)
        .map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          createdAt: new Date(task.created_at),
          updatedAt: new Date(task.updated_at)
        }))
    }));

    return {
      id: boardResult.rows[0].id,
      title: boardResult.rows[0].title,
      columns
    };
  } catch (error) {
    console.error('Error fetching board:', error);
    return null;
  }
}

// Database initialization function
export async function initializeDatabase() {
  try {
    // Create boards table
    await sql`
      CREATE TABLE IF NOT EXISTS boards (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create columns table
    await sql`
      CREATE TABLE IF NOT EXISTS columns (
        id VARCHAR(255) PRIMARY KEY,
        board_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
      )
    `;

    // Create tasks table
    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(255) PRIMARY KEY,
        column_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
      )
    `;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}
