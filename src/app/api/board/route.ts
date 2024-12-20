import { NextResponse } from 'next/server';
import { createBoard, getBoard, initializeDatabase } from '@/lib/db';

export async function GET() {
  try {
    // Initialize database on first request
    await initializeDatabase();

    // For demo purposes, create a default board if none exists
    const boardId = process.env.DEFAULT_BOARD_ID || 'default-board';
    
    let board = await getBoard(boardId);
    
    if (!board) {
      board = await createBoard('My Kanban Board');
    }

    return NextResponse.json(board);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { title } = await request.json();
    
    if (!title) {
      return NextResponse.json(
        { error: 'Board title is required' }, 
        { status: 400 }
      );
    }

    const board = await createBoard(title);
    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
