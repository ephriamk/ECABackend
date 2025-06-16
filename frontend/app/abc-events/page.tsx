"use client";
import React, { useEffect, useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

// Helper to flatten nested objects (1 level deep)
function flatten(obj: any, prefix = "") {
  let res: Record<string, any> = {};
  for (const key in obj) {
    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      for (const subKey in obj[key]) {
        res[`${prefix}${key}.${subKey}`] = obj[key][subKey];
      }
    } else if (Array.isArray(obj[key])) {
      // For arrays, show count and first item details if object
      res[`${prefix}${key}`] = obj[key].length;
      if (obj[key].length > 0 && typeof obj[key][0] === "object") {
        for (const subKey in obj[key][0]) {
          res[`${prefix}${key}[0].${subKey}`] = obj[key][0][subKey];
        }
      }
    } else {
      res[`${prefix}${key}`] = obj[key];
    }
  }
  return res;
}

export default function AbcEventsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventNameFilter, setEventNameFilter] = useState("");
  const [fetching, setFetching] = useState(false);

  // Load from DB by default
  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:8000/api/events/abcfinancial/db")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch events from DB");
        return res.json();
      })
      .then((json) => {
        setData(Array.isArray(json) ? json : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Fetch latest from API and store in DB
  const fetchLatest = () => {
    setFetching(true);
    setError(null);
    fetch("http://localhost:8000/api/events/abcfinancial/fetch", { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch from API");
        return res.json();
      })
      .then((json) => {
        setData(Array.isArray(json) ? json : []);
        setFetching(false);
      })
      .catch((err) => {
        setError(err.message);
        setFetching(false);
      });
  };

  if (loading) return <div className="p-8 text-center">Loading events...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  // Flatten all rows and collect all unique columns
  const flatData = data.map((row) => flatten(row));
  const columns = Array.from(new Set(flatData.flatMap((row) => Object.keys(row))));

  // Filter by eventName
  const filteredData = flatData.filter(row =>
    !eventNameFilter || (row["eventName"] || "").toLowerCase().includes(eventNameFilter.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">ABC Financial Events</h1>
      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="eventNameFilter" className="font-medium">Filter by Event Name:</label>
          <input
            id="eventNameFilter"
            type="text"
            className="border border-gray-300 rounded px-2 py-1"
            placeholder="e.g. 1st Workout"
            value={eventNameFilter}
            onChange={e => setEventNameFilter(e.target.value)}
          />
        </div>
        <button
          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          onClick={fetchLatest}
          disabled={fetching}
        >
          {fetching ? "Fetching..." : "Fetch Latest from API"}
        </button>
      </div>
      {!data.length && (
        <div className="p-8 text-center">No events found.</div>
      )}
      {data.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col}>{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row, i) => (
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