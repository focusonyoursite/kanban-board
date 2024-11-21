import { NextResponse } from 'next/server';
import { moveTask } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { taskId, newColumnId } = await request.json();

    if (!taskId || !newColumnId) {
      return NextResponse.json(
        { error: 'Task ID and new Column ID are required' }, 
        { status: 400 }
      );
    }

    await moveTask(taskId, newColumnId);

    return NextResponse.json(
      { message: 'Task moved successfully' }, 
      { status: 200 }
    );
  } catch (error) {
    console.error('Error moving task:', error);
    return NextResponse.json(
      { 
        error: 'Failed to move task',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      }, 
      { status: 500 }
    );
  }
}
