"use client";
import React, { useEffect, useState, useRef } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export default function MembersPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' | null }>({ key: null, direction: null });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const [columns, setColumns] = useState<string[]>([]);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [searchMode, setSearchMode] = useState(false);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setPage(1);
  }, [search, columnFilters]);

  // Fetch members from backend (paginated/filter/sort/search)
  useEffect(() => {
    setLoading(true);
    setError(null);
    let url = "http://localhost:8000/api/members/paginated?" +
      `page=${page}&page_size=${PAGE_SIZE}`;
    if (sortConfig.key && sortConfig.direction) {
      url += `&sort_by=${encodeURIComponent(sortConfig.key)}&sort_order=${sortConfig.direction}`;
    }
    Object.entries(columnFilters).forEach(([col, val]) => {
      if (val) url += `&${encodeURIComponent(col)}=${encodeURIComponent(val)}`;
    });
    if (searchMode && search) {
      url = `http://localhost:8000/api/members/search?query=${encodeURIComponent(search)}&page=${page}&page_size=${PAGE_SIZE}`;
    }
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch members");
        return res.json();
      })
      .then((json) => {
        setData(json.members || []);
        setTotal(json.total || 0);
        if (json.members && json.members.length > 0) {
          const allCols = Array.from(new Set((json.members as any[]).flatMap((row: any) => Object.keys(row)) as string[]));
          // Desired order
          const desiredOrder = [
            'firstName', 'lastName', 'email', 'salesPersonName', 'sinceDate', 'primaryPhone',
            'agreementNumber', 'membershipType', 'totalCheckInCount',
            'firstCheckInTimestamp', 'lastCheckInTimestamp', 'memberId'
          ];
          // Place columns in desired order, then append any extras
          const orderedCols = [
            ...desiredOrder.filter(col => allCols.includes(col)),
            ...allCols.filter(col => !desiredOrder.includes(col))
          ];
          setColumns(orderedCols);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [page, PAGE_SIZE, sortConfig, columnFilters, search, searchMode]);

  // Fetch latest from API and store in DB
  const fetchLatest = () => {
    setFetching(true);
    setError(null);
    fetch("http://localhost:8000/api/members/fetch", { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch from API");
        return res.json();
      })
      .then(() => {
        setFetching(false);
        setPage(1); // reload first page
      })
      .catch((err) => {
        setError(err.message);
        setFetching(false);
      });
  };

  // Debounced search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchMode(!!value);
    }, 300);
  };

  // Sorting handler
  const handleSort = (col: string) => {
    setSortConfig((prev) => {
      if (prev.key !== col) return { key: col, direction: 'asc' };
      if (prev.direction === 'asc') return { key: col, direction: 'desc' };
      if (prev.direction === 'desc') return { key: null, direction: null };
      return { key: col, direction: 'asc' };
    });
  };

  // Column filter handler
  const handleColumnFilter = (col: string, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [col]: value }));
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Members</h1>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <input
          type="text"
          className="border border-gray-300 rounded px-2 py-1"
          placeholder="Search all fields..."
          value={search}
          onChange={handleSearch}
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          onClick={fetchLatest}
          disabled={fetching}
        >
          {fetching ? "Fetching..." : "Fetch Latest from API"}
        </button>
      </div>
      {/* Per-column filters */}
      <div className="mb-2 flex flex-wrap gap-2">
        {columns.map((col) => (
          <input
            key={col}
            type="text"
            className="border border-gray-200 rounded px-2 py-1 text-xs"
            placeholder={`Filter ${col}`}
            value={columnFilters[col] || ""}
            onChange={e => handleColumnFilter(col, e.target.value)}
            style={{ minWidth: 120 }}
          />
        ))}
      </div>
      {/* Pagination controls */}
      <div className="mb-2 flex items-center gap-2">
        <button
          className="px-2 py-1 border rounded disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span>Page {page} of {totalPages}</span>
        <button
          className="px-2 py-1 border rounded disabled:opacity-50"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
      {loading && <div className="p-8 text-center">Loading members...</div>}
      {error && <div className="p-8 text-center text-red-500">Error: {error}</div>}
      {!loading && !data.length && (
        <div className="p-8 text-center">No members found.</div>
      )}
      {data.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col}
                    onClick={() => handleSort(col)}
                    className="cursor-pointer select-none"
                  >
                    {col}
                    {sortConfig.key === col && (sortConfig.direction === 'asc' ? ' ▲' : sortConfig.direction === 'desc' ? ' ▼' : '')}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col}>
                      {row[col] === undefined ? "" : String(row[col])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
} 