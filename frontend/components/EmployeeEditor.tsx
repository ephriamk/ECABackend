"use client"
import React, { useEffect, useState } from 'react';

interface Employee {
  name: string;
  position: string;
  active: string;
  barcode: string;
  profitCenter: string;
  hired: string;
  quota: number;
}

const emptyEmployee: Employee = {
  name: '',
  position: '',
  active: '',
  barcode: '',
  profitCenter: '',
  hired: '',
  quota: 0,
};

export default function EmployeeEditor() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editEmployee, setEditEmployee] = useState<Employee>(emptyEmployee);
  const [newEmployee, setNewEmployee] = useState<Employee>(emptyEmployee);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch employees
  const fetchEmployees = () => {
    setLoading(true);
    fetch('http://localhost:8000/api/employees/all')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch employees');
        return res.json();
      })
      .then((data) => {
        setEmployees(
          data.map((e: any) => ({
            name: e.Name,
            position: e.Position,
            active: e.Active,
            barcode: e.Barcode,
            profitCenter: e['Profit Center'],
            hired: e.hired,
            quota: e.Quota || 0,
          }))
        );
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Handle edit
  const handleEdit = (idx: number) => {
    setEditingIndex(idx);
    setEditEmployee(employees[idx]);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'quota') {
      setEditEmployee({ ...editEmployee, [name]: parseFloat(value) || 0 });
    } else {
      setEditEmployee({ ...editEmployee, [name]: value });
    }
  };

  const handleEditSave = () => {
    fetch(`http://localhost:8000/api/employees/${encodeURIComponent(editEmployee.name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editEmployee),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to update employee');
        return res.json();
      })
      .then(() => {
        setEditingIndex(null);
        fetchEmployees();
      })
      .catch((err) => setError(err.message));
  };

  // Handle delete
  const handleDelete = (name: string) => {
    if (!window.confirm('Delete this employee?')) return;
    fetch(`http://localhost:8000/api/employees/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to delete employee');
        return res.json();
      })
      .then(() => fetchEmployees())
      .catch((err) => setError(err.message));
  };

  // Handle add
  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'quota') {
      setNewEmployee({ ...newEmployee, [name]: parseFloat(value) || 0 });
    } else {
      setNewEmployee({ ...newEmployee, [name]: value });
    }
  };

  const handleAdd = async () => {
    // Validate required fields
    if (!newEmployee.name || !newEmployee.position || !newEmployee.active || !newEmployee.barcode || !newEmployee.profitCenter || !newEmployee.hired) {
      setError('All fields except quota are required.');
      return;
    }
    setError(null);
    console.log('Adding employee:', newEmployee);
    try {
      const res = await fetch('http://localhost:8000/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee),
      });
      const data = await res.json();
      console.log('Add employee response:', data);
      if (!res.ok || !data.success) {
        setError('Failed to add employee: ' + (data.error || res.statusText));
        return;
      }
      setNewEmployee(emptyEmployee);
      fetchEmployees();
      alert('Employee added successfully!');
    } catch (err: any) {
      setError('Failed to add employee: ' + (err.message || err.toString()));
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-2">Employee Editor</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse mb-4">
          <thead>
            <tr className="bg-blue-200">
              <th className="border p-1 text-xs">Name</th>
              <th className="border p-1 text-xs">Position</th>
              <th className="border p-1 text-xs">Active</th>
              <th className="border p-1 text-xs">Barcode</th>
              <th className="border p-1 text-xs">Profit Center</th>
              <th className="border p-1 text-xs">Hired</th>
              <th className="border p-1 text-xs">Quota</th>
              <th className="border p-1 text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center">Loading...</td></tr>
            ) : (
              employees.map((emp, idx) => (
                <tr key={emp.name + idx} className={editingIndex === idx ? 'bg-yellow-100' : ''}>
                  {editingIndex === idx ? (
                    <>
                      <td className="border p-1"><input name="name" value={editEmployee.name} onChange={handleEditChange} className="w-full text-xs" /></td>
                      <td className="border p-1"><input name="position" value={editEmployee.position} onChange={handleEditChange} className="w-full text-xs" /></td>
                      <td className="border p-1"><input name="active" value={editEmployee.active} onChange={handleEditChange} className="w-full text-xs" /></td>
                      <td className="border p-1"><input name="barcode" value={editEmployee.barcode} onChange={handleEditChange} className="w-full text-xs" /></td>
                      <td className="border p-1"><input name="profitCenter" value={editEmployee.profitCenter} onChange={handleEditChange} className="w-full text-xs" /></td>
                      <td className="border p-1"><input name="hired" value={editEmployee.hired} onChange={handleEditChange} className="w-full text-xs" /></td>
                      <td className="border p-1">
                        <input 
                          name="quota" 
                          type="number"
                          min="0"
                          step="0.01"
                          value={editEmployee.quota} 
                          onChange={handleEditChange} 
                          className="w-full text-xs" 
                        />
                      </td>
                      <td className="border p-1">
                        <button onClick={handleEditSave} className="mr-2 text-green-600 text-xs">Save</button>
                        <button onClick={() => setEditingIndex(null)} className="text-gray-600 text-xs">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border p-1 text-xs">{emp.name}</td>
                      <td className="border p-1 text-xs">{emp.position}</td>
                      <td className="border p-1 text-xs">{emp.active}</td>
                      <td className="border p-1 text-xs">{emp.barcode}</td>
                      <td className="border p-1 text-xs">{emp.profitCenter}</td>
                      <td className="border p-1 text-xs">{emp.hired}</td>
                      <td className="border p-1 text-xs">${emp.quota.toFixed(2)}</td>
                      <td className="border p-1">
                        <button onClick={() => handleEdit(idx)} className="mr-2 text-blue-600 text-xs">Edit</button>
                        <button onClick={() => handleDelete(emp.name)} className="text-red-600 text-xs">Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
            <tr className="bg-green-50">
              <td className="border p-1"><input name="name" value={newEmployee.name} onChange={handleAddChange} className="w-full text-xs" placeholder="Name" /></td>
              <td className="border p-1"><input name="position" value={newEmployee.position} onChange={handleAddChange} className="w-full text-xs" placeholder="Position" /></td>
              <td className="border p-1"><input name="active" value={newEmployee.active} onChange={handleAddChange} className="w-full text-xs" placeholder="Active" /></td>
              <td className="border p-1"><input name="barcode" value={newEmployee.barcode} onChange={handleAddChange} className="w-full text-xs" placeholder="Barcode" /></td>
              <td className="border p-1"><input name="profitCenter" value={newEmployee.profitCenter} onChange={handleAddChange} className="w-full text-xs" placeholder="Profit Center" /></td>
              <td className="border p-1"><input name="hired" value={newEmployee.hired} onChange={handleAddChange} className="w-full text-xs" placeholder="Hired" /></td>
              <td className="border p-1">
                <input 
                  name="quota" 
                  type="number"
                  min="0"
                  step="0.01"
                  value={newEmployee.quota} 
                  onChange={handleAddChange} 
                  className="w-full text-xs" 
                  placeholder="Quota"
                />
              </td>
              <td className="border p-1">
                <button onClick={handleAdd} className="text-green-700 text-xs">Add</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}