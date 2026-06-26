import { describe, expect, it } from 'vitest'
import {
  addTodo,
  deleteTodo,
  filterTodos,
  toggleTodo,
  type Todo,
} from './todos'

const baseTodo: Todo = {
  id: '1',
  title: 'Write the plan',
  completed: false,
  createdAt: '2026-06-26T00:00:00.000Z',
}

describe('todo core behavior', () => {
  it('trims titles and adds deterministic ids from time and length', () => {
    const now = new Date('2026-06-26T01:02:03.000Z')
    const todos = addTodo([baseTodo], '  Ship it  ', now)

    expect(todos).toEqual([
      baseTodo,
      {
        id: '1782435723000-2',
        title: 'Ship it',
        completed: false,
        createdAt: '2026-06-26T01:02:03.000Z',
      },
    ])
  })

  it('ignores empty titles without reallocating', () => {
    const todos = [baseTodo]
    expect(addTodo(todos, '   ')).toBe(todos)
  })

  it('toggles and deletes by id', () => {
    const toggled = toggleTodo([baseTodo], '1')
    expect(toggled[0]?.completed).toBe(true)

    expect(deleteTodo(toggled, '1')).toEqual([])
  })

  it('filters todos without mutating the source list', () => {
    const completedTodo: Todo = {
      id: '2',
      title: 'Review the PR',
      completed: true,
      createdAt: '2026-06-26T00:01:00.000Z',
    }
    const todos = [baseTodo, completedTodo]

    expect(filterTodos(todos, 'all')).toEqual(todos)
    expect(filterTodos(todos, 'active')).toEqual([baseTodo])
    expect(filterTodos(todos, 'completed')).toEqual([completedTodo])
    expect(todos).toEqual([baseTodo, completedTodo])
  })
})
