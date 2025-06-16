'use client';
// components/GuestEditor.jsx
import React, { useEffect, useState } from "react";

export default function GuestEditor() {
    const [guests, setGuests] = useState([]);
    const [editing, setEditing] = useState(null);
  
    useEffect(() => {
      fetch("http://localhost:8000/api/guests/all")
        .then((res) => res.json())
        .then(setGuests)
        .catch(console.error);
    }, []);
  
    const handleInputChange = (index, field, value) => {
      const newGuests = [...guests];
      newGuests[index][field] = value;
      setGuests(newGuests);
    };
  
    const saveChanges = (guest) => {
      fetch(`http://localhost:8000/api/guests/update/${guest.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guest),
      })
        .then((res) => res.json())
        .then(() => setEditing(null))
        .catch(console.error);
    };
  
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Guest Editor</h2>
        <table className="table-auto border w-full">
          <thead>
            <tr className="bg-gray-100">
              <th>ID</th>
              <th>First</th>
              <th>Last</th>
              <th>Email</th>
              <th>Visit Type</th>
              <th>Source</th>
              <th>Salesperson</th>
              <th>Phone</th>
              <th>Notes</th>
              <th>Created At</th> {/* 👈 Editable now */}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((guest, i) => (
              <tr key={guest.id}>
                {["id", "first_name", "last_name", "email", "visit_type", "source", "salesperson", "phone_mobile", "notes", "created_at"].map((field) => (
                  <td key={field} className="border px-2 py-1">
                    {editing === guest.id && field !== "id" ? (
                      <input
                        type={field === "created_at" ? "date" : "text"}
                        value={field === "created_at"
                          ? (guest[field] || "").slice(0, 10)  // strip time if present
                          : guest[field] || ""}
                        onChange={(e) => handleInputChange(i, field, e.target.value)}
                        className="border p-1 w-full"
                      />
                    ) : (
                      guest[field]
                    )}
                  </td>
                ))}
                <td className="border px-2 py-1">
                  {editing === guest.id ? (
                    <button className="text-green-600" onClick={() => saveChanges(guest)}>
                      ✅
                    </button>
                  ) : (
                    <button className="text-blue-600" onClick={() => setEditing(guest.id)}>
                      ✏️
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  