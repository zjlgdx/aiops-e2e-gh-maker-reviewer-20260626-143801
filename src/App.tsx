import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  addTodo,
  deleteTodo,
  filterTodos,
  loadTodoFilter,
  loadTodos,
  saveTodoFilter,
  saveTodos,
  toggleTodo,
  type TodoFilter,
  type Todo,
} from './todos'
import {
  createLocalTodoPersistence,
  createTodoSyncController,
} from './todoSync'

const filterOptions: { value: TodoFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

function App() {
  const [syncController] = useState(() =>
    createTodoSyncController({
      initialTodos: loadTodos(),
      persistTodos: createLocalTodoPersistence(),
      saveLocalTodos: saveTodos,
    }),
  )
  const [syncState, setSyncState] = useState(() =>
    syncController.getSnapshot(),
  )
  const [filter, setFilter] = useState<TodoFilter>(() => loadTodoFilter())
  const [title, setTitle] = useState('')
  const todos = syncState.todos

  useEffect(
    () =>
      syncController.subscribe(() => {
        setSyncState(syncController.getSnapshot())
      }),
    [syncController],
  )

  const remaining = useMemo(
    () => todos.filter((todo) => !todo.completed).length,
    [todos],
  )
  const visibleTodos = useMemo(() => filterTodos(todos, filter), [todos, filter])

  function commit(nextTodos: Todo[], operationName: string) {
    void syncController.commit(nextTodos, operationName)
  }

  function selectFilter(nextFilter: TodoFilter) {
    setFilter(nextFilter)
    saveTodoFilter(nextFilter)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = addTodo(todos, title)
    if (next === todos) {
      return
    }
    commit(next, `add ${next.at(-1)?.title ?? 'todo'}`)
    setTitle('')
  }

  function handleOnlineChange(nextOnline: boolean) {
    void syncController.setOnline(nextOnline)
  }

  return (
    <main className="app-shell">
      <header>
        <p className="eyebrow">GitHub maker/reviewer E2E</p>
        <h1>Web Todo</h1>
        <p className="summary">
          {remaining} active of {todos.length} total
        </p>
      </header>

      <section className="sync-panel" aria-label="Sync status">
        <label className="online-toggle">
          <input
            type="checkbox"
            aria-label="Online mode"
            checked={syncState.online}
            onChange={(event) => handleOnlineChange(event.target.checked)}
          />
          <span>{syncState.online ? 'Online' : 'Offline'}</span>
        </label>
        <p>Pending sync: {syncState.pendingCount}</p>
        {syncState.syncing ? <p>Syncing changes...</p> : null}
      </section>

      {syncState.error ? (
        <p className="sync-error" role="alert">
          {syncState.error}
        </p>
      ) : null}

      <form className="todo-form" onSubmit={handleSubmit}>
        <label htmlFor="new-todo">New todo</label>
        <div>
          <input
            id="new-todo"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Plan the next small thing"
          />
          <button type="submit">Add</button>
        </div>
      </form>

      <div className="filter-tabs" aria-label="Todo filters">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => selectFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {todos.length === 0 ? (
        <p className="empty-state">No todos yet.</p>
      ) : visibleTodos.length === 0 ? (
        <p className="empty-state">No {filter} todos.</p>
      ) : (
        <ul className="todo-list" aria-label="Todo list">
          {visibleTodos.map((todo) => (
            <li key={todo.id} className={todo.completed ? 'completed' : ''}>
              <label>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() =>
                    commit(toggleTodo(todos, todo.id), `toggle ${todo.title}`)
                  }
                />
                <span>{todo.title}</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  commit(deleteTodo(todos, todo.id), `delete ${todo.title}`)
                }
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default App
