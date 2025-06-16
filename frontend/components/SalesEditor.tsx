"use client";
import React, { useEffect, useState } from "react";

interface Sale {
  sale_id: string;
  agreement_number: string;
  profit_center: string;
  member_name: string;
  membership_type: string;
  agreement_type: string;
  agreement_payment_plan: string;
  total_amount: number;
  transaction_count: number;
  sales_person: string;
  commission_employees: string;
  payment_method: string;
  main_item: string;
  latest_payment_date: string;
  manual_override?: number;
}

interface Employee { name: string }

const API_BASE = "http://localhost:8000";

export default function SalesEditor() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    member_name: "",
    agreement_number: "",
    agreement_payment_plan: "",
    commission_employees: "",
    profit_center: "",
    latest_payment_date: "",
  });

  // Load all sales and employees on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/sales/all`)
      .then((res) => {
        if (!res.ok) throw new Error(`Fetch error ${res.status}`);
        return res.json();
      })
      .then((data: Sale[]) => setSales(data))
      .catch((err) => console.error("Load error:", err))
      .finally(() => setLoading(false));
    // Fetch employees
    fetch(`${API_BASE}/api/employees`)
      .then((res) => {
        if (!res.ok) throw new Error(`Fetch employees error ${res.status}`);
        return res.json();
      })
      .then((data: Employee[]) => setEmployees(data))
      .catch((err) => console.error("Employee load error:", err));
  }, []);

  // Local edit helper
  const updateField = (
    id: string,
    field: keyof Omit<Sale, "sale_id">,
    value: string | number
  ) => {
    setSales((prev) =>
      prev.map((s) =>
        s.sale_id === id ? { ...s, [field]: value } : s
      )
    );
  };

  // Save back to API (only for existing rows)
  const saveRow = (sale: Sale) => {
    if (!sale.sale_id) {
      console.warn("Cannot save a row without a sale_id yet");
      return;
    }
    const { sale_id, ...body } = sale;
    // Always send manual_override (default to 0 if undefined)
    body.manual_override = sale.manual_override ?? 0;
    fetch(`${API_BASE}/api/sales/${encodeURIComponent(sale_id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Save failed ${res.status}`);
        console.log(`Sale ${sale_id} saved`);
      })
      .catch((err) => console.error("Save error:", err));
  };

  // Create a brand-new sale
  const addRow = () => {
    const template: Omit<Sale, "sale_id"> = {
      agreement_number: "",
      profit_center: "",
      member_name: "",
      membership_type: "",
      agreement_type: "",
      agreement_payment_plan: "",
      total_amount: 0,
      transaction_count: 0,
      sales_person: "",
      commission_employees: "",
      payment_method: "",
      main_item: "",
      latest_payment_date: "",
    };

    fetch(`${API_BASE}/api/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(template),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Create failed ${res.status}`);
        return res.json();
      })
      .then((res) => {
        console.log("Created sale", res.sale_id);
        setSales((prev) => [
          ...prev,
          { ...template, sale_id: res.sale_id },
        ]);
      })
      .catch((err) => console.error("Create error:", err));
  };

  // Delete an existing sale
  const deleteRow = (id: string) => {
    if (!id) {
      console.warn("Cannot delete a row without a sale_id");
      return;
    }
    fetch(`${API_BASE}/api/sales/${encodeURIComponent(id)}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error(`Delete failed ${res.status}`);
        console.log(`Deleted sale ${id}`);
        setSales((prev) => prev.filter((s) => s.sale_id !== id));
      })
      .catch((err) => console.error("Delete error:", err));
  };

  // Apply filters
  const filteredSales = sales.filter((s) =>
    String(s.member_name || "")
      .toLowerCase()
      .includes(filters.member_name.toLowerCase()) &&
    String(s.agreement_number || "")
      .toLowerCase()
      .includes(filters.agreement_number.toLowerCase()) &&
    String(s.agreement_payment_plan || "")
      .toLowerCase()
      .includes(filters.agreement_payment_plan.toLowerCase()) &&
    String(s.commission_employees || "")
      .toLowerCase()
      .includes(filters.commission_employees.toLowerCase()) &&
    String(s.profit_center || "")
      .toLowerCase()
      .includes(filters.profit_center.toLowerCase()) &&
    String(s.latest_payment_date || "")
      .toLowerCase()
      .includes(filters.latest_payment_date.toLowerCase())
  );

  if (loading) return <div>Loading sales…</div>;

  return (
    <div className="p-4">
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="border p-1"
          placeholder="Member Name"
          value={filters.member_name}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              member_name: e.target.value,
            }))
          }
        />
        <input
          className="border p-1"
          placeholder="Agreement #"
          value={filters.agreement_number}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              agreement_number: e.target.value,
            }))
          }
        />
        <input
          className="border p-1"
          placeholder="Agreement Payment Plan"
          value={filters.agreement_payment_plan}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              agreement_payment_plan: e.target.value,
            }))
          }
        />
        <input
          className="border p-1"
          placeholder="Commission Employees"
          value={filters.commission_employees}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              commission_employees: e.target.value,
            }))
          }
        />
        <input
          className="border p-1"
          placeholder="Profit Center"
          value={filters.profit_center}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              profit_center: e.target.value,
            }))
          }
        />
        <input
          className="border p-1"
          type="date"
          placeholder="Latest Date"
          value={filters.latest_payment_date}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              latest_payment_date: e.target.value,
            }))
          }
        />
      </div>

      {/* Add button */}
      <button
        onClick={addRow}
        className="mb-2 px-3 py-1 bg-green-500 text-white rounded"
      >
        + Add Sale
      </button>

      {/* Table */}
      <div className="overflow-auto">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className="border p-1">ID</th>
              <th className="border p-1">Agreement #</th>
              <th className="border p-1">Profit Center</th>
              <th className="border p-1">Member Name</th>
              <th className="border p-1">Membership Type</th>
              <th className="border p-1">Agreement Type</th>
              <th className="border p-1">Payment Plan</th>
              <th className="border p-1">Total Amount</th>
              <th className="border p-1">Txn Count</th>
              <th className="border p-1">Sales Person</th>
              <th className="border p-1">Commission Emp.</th>
              <th className="border p-1">Payment Method</th>
              <th className="border p-1">Main Item</th>
              <th className="border p-1">Latest Date</th>
              <th className="border p-1">Manual Override</th>
              <th className="border p-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((s) => (
              <tr key={s.sale_id}>
                <td className="border p-1">{s.sale_id}</td>
                {/* Editable cells */}
                <td className="border p-1">
                  <input
                    className="w-full"
                    value={s.agreement_number || ""}
                    onChange={(e) =>
                      updateField(
                        s.sale_id,
                        "agreement_number",
                        e.target.value
                      )
                    }
                  />
                </td>
                <td className="border p-1">
                  <input
                    className="w-full"
                    value={s.profit_center || ""}
                    onChange={(e) =>
                      updateField(s.sale_id, "profit_center", e.target.value)
                    }
                  />
                </td>
                <td className="border p-1">
                  <input
                    className="w-full"
                    value={s.member_name || ""}
                    onChange={(e) =>
                      updateField(s.sale_id, "member_name", e.target.value)
                    }
                  />
                </td>
                <td className="border p-1">
                  <input
                    className="w-full"
                    value={s.membership_type || ""}
                    onChange={(e) =>
                      updateField(
                        s.sale_id,
                        "membership_type",
                        e.target.value
                      )
                    }
                  />
                </td>
                <td className="border p-1">
                  <input
                    className="w-full"
                    value={s.agreement_type || ""}
                    onChange={(e) =>
                      updateField(s.sale_id, "agreement_type", e.target.value)
                    }
                  />
                </td>
                <td className="border p-1">
                  <input
                    className="w-full"
                    value={s.agreement_payment_plan || ""}
                    onChange={(e) =>
                      updateField(
                        s.sale_id,
                        "agreement_payment_plan",
                        e.target.value
                      )
                    }
                  />
                </td>
                <td className="border p-1">
                  <input
                    type="number"
                    className="w-full"
                    value={s.total_amount ?? ""}
                    onChange={(e) =>
                      updateField(
                        s.sale_id,
                        "total_amount",
                        parseFloat(e.target.value)
                      )
                    }
                  />
                </td>
                <td className="border p-1">
                  <input
                    type="number"
                    className="w-full"
                    value={s.transaction_count ?? ""}
                    onChange={(e) =>
                      updateField(
                        s.sale_id,
                        "transaction_count",
                        parseInt(e.target.value, 10)
                      )
                    }
                  />
                </td>
                <td className="border p-1">
                  <input
                    className="w-full"
                    value={s.sales_person || ""}
                    onChange={(e) =>
                      updateField(s.sale_id, "sales_person", e.target.value)
                    }
                  />
                </td>
                <td className="border p-1">
                  {/* Commission Employees dropdown */}
                  <select
                    className="w-full"
                    value={s.commission_employees || ""}
                    onChange={e =>
                      updateField(
                        s.sale_id,
                        "commission_employees",
                        e.target.value
                      )
                    }
                  >
                    <option value="">-- Select --</option>
                    {/* If current value is not in employees and not empty, show it as an option */}
                    {s.commission_employees &&
                      !employees.some(emp => emp.name === s.commission_employees) && (
                        <option value={s.commission_employees}>{s.commission_employees}</option>
                      )}
                    {employees.map(emp => (
                      <option key={emp.name} value={emp.name}>{emp.name}</option>
                    ))}
                  </select>
                </td>
                <td className="border p-1">
                  <input
                    className="w-full"
                    value={s.payment_method || ""}
                    onChange={(e) =>
                      updateField(s.sale_id, "payment_method", e.target.value)
                    }
                  />
                </td>
                <td className="border p-1">
                  <input
                    className="w-full"
                    value={s.main_item || ""}
                    onChange={(e) =>
                      updateField(s.sale_id, "main_item", e.target.value)
                    }
                  />
                </td>
                <td className="border p-1">
                  <input
                    type="date"
                    className="w-full"
                    value={s.latest_payment_date || ""}
                    onChange={(e) =>
                      updateField(
                        s.sale_id,
                        "latest_payment_date",
                        e.target.value
                      )
                    }
                  />
                </td>
                <td className="border p-1 text-center">
                  <input
                    type="checkbox"
                    checked={!!s.manual_override}
                    onChange={e => updateField(s.sale_id, "manual_override", e.target.checked ? 1 : 0)}
                  />
                </td>
                <td className="border p-1 space-x-1">
                  <button
                    onClick={() => saveRow(s)}
                    className="px-2 py-1 bg-blue-500 text-white rounded"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => deleteRow(s.sale_id)}
                    className="px-2 py-1 bg-red-500 text-white rounded"
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
