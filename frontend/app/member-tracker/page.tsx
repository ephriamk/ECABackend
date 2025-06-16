'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Users, 
  CheckCircle, 
  Calendar, 
  TrendingUp, 
  Filter,
  Search,
  Download,
  Plus,
  Edit,
  ChevronUp,
  ChevronDown,
  Star,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { format } from 'date-fns';

// Create a utility function to get the API base URL
const getApiBaseUrl = () => {
  // For server-side rendering or production browser environments
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

// Mock data generator for demonstration
const generateMockData = () => {
  const members = [];
  const enrollers = ['John Smith', 'Sarah Johnson', 'Mike Davis', 'Emily Wilson'];
  const membershipTypes = ['Premium', 'Standard', 'Basic', 'VIP'];
  
  for (let i = 1; i <= 50; i++) {
    members.push({
      id: i,
      memberId: '',
      memberNumber: `M${String(i).padStart(4, '0')}`,
      phoneNumber: `(555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      enrolledBy: enrollers[Math.floor(Math.random() * enrollers.length)],
      memberName: `Member ${i}`,
      membershipType: membershipTypes[Math.floor(Math.random() * membershipTypes.length)],
      agreementNumber: Math.random() > 0.1 ? `AGREE${i}` : 'PROSP',
      dateEnrolled: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toLocaleDateString(),
      ecaWayProductionStatus: Math.random() > 0.2 ? 'Active' : 'Inactive',
      firstWorkoutScheduledDate: Math.random() > 0.3 ? new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toLocaleDateString() : '',
      firstWorkoutCompletedDate: Math.random() > 0.5 ? new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toLocaleDateString() : '',
      firstWorkoutCompletedBy: Math.random() > 0.5 ? enrollers[Math.floor(Math.random() * enrollers.length)] : '',
      fiveStarReviewCompletedDate: Math.random() > 0.7 ? new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toLocaleDateString() : '',
      oneWeekShowHalfScheduleDate: Math.random() > 0.6 ? new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toLocaleDateString() : '',
      fiveStarReviewHalfScheduleDate: Math.random() > 0.6 ? new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toLocaleDateString() : '',
      followUpScheduledDate: Math.random() > 0.4 ? new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toLocaleDateString() : '',
      followUpCompletedDate: Math.random() > 0.6 ? new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toLocaleDateString() : '',
      followUpCompletedBy: Math.random() > 0.6 ? enrollers[Math.floor(Math.random() * enrollers.length)] : ''
    });
  }
  return members;
};

// Helper to format dates
function formatDate(dateStr: string, withTime = false) {
  if (!dateStr) return '';
  // Parse YYYY-MM-DD as local date to avoid timezone shift
  const parts = dateStr.split('-');
  if (
    parts.length === 3 &&
    parts.every((p) => /^\d+$/.test(p)) &&
    Number(parts[0]) > 1900 && // year sanity check
    Number(parts[1]) >= 1 && Number(parts[1]) <= 12 &&
    Number(parts[2]) >= 1 && Number(parts[2]) <= 31
  ) {
    const [year, month, day] = parts.map(Number);
    const d = new Date(year, month - 1, day);
    if (isNaN(d.getTime())) return '';
    return withTime
      ? format(d, 'MM/dd/yyyy HH:mm')
      : format(d, 'MM/dd/yyyy');
  }
  // Fallback for other formats
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return withTime
    ? format(d, 'MM/dd/yyyy HH:mm')
    : format(d, 'MM/dd/yyyy');
}

// Helper to get start and end date for the selected month
function getMonthRange(year: number, month: string) {
  const monthsMap: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };
  if (!month || month === 'All' || !monthsMap[month]) {
    // If 'All', return full year
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
  const m = monthsMap[month];
  const start = `${year}-${m}-01`;
  const end = new Date(year, parseInt(m), 0); // last day of month
  return {
    start,
    end: `${year}-${m}-${String(end.getDate()).padStart(2, '0')}`
  };
}

export default function NewMemberTracker() {
  const [data, setData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // State for filters, sorting, and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'dateEnrolled', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState(new Set());
  
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500); // Debounce search input

  const PAGE_SIZE = 25;
  const currentMonthIndex = new Date().getMonth();
  const months = ['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [selectedMonth, setSelectedMonth] = useState(months[currentMonthIndex + 1]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [monthlyTotals, setMonthlyTotals] = useState<{first_workouts_completed: number, thirty_day_reprograms_completed: number} | null>(null);
  const [totalsLoading, setTotalsLoading] = useState(false);

  const [exporting, setExporting] = useState(false);

  // The single, optimized data fetching function
  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(PAGE_SIZE),
      sort_by: sortConfig.key,
      sort_order: sortConfig.direction,
      selected_month: selectedMonth,
      selected_year: String(selectedYear),
      search_term: debouncedSearchTerm,
    });

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/member-tracker/data?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      setData(result.data || []);
      setTotalRecords(result.total || 0);
    } catch (error) {
      console.error("Failed to fetch member tracker data:", error);
      setData([]); // Clear data on error
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [page, sortConfig, selectedMonth, selectedYear, debouncedSearchTerm]);

  // useEffect to fetch data whenever dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, selectedMonth, selectedYear]);

  useEffect(() => {
    const { start, end } = getMonthRange(selectedYear, selectedMonth);
    if (!start || !end) {
      setMonthlyTotals(null);
      return;
    }
    setTotalsLoading(true);
    fetch(`${getApiBaseUrl()}/api/api-events/monthly-completions?start_date=${start}&end_date=${end}`)
      .then(res => res.json())
      .then(json => setMonthlyTotals(json))
      .catch(() => setMonthlyTotals(null))
      .finally(() => setTotalsLoading(false));
  }, [selectedYear, selectedMonth]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(data.map((m) => m.memberId)));
    }
  };

  const handleSelectRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };
  
  const isOverdue = (scheduledDate: string, completedDate: string) => {
    if (!scheduledDate || completedDate) return false;
    const scheduled = new Date(scheduledDate);
    const today = new Date();
    return scheduled < today;
  };

  const stats = useMemo(() => {
    // Note: These stats are for the *current page* only.
    // For global stats, a separate endpoint would be needed.
    return {
      totalMembers: totalRecords,
      activeMembers: data.filter(m => m.ecaWayProductionStatus === 'Active').length,
      completedWorkouts: data.filter(m => m.firstWorkoutCompletedDate).length,
    };
  }, [data, totalRecords]);

  // Add a helper to compute membership type breakdown for the current page
  const membershipTypeBreakdown = useMemo(() => {
    if (!data.length) return [];
    const counts: Record<string, number> = {};
    data.forEach(m => {
      const type = m.membershipType || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    const total = data.length;
    return Object.entries(counts).map(([type, count]) => ({
      type,
      count,
      percent: Math.round((count / total) * 100)
    }));
  }, [data]);

  const handleExport = async () => {
    setExporting(true);
    const params = new URLSearchParams({
      selected_month: selectedMonth,
      selected_year: String(selectedYear),
      search_term: debouncedSearchTerm,
      // Omitting page and page_size to fetch all data
    });

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/member-tracker/data?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch data for export');
      
      const result = await response.json();
      const allData = result.data || [];

      if (allData.length === 0) {
        alert("No data to export for the current selection.");
        return;
      }

      const headers = Object.keys(allData[0]);
      const csvRows = [
        headers.join(','),
        ...allData.map(row =>
          headers.map(fieldName =>
            JSON.stringify(row[fieldName] ?? '', (key, value) => value ?? '')
          ).join(',')
        )
      ];
      
      const csvString = csvRows.join('\\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `member_tracker_${selectedYear}_${selectedMonth}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("Failed to export data:", error);
      alert("An error occurred during export.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">New Member Tracker</h1>
              <p className="mt-1 text-sm text-gray-500">
                Displaying {totalRecords} total members.
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex gap-2">
              <button 
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                onClick={handleExport}
                disabled={exporting}
              >
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {monthlyTotals && (
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg shadow p-4 flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <div className="text-xs text-gray-500">1st Workouts Completed ({selectedMonth} {selectedYear})</div>
                <div className="text-2xl font-bold text-green-700">{monthlyTotals.first_workouts_completed}</div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg shadow p-4 flex items-center">
              <Star className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <div className="text-xs text-gray-500">30 Day Reprograms Completed ({selectedMonth} {selectedYear})</div>
                <div className="text-2xl font-bold text-purple-700">{monthlyTotals.thirty_day_reprograms_completed}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards (reflecting current page data) */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500">Total Members</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalMembers}</p>
              </div>
              <Users className="h-12 w-12 text-blue-500 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500">Membership Type % (Page)</p>
                <div className="mt-2 space-y-1">
                  {membershipTypeBreakdown.map(mt => (
                    <div key={mt.type} className="flex justify-between text-xs">
                      <span className="font-medium text-gray-700">{mt.type}</span>
                      <span className="text-gray-500">{mt.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <Users className="h-12 w-12 text-yellow-500 opacity-20" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500">Completed Workouts (Page)</p>
                <p className="mt-2 text-3xl font-bold text-blue-600">{stats.completedWorkouts}</p>
              </div>
              <TrendingUp className="h-12 w-12 text-blue-500 opacity-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, member number, or phone..."
                className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <select
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Table */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-16">Loading...</div>
            ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                {/* Section Grouping Row */}
                <tr className="bg-gray-50">
                  <th colSpan={6} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 border-b-2 border-blue-200">Member Details</th>
                  <th colSpan={4} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50 border-b-2 border-green-200">1st Work Outs</th>
                  <th colSpan={2} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50 border-b-2 border-yellow-200">Maintenance Fee</th>
                  <th colSpan={3} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50 border-b-2 border-purple-200">30 Day Reprogram</th>
                  <th colSpan={2} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-pink-50 border-b-2 border-pink-200">Other</th>
                </tr>
                {/* Column Header Row */}
                <tr className="bg-gray-100">
                  {/* Member Details */}
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Member #</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Phone #</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200" onClick={() => handleSort('enrolledBy')}>
                    <div className="flex items-center">
                      Enrolled By
                      {sortConfig.key === 'enrolledBy' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200" onClick={() => handleSort('memberName')}>
                    <div className="flex items-center">
                      Member Name
                      {sortConfig.key === 'memberName' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Membership Type</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200" onClick={() => handleSort('dateEnrolled')}>
                    <div className="flex items-center">
                      Date Enrolled
                      {sortConfig.key === 'dateEnrolled' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  {/* 1st Work Outs */}
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200" onClick={() => handleSort('firstWorkoutScheduledDate')}>
                    <div className="flex items-center">
                      Scheduled Date
                      {sortConfig.key === 'firstWorkoutScheduledDate' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200" onClick={() => handleSort('firstWorkoutCompletedDate')}>
                    <div className="flex items-center">
                      Completed Date
                      {sortConfig.key === 'firstWorkoutCompletedDate' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200" onClick={() => handleSort('firstWorkoutCompletedBy')}>
                    <div className="flex items-center">
                      Completed By
                      {sortConfig.key === 'firstWorkoutCompletedBy' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">5 Star Review</th>
                  {/* Maintenance Fee */}
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">1W Show Half</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">5 Star Review Half</th>
                  {/* 30 Day Reprogram */}
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200" onClick={() => handleSort('thirtyDayReprogramScheduledDate')}>
                    <div className="flex items-center">
                      Scheduled Date
                      {sortConfig.key === 'thirtyDayReprogramScheduledDate' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200" onClick={() => handleSort('thirtyDayReprogramCompletedDate')}>
                    <div className="flex items-center">
                      Completed Date
                      {sortConfig.key === 'thirtyDayReprogramCompletedDate' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200" onClick={() => handleSort('thirtyDayReprogramCompletedBy')}>
                    <div className="flex items-center">
                      Completed By
                      {sortConfig.key === 'thirtyDayReprogramCompletedBy' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  {/* Other */}
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">ECA WAY</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Production PT/BR/UPG</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((member) => (
                  <tr key={member.memberId} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap text-sm">{member.agreementNumber}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">{member.primaryPhone}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">{member.enrolledBy}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">{member.memberName}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">{member.membershipType}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">{formatDate(member.dateEnrolled)}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">{formatDate(member.firstWorkoutScheduledDate, true)}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">{formatDate(member.firstWorkoutCompletedDate, true)}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">{member.firstWorkoutCompletedBy}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">{formatDate(member.fiveStarReviewCompletedDate, true)}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">{formatDate(member.oneWeekShowHalfScheduleDate, true)}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">{formatDate(member.fiveStarReviewHalfScheduleDate, true)}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">{formatDate(member.thirtyDayReprogramScheduledDate, true)}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">{formatDate(member.thirtyDayReprogramCompletedDate, true)}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">{member.thirtyDayReprogramCompletedBy}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">{member.ecaWayProductionStatus}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">{member.productionPTBRUPG || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
          
          {/* Pagination */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(page - 1) * PAGE_SIZE + 1}</span> to <span className="font-medium">{Math.min(page * PAGE_SIZE, totalRecords)}</span> of{' '}
                <span className="font-medium">{totalRecords}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
                <span className="px-4">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
              </nav>
            </div>
          </div>
        </div>
      </div>
      {/* Month Tabs */}
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-center border-t border-gray-200">
        <div className="flex gap-2 flex-wrap">
          {months.map((month) => (
            <button
              key={month}
              className={`px-3 py-1 rounded-full text-sm font-medium border ${selectedMonth === month ? 'bg-blue-600 text-white' : 'bg-white'}`}
              onClick={() => setSelectedMonth(month)}
            >
              {month}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}