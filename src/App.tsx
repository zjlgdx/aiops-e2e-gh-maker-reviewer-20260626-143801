import { useMemo, useState, type FormEvent } from 'react'
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

const filterOptions: { value: TodoFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

function App() {
  const [todos, setTodos] = useState<Todo[]>(() => loadTodos())
  const [filter, setFilter] = useState<TodoFilter>(() => loadTodoFilter())
  const [title, setTitle] = useState('')

  const remaining = useMemo(
    () => todos.filter((todo) => !todo.completed).length,
    [todos],
  )
  const visibleTodos = useMemo(() => filterTodos(todos, filter), [todos, filter])

  function commit(nextTodos: Todo[]) {
    setTodos(nextTodos)
    saveTodos(nextTodos)
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
    commit(next)
    setTitle('')
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
                  onChange={() => commit(toggleTodo(todos, todo.id))}
                />
                <span>{todo.title}</span>
              </label>
              <button
                type="button"
                onClick={() => commit(deleteTodo(todos, todo.id))}
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
