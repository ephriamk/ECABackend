// pages/first-workouts.tsx
'use client'

import React, { useState, useEffect } from 'react'

interface Workout {
  id: number
  employee: string
  workout_date: string
}

export default function FirstWorkoutsEditor() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)

  // new-entry form
  const [newEmployee, setNewEmployee] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0,10))

  // for inline edit
  const [editingId, setEditingId] = useState<number|null>(null)
  const [editEmployee, setEditEmployee] = useState('')
  const [editDate, setEditDate] = useState('')

  // load all
  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/first-workouts')
      if (!res.ok) throw new Error(await res.text())
      setWorkouts(await res.json())
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd() {
    if (!newEmployee) return
    setLoading(true)
    try {
      const res = await fetch('/api/first-workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee: newEmployee, workout_date: newDate })
      })
      if (!res.ok) throw new Error(await res.text())
      setNewEmployee('')
      setNewDate(new Date().toISOString().slice(0,10))
      await load()
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  function startEdit(w: Workout) {
    setEditingId(w.id)
    setEditEmployee(w.employee)
    setEditDate(w.workout_date)
  }

  async function handleSave(id: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/first-workouts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee: editEmployee, workout_date: editDate })
      })
      if (!res.ok) throw new Error(await res.text())
      setEditingId(null)
      await load()
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/first-workouts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      await load()
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl mb-4">First Workouts Editor</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}

      <div className="flex mb-6 space-x-2">
        <input
          className="flex-1 border px-2 py-1"
          placeholder="Employee"
          value={newEmployee}
          onChange={e => setNewEmployee(e.target.value)}
        />
        <input
          type="date"
          className="border px-2 py-1"
          value={newDate}
          onChange={e => setNewDate(e.target.value)}
        />
        <button
          onClick={handleAdd}
          disabled={loading}
          className="bg-green-600 text-white px-4 rounded disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border px-2 py-1">Employee</th>
            <th className="border px-2 py-1">Date</th>
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {workouts.map(w =>
            <tr key={w.id} className="hover:bg-gray-50">
              <td className="border px-2 py-1">
                {editingId === w.id
                  ? <input
                      className="w-full border px-1 py-0.5"
                      value={editEmployee}
                      onChange={e => setEditEmployee(e.target.value)}
                    />
                  : w.employee}
              </td>
              <td className="border px-2 py-1">
                {editingId === w.id
                  ? <input
                      type="date"
                      className="border px-1 py-0.5"
                      value={editDate}
                      onChange={e => setEditDate(e.target.value)}
                    />
                  : w.workout_date}
              </td>
              <td className="border px-2 py-1 space-x-2">
                {editingId === w.id ? (
                  <>
                    <button
                      onClick={() => handleSave(w.id)}
                      className="text-blue-600 hover:underline disabled:opacity-50"
                      disabled={loading}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-gray-600 hover:underline"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(w)}
                      className="text-indigo-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(w.id)}
                      className="text-red-600 hover:underline disabled:opacity-50"
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          )}
          {workouts.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-center text-gray-500">
                No first workouts recorded.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
