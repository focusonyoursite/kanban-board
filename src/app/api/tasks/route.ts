import { NextResponse } from 'next/server';
import { addTask } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { columnId, title, description, status } = await request.json();

    if (!columnId || !title || !status) {
      return NextResponse.json(
        { error: 'Column ID, title, and status are required' },
        { status: 400 }
      );
    }

    const task = await addTask(columnId, {
      title,
      description,
      status
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
