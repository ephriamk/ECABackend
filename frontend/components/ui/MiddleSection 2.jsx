"use client";

import { useEffect, useState } from "react";

export default function MiddleSection() {
  const [nbPromo, setNbPromo] = useState({
    today: null,
    mtd: null,
    nb_yesterday: null,
  });

  useEffect(() => {
    fetch("http://localhost:8000/api/sales/nb-promo")
      .then((res) => res.json())
      .then((json) => setNbPromo(json))
      .catch((err) => console.error("Failed to fetch NB Promo data:", err));
  }, []);

  const quota = 50000;
  const projected = nbPromo.mtd || 0;
  const percentQuota = quota > 0 ? Math.round((projected / quota) * 100) : 0;
  const formatCurrency = (value) =>
    typeof value === "number" ? value.toLocaleString() : "--";

  return (
    <div className="mb-4 border border-gray-300 p-2">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4">
        {/* Left Column (trimmed for brevity) */}
        <div className="lg:col-span-4">
          {/* Example Left Section */}
          <div id="advertising-section" className="mb-4 border border-gray-300">
            <div className="table-responsive">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 bg-green-500 p-1 font-bold">Advertising - McKayla & Rick</td>
                    <td className="border border-gray-300 p-1 text-center font-bold">98%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-8">
          <div id="club-totals-table" className="mb-4 border border-gray-300">
            <div className="table-responsive">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-green-500 p-1 text-left">Club Totals</th>
                    <th className="border border-gray-300 bg-green-500 p-1 text-center">Today</th>
                    <th className="border border-gray-300 bg-green-500 p-1 text-center">MTD</th>
                    <th className="border border-gray-300 bg-green-500 p-1 text-center">Quota</th>
                    <th className="border border-gray-300 bg-green-500 p-1 text-center">Proj</th>
                    <th className="border border-gray-300 bg-green-500 p-1 text-center">% Quota</th>
                    <th className="border border-gray-300 bg-green-500 p-1 text-center">Yesterday</th>
                    <th className="border border-gray-300 bg-green-500 p-1 text-center">Quota</th>
                    <th className="border border-gray-300 bg-green-500 p-1 text-center">Proj</th>
                    <th className="border border-gray-300 bg-green-500 p-1 text-center">% Quota</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-1">NB / Promo</td>
                    <td className="border border-gray-300 p-1 text-center">{formatCurrency(nbPromo.today)}</td>
                    <td className="border border-gray-300 p-1 text-center">{formatCurrency(nbPromo.mtd)}</td>
                    <td className="border border-gray-300 p-1 text-center bg-gray-300">{quota.toLocaleString()}</td>
                    <td className="border border-gray-300 p-1 text-center">{formatCurrency(projected)}</td>
                    <td className="border border-gray-300 p-1 text-center">{nbPromo.mtd != null ? `${percentQuota}%` : "--"}</td>
                    <td className="border border-gray-300 p-1 text-center">{formatCurrency(nbPromo.nb_yesterday)}</td>
                    <td className="border border-gray-300 p-1 text-center bg-gray-300">17,823</td>
                    <td className="border border-gray-300 p-1 text-center">{formatCurrency(nbPromo.nb_yesterday)}</td>
                    <td className="border border-gray-300 p-1 text-center">{nbPromo.nb_yesterday != null ? `${Math.round((nbPromo.nb_yesterday / 17823) * 100)}%` : "--"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
