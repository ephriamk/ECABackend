"use client";
import React, { useEffect, useState } from "react";
import { startOfMonth, endOfMonth, format, parseISO } from "date-fns";

function addDays(dateStr: string, days: number) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function ApiEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventNameFilter, setEventNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));

  // Helper to get start and end date for a month
  function getMonthRange(monthStr: string) {
    if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
      // fallback to current month
      const now = new Date();
      return {
        start: format(startOfMonth(now), "yyyy-MM-dd"),
        end: format(endOfMonth(now), "yyyy-MM-dd"),
      };
    }
    const date = parseISO(monthStr + "-01");
    return {
      start: format(startOfMonth(date), "yyyy-MM-dd"),
      end: format(endOfMonth(date), "yyyy-MM-dd"),
    };
  }

  // Fetch events from DB for a month
  const loadEvents = () => {
    setLoading(true);
    const { start, end } = getMonthRange(month);
    const url = `http://localhost:8000/api/api-events/db?start_date=${start}&end_date=${end}`;
    console.log("Fetching events for month:", month, "URL:", url);
    fetch(url)
      .then(res => res.json())
      .then(json => {
        setEvents(Array.isArray(json) ? json : []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line
  }, [month]);

  // Fetch latest from API and reload
  const fetchLatest = () => {
    setFetching(true);
    setError(null);
    fetch("http://localhost:8000/api/api-events/fetch", { method: "POST" })
      .then(res => res.json())
      .then(() => {
        setFetching(false);
        loadEvents();
      })
      .catch(err => {
        setError(err.message);
        setFetching(false);
      });
  };

  // Get all unique columns, but hide some
  const hiddenColumns = ["startBookingTime", "stopBookingTime", "eventTrainingLevel"];
  const columns = Array.from(new Set(events.flatMap(e => Object.keys(e)))).filter(col => !hiddenColumns.includes(col));

  // Filtering logic
  const filteredEvents = events.filter(event => {
    const matchesEventName = !eventNameFilter || (event.eventName || "").toLowerCase().includes(eventNameFilter.toLowerCase());
    const matchesStatus = !statusFilter || (event.status || "").toLowerCase() === statusFilter.toLowerCase();
    return matchesEventName && matchesStatus;
  });

  // Helper to flatten nested objects
  const renderCell = (value: any) => {
    if (typeof value === "object" && value !== null) {
      return <span className="text-xs text-gray-500">{JSON.stringify(value)}</span>;
    }
    return String(value ?? "");
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">API Events</h1>
      <div className="mb-4 flex gap-4 items-center flex-wrap">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          onClick={fetchLatest}
          disabled={fetching}
        >
          {fetching ? "Fetching..." : "Refresh (Fetch Latest)"}
        </button>
        <input
          type="text"
          className="border border-gray-300 rounded px-2 py-1"
          placeholder="Filter by event name..."
          value={eventNameFilter}
          onChange={e => setEventNameFilter(e.target.value)}
        />
        <input
          type="text"
          className="border border-gray-300 rounded px-2 py-1"
          placeholder="Filter by status..."
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        />
        <input
          type="month"
          className="border border-gray-300 rounded px-2 py-1"
          value={month}
          min="2025-01"
          max="2025-07"
          onChange={e => setMonth(e.target.value || format(new Date(), "yyyy-MM"))}
        />
        <button
          className="ml-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          onClick={() => {
            setEventNameFilter("");
            setStatusFilter("");
          }}
          title="Show all events"
        >
          Show All
        </button>
        {loading && <span>Loading events...</span>}
        {error && <span className="text-red-500">Error: {error}</span>}
      </div>
      <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} className="px-2 py-1 border-b text-left font-semibold">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((event, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {columns.map(col => (
                  <td key={col} className="px-2 py-1 border-b">
                    {renderCell(event[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredEvents.length === 0 && !loading && (
          <div className="p-8 text-center text-gray-500">No events found.</div>
        )}
      </div>
    </div>
  );
} 