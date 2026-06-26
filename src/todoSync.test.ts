import { describe, expect, it } from 'vitest'
import { createTodoSyncController } from './todoSync'
import type { Todo } from './todos'

const baseTodo: Todo = {
  id: '1',
  title: 'Write the plan',
  completed: false,
  createdAt: '2026-06-26T00:00:00.000Z',
}

const secondTodo: Todo = {
  id: '2',
  title: 'Review the PR',
  completed: false,
  createdAt: '2026-06-26T00:01:00.000Z',
}

describe('todo sync controller', () => {
  it('drains offline queued saves in operation order', async () => {
    const operationNames: string[] = []
    const controller = createTodoSyncController({
      initialTodos: [],
      persistTodos: async (_todos, operation) => {
        operationNames.push(operation.name)
        return { todos: operation.todos, version: operation.version }
      },
      saveLocalTodos: () => undefined,
    })

    controller.setOnline(false)
    controller.commit([baseTodo], 'add Write the plan')
    controller.commit([{ ...baseTodo, completed: true }], 'toggle Write the plan')
    controller.commit([], 'delete Write the plan')

    expect(controller.getSnapshot().pendingCount).toBe(3)

    await controller.setOnline(true)

    expect(operationNames).toEqual([
      'add Write the plan',
      'toggle Write the plan',
      'delete Write the plan',
    ])
    expect(controller.getSnapshot().pendingCount).toBe(0)
  })

  it('ignores stale save responses instead of overwriting newer todo state', async () => {
    const pendingSaves = new Map<number, () => void>()
    const savedTodos: Todo[][] = []
    const controller = createTodoSyncController({
      initialTodos: [],
      persistTodos: (_todos, operation) =>
        new Promise((resolve) => {
          pendingSaves.set(operation.version, () => {
            resolve({ todos: operation.todos, version: operation.version })
          })
        }),
      saveLocalTodos: (todos) => {
        savedTodos.push(todos)
      },
    })

    const firstSave = controller.commit([baseTodo], 'add first')
    const secondSave = controller.commit([baseTodo, secondTodo], 'add second')

    pendingSaves.get(2)?.()
    await secondSave
    expect(savedTodos).toEqual([[baseTodo, secondTodo]])

    pendingSaves.get(1)?.()
    await firstSave

    expect(savedTodos).toEqual([[baseTodo, secondTodo]])
    expect(controller.getSnapshot().todos).toEqual([baseTodo, secondTodo])
  })

  it('keeps current todos and exposes an inline error when a queued save fails', async () => {
    const controller = createTodoSyncController({
      initialTodos: [],
      persistTodos: async () => {
        throw new Error('network unavailable')
      },
      saveLocalTodos: () => undefined,
    })

    controller.setOnline(false)
    controller.commit([baseTodo], 'add Write the plan')

    await controller.setOnline(true)

    expect(controller.getSnapshot().todos).toEqual([baseTodo])
    expect(controller.getSnapshot().pendingCount).toBe(1)
    expect(controller.getSnapshot().error).toContain('Could not sync')
  })

  it('cancels an offline queued delete when the todo is undone before drain', async () => {
    const operationNames: string[] = []
    const controller = createTodoSyncController({
      initialTodos: [baseTodo],
      persistTodos: async (_todos, operation) => {
        operationNames.push(operation.name)
        return { todos: operation.todos, version: operation.version }
      },
      saveLocalTodos: () => undefined,
    })

    await controller.setOnline(false)
    await controller.commit([], 'delete Write the plan', {
      type: 'delete',
      todoId: baseTodo.id,
    })

    expect(controller.getSnapshot().todos).toEqual([])
    expect(controller.getSnapshot().pendingCount).toBe(1)

    await controller.undoDelete([baseTodo], baseTodo.id, 'undo delete Write the plan')
    await controller.setOnline(true)

    expect(operationNames).toEqual([])
    expect(controller.getSnapshot().todos).toEqual([baseTodo])
    expect(controller.getSnapshot().pendingCount).toBe(0)
  })

  it('keeps restored todos in remaining queued snapshots after undoing a delete', async () => {
    const persistedTodos: Todo[][] = []
    const controller = createTodoSyncController({
      initialTodos: [baseTodo],
      persistTodos: async (_todos, operation) => {
        persistedTodos.push(operation.todos)
        return { todos: operation.todos, version: operation.version }
      },
      saveLocalTodos: () => undefined,
    })

    await controller.setOnline(false)
    await controller.commit([], 'delete Write the plan', {
      type: 'delete',
      todoId: baseTodo.id,
    })
    await controller.commit([secondTodo], 'add Review the PR')

    await controller.undoDelete(
      [baseTodo, secondTodo],
      baseTodo.id,
      'undo delete Write the plan',
    )
    await controller.setOnline(true)

    expect(persistedTodos).toEqual([[baseTodo, secondTodo]])
    expect(controller.getSnapshot().todos).toEqual([baseTodo, secondTodo])
    expect(controller.getSnapshot().pendingCount).toBe(0)
  })

  it('ignores a stale queued delete acknowledgement after undoing during drain', async () => {
    const pendingDelete: { resolve?: () => void } = {}
    const savedTodos: Todo[][] = []
    const controller = createTodoSyncController({
      initialTodos: [baseTodo],
      persistTodos: (_todos, operation) =>
        new Promise((resolve) => {
          if (operation.name.startsWith('delete')) {
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
    await controller.commit([], 'delete Write the plan', {
      type: 'delete',
      todoId: baseTodo.id,
    })
    const drain = controller.setOnline(true)

    await controller.undoDelete([baseTodo], baseTodo.id, 'undo delete Write the plan')
    pendingDelete.resolve?.()
    await drain

    expect(savedTodos).toEqual([[baseTodo]])
    expect(controller.getSnapshot().todos).toEqual([baseTodo])
    expect(controller.getSnapshot().pendingCount).toBe(0)
  })

  it('ignores a stale queued delete acknowledgement after a replacement todo is created', async () => {
    const replacementTodo: Todo = {
      id: '3',
      title: 'Replacement todo',
      completed: false,
      createdAt: '2026-06-26T00:02:00.000Z',
    }
    const pendingDelete: { resolve?: () => void } = {}
    const savedTodos: Todo[][] = []
    const controller = createTodoSyncController({
      initialTodos: [baseTodo],
      persistTodos: (_todos, operation) =>
        new Promise((resolve) => {
          if (operation.name.startsWith('delete')) {
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
    await controller.commit([], 'delete Write the plan', {
      type: 'delete',
      todoId: baseTodo.id,
    })
    const drain = controller.setOnline(true)

    await controller.commit([replacementTodo], 'add Replacement todo')
    pendingDelete.resolve?.()
    await drain

    expect(savedTodos).toEqual([[replacementTodo]])
    expect(controller.getSnapshot().todos).toEqual([replacementTodo])
    expect(controller.getSnapshot().pendingCount).toBe(0)
  })
})
