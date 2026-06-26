export type Todo = {
  id: string
  title: string
  completed: boolean
  createdAt: string
}

export type TodoFilter = 'all' | 'active' | 'completed'

const STORAGE_KEY = 'github-maker-reviewer-web-todos'
const FILTER_STORAGE_KEY = 'github-maker-reviewer-web-todo-filter'

export function loadTodos(storage: Storage = window.localStorage): Todo[] {
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isTodo) : []
  } catch {
    return []
  }
}

export function saveTodos(todos: Todo[], storage: Storage = window.localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(todos))
}

export function loadTodoFilter(
  storage: Storage = window.localStorage,
): TodoFilter {
  const raw = storage.getItem(FILTER_STORAGE_KEY)
  return isTodoFilter(raw) ? raw : 'all'
}

export function saveTodoFilter(
  filter: TodoFilter,
  storage: Storage = window.localStorage,
) {
  storage.setItem(FILTER_STORAGE_KEY, filter)
}

export function addTodo(todos: Todo[], title: string, now = new Date()): Todo[] {
  const trimmed = title.trim()
  if (!trimmed) {
    return todos
  }

  return [
    ...todos,
    {
      id: `${now.getTime()}-${todos.length + 1}`,
      title: trimmed,
      completed: false,
      createdAt: now.toISOString(),
    },
  ]
}

export function toggleTodo(todos: Todo[], id: string): Todo[] {
  return todos.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo,
  )
}

export function deleteTodo(todos: Todo[], id: string): Todo[] {
  return todos.filter((todo) => todo.id !== id)
}

export function filterTodos(todos: Todo[], filter: TodoFilter): Todo[] {
  if (filter === 'active') {
    return todos.filter((todo) => !todo.completed)
  }
  if (filter === 'completed') {
    return todos.filter((todo) => todo.completed)
  }
  return todos
}

function isTodo(value: unknown): value is Todo {
  if (!value || typeof value !== 'object') {
    return false
  }
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.completed === 'boolean' &&
    typeof item.createdAt === 'string'
  )
}

function isTodoFilter(value: unknown): value is TodoFilter {
  return value === 'all' || value === 'active' || value === 'completed'
}
