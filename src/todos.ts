export type Todo = {
  id: string
  title: string
  completed: boolean
  createdAt: string
}

const STORAGE_KEY = 'github-maker-reviewer-web-todos'

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
