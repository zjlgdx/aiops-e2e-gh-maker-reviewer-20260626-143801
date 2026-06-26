import { useMemo, useState, type FormEvent } from 'react'
import {
  addTodo,
  deleteTodo,
  loadTodos,
  saveTodos,
  toggleTodo,
  type Todo,
} from './todos'

function App() {
  const [todos, setTodos] = useState<Todo[]>(() => loadTodos())
  const [title, setTitle] = useState('')

  const remaining = useMemo(
    () => todos.filter((todo) => !todo.completed).length,
    [todos],
  )

  function commit(nextTodos: Todo[]) {
    setTodos(nextTodos)
    saveTodos(nextTodos)
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

      {todos.length === 0 ? (
        <p className="empty-state">No todos yet.</p>
      ) : (
        <ul className="todo-list" aria-label="Todo list">
          {todos.map((todo) => (
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
