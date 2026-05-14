import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = 'http://localhost:5000/api/todos'

interface Todo {
  id: number
  text: string
  completed: boolean
}

// Icons
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

function App() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [inputText, setInputText] = useState('')

  useEffect(() => {
    fetchTodos()
  }, [])

  const fetchTodos = async () => {
    try {
      const response = await axios.get<Todo[]>(API_URL)
      setTodos(response.data)
    } catch (error) {
      console.error('Error fetching todos:', error)
    }
  }

  const addTodo = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!inputText.trim()) return

    try {
      const response = await axios.post<Todo>(API_URL, { text: inputText })
      setTodos([...todos, response.data])
      setInputText('')
    } catch (error) {
      console.error('Error adding todo:', error)
    }
  }

  const deleteTodo = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/${id}`)
      setTodos(todos.filter(todo => todo.id !== id))
    } catch (error) {
      console.error('Error deleting todo:', error)
    }
  }

  const toggleTodo = async (id: number) => {
    try {
      const response = await axios.patch<Todo>(`${API_URL}/${id}`)
      setTodos(todos.map(todo => todo.id === id ? response.data : todo))
    } catch (error) {
      console.error('Error toggling todo:', error)
    }
  }

  return (
    <div className="todo-container">
      <div className="header">
        <h1>Task Manager</h1>
        <p className="subtitle">Stay productive, stay organized.</p>
      </div>
      
      <form onSubmit={addTodo} className="input-group">
        <input
          type="text"
          value={inputText}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setInputText(e.target.value)}
          placeholder="What needs to be done?"
        />
        <button type="submit" className="add-btn" aria-label="Add task">
          <PlusIcon />
        </button>
      </form>

      <ul className="todo-list">
        {todos.length === 0 ? (
          <li className="empty-state">No tasks yet. Add one above!</li>
        ) : (
          todos.map(todo => (
            <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                  className="hidden-checkbox"
                />
                <div className="custom-checkbox">
                  {todo.completed && <CheckIcon />}
                </div>
              </label>
              
              <span className="todo-text">{todo.text}</span>
              
              <button 
                className="delete-btn" 
                onClick={() => deleteTodo(todo.id)}
                aria-label="Delete task"
              >
                <TrashIcon />
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

export default App
