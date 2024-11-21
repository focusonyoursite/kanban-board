import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function PUT(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { title, description } = await request.json();
    const { taskId } = params;

    // Update the task
    const result = await sql`
      UPDATE tasks
      SET title = ${title},
          description = ${description},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${taskId}
      RETURNING *
    `;

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update task',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params;

    // Delete the task
    const result = await sql`
      DELETE FROM tasks
      WHERE id = ${taskId}
      RETURNING *
    `;

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete task',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
