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
  const [newEmployee, setNewEmployee] = useState('')
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().slice(0,10))
  const [error, setError] = useState<string|null>(null)

  // load all entries
  async function load() {
    try {
      const res = await fetch('/api/first-workouts')
      if (!res.ok) throw new Error(await res.text())
      setWorkouts(await res.json())
    } catch (e:any) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [])

  // add new
  async function handleAdd() {
    if (!newEmployee) return
    try {
      const res = await fetch('/api/first-workouts', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ employee: newEmployee, workout_date: newDate })
      })
      if (!res.ok) throw new Error(await res.text())
      setNewEmployee('')
      setNewDate(new Date().toISOString().slice(0,10))
      await load()
    } catch (e:any) {
      setError(e.message)
    }
  }

  // delete one
  async function handleDelete(id:number) {
    try {
      const res = await fetch(`/api/first-workouts/${id}`, { method:'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      await load()
    } catch (e:any) {
      setError(e.message)
    }
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl mb-4">First Workouts Editor</h1>
      {error && <div className="mb-2 text-red-600">{error}</div>}

      <div className="mb-4 flex space-x-2">
        <input
          type="text"
          placeholder="Employee"
          value={newEmployee}
          onChange={e=>setNewEmployee(e.target.value)}
          className="border px-2 py-1 flex-1"
        />
        <input
          type="date"
          value={newDate}
          onChange={e=>setNewDate(e.target.value)}
          className="border px-2 py-1"
        />
        <button
          onClick={handleAdd}
          className="bg-blue-500 text-white px-4 py-1 rounded"
        >Add</button>
      </div>

      <table className="w-full table-auto border-collapse text-sm">
        <thead>
          <tr>
            <th className="border px-2 py-1">Employee</th>
            <th className="border px-2 py-1">Date</th>
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {workouts.map(w => (
            <tr key={w.id} className="hover:bg-gray-100">
              <td className="border px-2 py-1">{w.employee}</td>
              <td className="border px-2 py-1">{w.workout_date}</td>
              <td className="border px-2 py-1">
                <button
                  onClick={()=>handleDelete(w.id)}
                  className="text-red-600 hover:underline"
                >Delete</button>
              </td>
            </tr>
          ))}
          {workouts.length===0 && (
            <tr>
              <td colSpan={3} className="text-center text-gray-500 py-4">
                No entries
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
