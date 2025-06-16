import React, { useEffect, useState } from "react";

export default function GuestTrafficTable() {
  const [visitMTD, setVisitMTD] = useState({});
  const [visitYesterday, setVisitYesterday] = useState({});
  const [selectedGuests, setSelectedGuests] = useState<any[]>([]);
  const [modalTitle, setModalTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const internalTypes = ["Buddy Referral", "Former Member", "Corporate", "Underage"];
  const externalTypes = ["Advertising", "Out of Area", "Other"];
  const classPass = "Class Pass";
  const paidPass = "Paid Pass";

  const getCount = (data: Record<string, number>, type: string) => data[type] || 0;

  // 1. Extracted loader
  const loadVisitTypes = async () => {
    setError(null);
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/guests/visit-types`;
    console.log("📊 Fetching visit types from:", url);

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();

      const sourceMap: Record<string, string> = {
        "Buddy Referral": "Buddy Referral",
        "Buddy Referral (Member/Family/Friend)": "Buddy Referral",
        "Former Member": "Former Member",
        "Corporate": "Corporate",
        "Advertising": "Advertising",
        "Advertising (Social Media/TV/Internet)": "Advertising",
        "tagJOIN": "Advertising",
        "29 Day Pass": "Advertising",
        "Out of Town Guest": "Out of Area",
        "Class Pass": "Class Pass",
        "Under 18 guest": "Underage",
        "Paid Pass": "Paid Pass",
        "": "Other",
        null: "Other",
      };

      const normalizeCounts = (rows: any[]) => {
        const counts: Record<string, number> = {};
        rows.forEach((row) => {
          if (row.source === 'Paid Pass') {
            counts['Paid Pass'] = (counts['Paid Pass'] || 0) + row.count;
          } else {
            const normalized = sourceMap[row.source] || "Other";
            counts[normalized] = (counts[normalized] || 0) + row.count;
          }
        });
        return counts;
      };

      setVisitMTD(normalizeCounts(data.visit_type_counts));
      setVisitYesterday(normalizeCounts(data.today_counts));
    } catch (err) {
      console.error("❌ Failed to fetch visit types:", err);
      setError("Unable to load guest traffic data.");
    }
  };

  useEffect(() => {
    loadVisitTypes();
  }, []);

  const fetchGuests = (dayType: string, category: string) => {
    // For Paid Pass and Other, use the exact source name for the backend
    let sourceParam = category;
    if (category === paidPass) sourceParam = paidPass;
    if (category === 'Other') sourceParam = 'Other'; // Explicitly send 'Other' for the backend mapping
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/guests/by-source?day=${dayType}&source=${encodeURIComponent(sourceParam)}`;
    console.log("🔍 Fetching guests from:", url);

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setSelectedGuests(data.guests);
        setModalTitle(`${dayType.toUpperCase()} – ${category}`);
      })
      .catch((err) => {
        console.error("❌ Guest detail fetch failed:", err);
      });
  };

  const handleProcessGuests = async () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/tools/process-guests`;
    console.log("📤 Processing guests, hitting:", url);

    try {
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();

      if (data.success) {
        alert(`✅ Processed ${data.rows_inserted} guests from CSV.`);
        // 2. Refresh counts immediately
        loadVisitTypes();
      } else {
        alert(`❌ Failed to process guests: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("❌ Error processing guest CSV:", err);
      alert("❌ Something went wrong while processing the guest CSV.");
    }
  };

  const calculateTotals = () => {
    const allTypes = [...internalTypes, ...externalTypes, classPass, paidPass];
    let totalToday = 0;
    let totalMTD = 0;

    allTypes.forEach((type) => {
      totalToday += getCount(visitYesterday, type);
      totalMTD += getCount(visitMTD, type);
    });

    return { totalToday, totalMTD };
  };

  const renderRow = (type: string) => {
    const mtd = getCount(visitMTD, type);
    const today = getCount(visitYesterday, type);
    return (
      <tr key={type}>
        <td className="border border-gray-300 p-1">{type}</td>
        <td
          className="border border-gray-300 p-1 text-center text-blue-600 cursor-pointer"
          onClick={() => fetchGuests("today", type)}
        >
          {today}
        </td>
        <td
          className="border border-gray-300 p-1 text-center text-blue-600 cursor-pointer"
          onClick={() => fetchGuests("mtd", type)}
        >
          {mtd}
        </td>
        <td className="border border-gray-300 p-1 text-center"></td>
        <td className="border border-gray-300 p-1 text-center">{mtd}</td>
      </tr>
    );
  };

  const { totalToday, totalMTD } = calculateTotals();

  return (
    <div className="mb-4 border border-gray-300 relative">
      {error && <div className="text-red-500 p-2">{error}</div>}

      <div className="flex justify-end p-2">
        <button
          onClick={handleProcessGuests}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
        >
          🧾 Process Guest CSV
        </button>
      </div>

      <div className="table-responsive">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["Guest Traffic", "Today", "MTD", "Quota", "Proj"].map((label, i) => (
                <th
                  key={i}
                  className="border border-gray-300 p-1 text-center bg-green-600 text-white"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {internalTypes.map((type) => renderRow(type))}
            {externalTypes.map((type) => renderRow(type))}
            {renderRow(classPass)}
            {renderRow(paidPass)}

            {/* Total row */}
            <tr className="font-bold italic bg-gray-100">
              <td className="border border-gray-300 p-1">Total</td>
              <td className="border border-gray-300 p-1 text-center">{totalToday}</td>
              <td className="border border-gray-300 p-1 text-center">{totalMTD}</td>
              <td className="border border-gray-300 p-1 text-center"></td>
              <td className="border border-gray-300 p-1 text-center">{totalMTD}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {selectedGuests.length > 0 && (
        <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="bg-white p-4 border rounded w-[90%] max-w-xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">{modalTitle}</h2>
              <button
                className="text-sm bg-red-500 text-white px-2 py-1 rounded"
                onClick={() => setSelectedGuests([])}
              >
                Close
              </button>
            </div>
            <ul className="list-disc list-inside text-sm">
              {selectedGuests.map((g, i) => (
                <li key={i}>
                  {g.first_name} {g.last_name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
