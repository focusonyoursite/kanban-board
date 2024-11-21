import { NextResponse } from 'next/server';
import { createBoard, getBoard, initializeDatabase } from '@/lib/db';

export async function GET() {
  // Initialize database on first request
  await initializeDatabase();

  // For demo purposes, create a default board if none exists
  const boardId = process.env.DEFAULT_BOARD_ID || 'default-board';
  
  let board = await getBoard(boardId);
  
  if (!board) {
    board = await createBoard('My Kanban Board');
  }

  return NextResponse.json(board);
}

export async function POST(request: Request) {
  const { title } = await request.json();
  
  if (!title) {
    return NextResponse.json(
      { error: 'Board title is required' }, 
      { status: 400 }
    );
  }

  const board = await createBoard(title);
  return NextResponse.json(board, { status: 201 });
}
