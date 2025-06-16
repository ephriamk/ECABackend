'use client';
import React, { useEffect, useState } from 'react';

type Membership = {
  id: number;
  membership_type: string;
  price: number;
  other_names: string;
};

export default function MembershipEditor() {
  const [list, setList] = useState<Membership[]>([]);
  const [editing, setEditing] = useState<Membership | null>(null);
  const [type, setType] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [others, setOthers] = useState('');

  // Point to your local backend instead of the remote URL:
  const API = 'http://localhost:8000/api/memberships';

  useEffect(() => {
    fetch(API)
      .then((r) => r.json())
      .then(setList);
  }, []);

  const resetForm = () => {
    setEditing(null);
    setType('');
    setPrice(0);
    setOthers('');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { membership_type: type, price, other_names: others };
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `${API}/${editing.id}` : API;

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const updated = await fetch(API).then((r) => r.json());
    setList(updated);
    resetForm();
  };

  const onEdit = (m: Membership) => {
    setEditing(m);
    setType(m.membership_type);
    setPrice(m.price);
    setOthers(m.other_names);
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Delete this membership?')) return;
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    setList(list.filter((m) => m.id !== id));
  };

  const styles = {
    container: {
      padding: 20,
      maxWidth: 700,
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif' as const,
      color: '#333',
    },
    header: {
      fontSize: 36,
      textAlign: 'center' as const,
      marginBottom: 24,
      background: 'linear-gradient(90deg, #0070f3, #79ffe1)',
      WebkitBackgroundClip: 'text' as const,
      WebkitTextFillColor: 'transparent' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: 2,
    },
    stickyCardWrapper: {
      position: 'sticky' as const,
      top: 20,
      zIndex: 10,
    },
    card: {
      backgroundColor: '#fff',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      padding: 20,
      marginBottom: 30,
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16,
      alignItems: 'center',
      marginBottom: 16,
    },
    label: {
      display: 'block',
      marginBottom: 4,
      fontWeight: 600,
    },
    input: {
      width: '100%',
      padding: '8px 10px',
      borderRadius: 4,
      border: '1px solid #ccc',
      fontSize: 14,
    },
    button: {
      padding: '10px 16px',
      borderRadius: 4,
      border: 'none',
      cursor: 'pointer',
      fontWeight: 600,
      marginRight: 8,
    },
    addButton: {
      backgroundColor: '#0070f3',
      color: '#fff',
    },
    cancelButton: {
      backgroundColor: '#aaa',
      color: '#fff',
    },
    tableContainer: {
      overflowX: 'auto' as const,
      borderRadius: 8,
      boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
    },
    th: {
      backgroundColor: '#f0f0f0',
      padding: '12px 8px',
      textAlign: 'left' as const,
      borderBottom: '2px solid #ddd',
    },
    td: {
      padding: '10px 8px',
      borderBottom: '1px solid #eee',
    },
    actionButton: {
      padding: '6px 10px',
      borderRadius: 4,
      border: 'none',
      cursor: 'pointer',
      fontSize: 12,
    },
    editBtn: {
      backgroundColor: '#ffc107',
      color: '#000',
      marginRight: 6,
    },
    deleteBtn: {
      backgroundColor: '#dc3545',
      color: '#fff',
    },
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Membership Editor</h1>

      <div style={styles.stickyCardWrapper}>
        <div style={styles.card}>
          <form onSubmit={onSubmit}>
            <div style={styles.formGrid}>
              <div>
                <label style={styles.label}>Type</label>
                <input
                  style={styles.input}
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={styles.label}>Price</label>
                <input
                  style={styles.input}
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setPrice(isNaN(val) ? 0 : val);
                  }}
                  required
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={styles.label}>Other Names</label>
                <input
                  style={styles.input}
                  value={others}
                  onChange={(e) => setOthers(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{ ...styles.button, ...styles.addButton }}
            >
              {editing ? 'Save Changes' : 'Add Membership'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                style={{ ...styles.button, ...styles.cancelButton }}
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Price</th>
              <th style={styles.th}>Other Names</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((m, i) => (
              <tr
                key={m.id}
                style={{
                  backgroundColor: i % 2 === 0 ? '#fff' : '#f9f9f9',
                }}
              >
                <td style={styles.td}>{m.membership_type}</td>
                <td style={styles.td}>{m.price.toFixed(2)}</td>
                <td style={styles.td}>{m.other_names}</td>
                <td style={styles.td}>
                  <button
                    onClick={() => onEdit(m)}
                    style={{ ...styles.actionButton, ...styles.editBtn }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(m.id)}
                    style={{ ...styles.actionButton, ...styles.deleteBtn }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
