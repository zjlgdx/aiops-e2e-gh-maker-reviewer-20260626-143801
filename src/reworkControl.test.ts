import { describe, expect, it } from 'vitest'
import { createTodoSyncController } from './todoSync'
import type { Todo } from './todos'

const originalTodo: Todo = {
  id: 'todo-1',
  title: 'Delete me offline',
  completed: false,
  createdAt: '2026-06-26T00:00:00.000Z',
}

const replacementTodo: Todo = {
  id: 'todo-2',
  title: 'Replacement todo',
  completed: false,
  createdAt: '2026-06-26T00:01:00.000Z',
}

describe('rework control sync acknowledgements', () => {
  it('ignores stale delete acknowledgements for replaced todo ids', async () => {
    const pendingDelete: { resolve?: () => void } = {}
    const savedTodos: Todo[][] = []
    const controller = createTodoSyncController({
      initialTodos: [originalTodo],
      persistTodos: (_todos, operation) =>
        new Promise((resolve) => {
          if (
            operation.type === 'delete' &&
            operation.todoId === originalTodo.id
          ) {
            pendingDelete.resolve = () =>
              resolve({ todos: operation.todos, version: operation.version })
            return
          }

          resolve({ todos: operation.todos, version: operation.version })
        }),
      saveLocalTodos: (todos) => {
        savedTodos.push(todos)
      },
    })

    await controller.setOnline(false)
    await controller.commit([], 'delete Delete me offline', {
      type: 'delete',
      todoId: originalTodo.id,
    })
    const staleDeleteDrain = controller.setOnline(true)

    await controller.commit([replacementTodo], 'add Replacement todo')
    pendingDelete.resolve?.()
    await staleDeleteDrain

    expect(savedTodos).toEqual([[replacementTodo]])
    expect(controller.getSnapshot()).toMatchObject({
      todos: [replacementTodo],
      pendingCount: 0,
      version: 2,
    })
  })
})
