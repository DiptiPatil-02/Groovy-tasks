import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = 'http://localhost:5000/api/todos'

interface Todo {
  _id: string
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

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

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

  const deleteTodo = async (_id: string) => {
    try {
      await axios.delete(`${API_URL}/${_id}`)
      setTodos(todos.filter(todo => todo._id !== _id))
    } catch (error) {
      console.error('Error deleting todo:', error)
    }
  }

  const toggleTodo = async (_id: string) => {
    try {
      const response = await axios.patch<Todo>(`${API_URL}/${_id}`)
      setTodos(todos.map(todo => todo._id === _id ? response.data : todo))
    } catch (error) {
      console.error('Error toggling todo:', error)
    }
  }

  const startEditing = (todo: Todo) => {
    setEditingId(todo._id)
    setEditingText(todo.text)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingText('')
  }

  const updateTodo = async (_id: string) => {
    if (!editingText.trim()) return
    try {
      const response = await axios.put<Todo>(`${API_URL}/${_id}`, { text: editingText })
      setTodos(todos.map(todo => todo._id === _id ? response.data : todo))
      setEditingId(null)
      setEditingText('')
    } catch (error) {
      console.error('Error updating todo:', error)
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
            <li key={todo._id} className={`todo-item ${todo.completed ? 'completed' : ''} ${editingId === todo._id ? 'editing' : ''}`}>
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo._id)}
                  className="hidden-checkbox"
                />
                <div className="custom-checkbox">
                  {todo.completed && <CheckIcon />}
                </div>
              </label>
              
              {editingId === todo._id ? (
                <div className="edit-mode">
                  <input
                    type="text"
                    value={editingText}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEditingText(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') updateTodo(todo._id)
                      if (e.key === 'Escape') cancelEditing()
                    }}
                  />
                  <div className="edit-actions">
                    <button onClick={() => updateTodo(todo._id)} className="save-btn">Save</button>
                    <button onClick={cancelEditing} className="cancel-btn">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="todo-text">{todo.text}</span>
                  <div className="item-actions">
                    <button 
                      className="edit-btn" 
                      onClick={() => startEditing(todo)}
                      aria-label="Edit task"
                    >
                      <EditIcon />
                    </button>
                    <button 
                      className="delete-btn" 
                      onClick={() => deleteTodo(todo._id)}
                      aria-label="Delete task"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

export default App
