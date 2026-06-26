import type { Todo } from './todos'

type PersistTodoOperationType = 'save' | 'delete'

export type CommitTodoOptions = {
  type?: PersistTodoOperationType
  todoId?: string
}

export type PersistTodoOperation = {
  id: string
  name: string
  todos: Todo[]
  version: number
  type: PersistTodoOperationType
  todoId?: string
}

type PersistTodoResponse = {
  todos: Todo[]
  version: number
}

type PersistTodos = (
  todos: Todo[],
  operation: PersistTodoOperation,
) => Promise<PersistTodoResponse>

type TodoSyncControllerOptions = {
  initialTodos: Todo[]
  persistTodos: PersistTodos
  saveLocalTodos: (todos: Todo[]) => void
}

export type TodoSyncSnapshot = {
  todos: Todo[]
  online: boolean
  pendingCount: number
  syncing: boolean
  error: string | null
  version: number
}

type TodoSyncListener = () => void

export function createLocalTodoPersistence(
  delayMs = 20,
): PersistTodos {
  return (todos, operation) =>
    new Promise((resolve) => {
      window.setTimeout(() => {
        resolve({ todos: cloneTodos(todos), version: operation.version })
      }, delayMs)
    })
}

export function createTodoSyncController(
  options: TodoSyncControllerOptions,
) {
  return new TodoSyncController(options)
}

class TodoSyncController {
  private readonly persistTodos: PersistTodos
  private readonly saveLocalTodos: (todos: Todo[]) => void
  private readonly listeners = new Set<TodoSyncListener>()
  private readonly queue: PersistTodoOperation[] = []
  private drainPromise: Promise<void> | null = null
  private snapshot: TodoSyncSnapshot

  constructor(options: TodoSyncControllerOptions) {
    this.persistTodos = options.persistTodos
    this.saveLocalTodos = options.saveLocalTodos
    this.snapshot = {
      todos: cloneTodos(options.initialTodos),
      online: true,
      pendingCount: 0,
      syncing: false,
      error: null,
      version: 0,
    }
  }

  getSnapshot(): TodoSyncSnapshot {
    return {
      ...this.snapshot,
      todos: cloneTodos(this.snapshot.todos),
    }
  }

  subscribe(listener: TodoSyncListener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  commit(
    todos: Todo[],
    name: string,
    options: CommitTodoOptions = {},
  ): Promise<void> {
    const operation: PersistTodoOperation = {
      id: `${this.snapshot.version + 1}`,
      name,
      todos: cloneTodos(todos),
      version: this.snapshot.version + 1,
      type: options.type ?? 'save',
      todoId: options.todoId,
    }

    this.snapshot = {
      ...this.snapshot,
      todos: cloneTodos(todos),
      error: null,
      version: operation.version,
    }

    if (!this.snapshot.online) {
      this.queue.push(operation)
      this.updateQueueSnapshot()
      return Promise.resolve()
    }

    this.emit()
    return this.persistOperation(operation).then(() => undefined)
  }

  undoDelete(todos: Todo[], todoId: string, name: string): Promise<void> {
    const restoredTodos = cloneTodos(todos)
    const removedQueuedDelete = this.removeQueuedDeletes(todoId, restoredTodos)

    if (removedQueuedDelete && !this.snapshot.online) {
      this.snapshot = {
        ...this.snapshot,
        todos: restoredTodos,
        error: null,
        version: this.snapshot.version + 1,
        pendingCount: this.queue.length,
      }
      this.saveLocalTodos(restoredTodos)
      this.emit()
      return Promise.resolve()
    }

    return this.commit(restoredTodos, name)
  }

  setOnline(online: boolean): Promise<void> {
    if (this.snapshot.online === online) {
      return online ? this.drainQueue() : Promise.resolve()
    }

    this.snapshot = {
      ...this.snapshot,
      online,
      error: online ? null : this.snapshot.error,
    }
    this.emit()

    return online ? this.drainQueue() : Promise.resolve()
  }

  private async drainQueue() {
    if (!this.snapshot.online) {
      return
    }
    if (this.drainPromise) {
      return this.drainPromise
    }

    this.snapshot = { ...this.snapshot, syncing: this.queue.length > 0 }
    this.emit()

    this.drainPromise = this.runDrainQueue().finally(() => {
      this.drainPromise = null
      this.snapshot = { ...this.snapshot, syncing: false }
      this.emit()
    })

    return this.drainPromise
  }

  private async runDrainQueue() {
    while (this.snapshot.online && this.queue.length > 0) {
      const operation = this.queue[0]
      const synced = await this.persistOperation(operation)
      if (!synced) {
        return
      }
      this.removeQueuedOperation(operation.id)
    }
  }

  private async persistOperation(operation: PersistTodoOperation) {
    try {
      const response = await this.persistTodos(operation.todos, operation)
      if (
        operation.version !== this.snapshot.version ||
        response.version !== this.snapshot.version
      ) {
        return true
      }

      this.snapshot = {
        ...this.snapshot,
        todos: cloneTodos(response.todos),
        error: null,
      }
      this.saveLocalTodos(response.todos)
      this.emit()
      return true
    } catch {
      this.snapshot = {
        ...this.snapshot,
        error: `Could not sync "${operation.name}". Your current todo list is preserved.`,
      }
      this.emit()
      return false
    }
  }

  private updateQueueSnapshot() {
    this.snapshot = {
      ...this.snapshot,
      pendingCount: this.queue.length,
    }
    this.emit()
  }

  private removeQueuedDeletes(todoId: string, restoredTodos: Todo[]) {
    const previousLength = this.queue.length
    let firstRemovedIndex = this.queue.length
    for (let index = this.queue.length - 1; index >= 0; index -= 1) {
      const operation = this.queue[index]
      if (operation?.type === 'delete' && operation.todoId === todoId) {
        this.queue.splice(index, 1)
        firstRemovedIndex = Math.min(firstRemovedIndex, index)
      }
    }
    for (let index = firstRemovedIndex; index < this.queue.length; index += 1) {
      const operation = this.queue[index]
      if (operation) {
        this.queue[index] = {
          ...operation,
          todos: cloneTodos(restoredTodos),
        }
      }
    }
    this.snapshot = {
      ...this.snapshot,
      pendingCount: this.queue.length,
    }
    return this.queue.length !== previousLength
  }

  private removeQueuedOperation(operationId: string) {
    const index = this.queue.findIndex((operation) => operation.id === operationId)
    if (index === -1) {
      return
    }
    this.queue.splice(index, 1)
    this.updateQueueSnapshot()
  }

  private emit() {
    for (const listener of this.listeners) {
      listener()
    }
  }
}

function cloneTodos(todos: Todo[]) {
  return todos.map((todo) => ({ ...todo }))
}
