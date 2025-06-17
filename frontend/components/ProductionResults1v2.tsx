// SKELETON CLONE OF ProductionResults1.tsx FOR API v2
'use client'

import React from 'react'

const GROUP_HEADERS = ['Quota', 'MTD', 'Projected']
const SUB_HEADERS   = ['Today', 'MTD']
const METRIC_CATEGORIES = [
  'NB Cash*', 'EFT', 'PT', 'FENPT Units', "BR's",
  '1st Workout', '5-Star Reviews', '30 Day Reprogram', 'Other Reprogram'
]

export default function ProductionResults1v2() {
  // Placeholder empty rows for demonstration
  const rowsData = [];
  const totalsRow = { staff: 'TOTALS', quota: '', mtd: '', projected: '', metrics: Array(METRIC_CATEGORIES.length * SUB_HEADERS.length).fill('') };

  return (
    <div className="mb-4 relative">
      <div className="bg-blue-500 flex justify-between items-center p-2 text-white text-lg font-bold border-2 border-black relative">
        <span>PRODUCTION RESULTS 1 (API v2)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border-2 border-black bg-blue-500 text-white p-1 text-left">PRODUCTION STAFF</th>
              {GROUP_HEADERS.map(h=>(
                <th key={h} className="border-2 border-black bg-blue-500 text-white p-1 text-center" colSpan={2}>{h}</th>
              ))}
              {METRIC_CATEGORIES.map(cat=>SUB_HEADERS.map(sub=>(
                <th key={`${cat}-${sub}`} className="border-2 border-black bg-blue-500 text-white p-1 text-center">{sub}</th>
              )))}
            </tr>
            <tr>
              <th className="border-2 border-black bg-blue-500 p-1 text-white"></th>
              {GROUP_HEADERS.map((_,i)=><th key={i} className="border-2 border-black bg-blue-500 p-1" colSpan={2}></th>)}
              {METRIC_CATEGORIES.map(cat=>(
                <th key={cat} className="border-2 border-black bg-blue-500 text-white p-1 text-center" colSpan={2}>{cat}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Example empty row */}
            <tr>
              <td className="border-2 border-black p-1">(empty)</td>
              <td className="border-2 border-black p-1 text-right" colSpan={2}></td>
              <td className="border-2 border-black p-1 text-right" colSpan={2}></td>
              <td className="border-2 border-black p-1 text-right" colSpan={2}></td>
              {Array(METRIC_CATEGORIES.length * SUB_HEADERS.length).fill('').map((_,idx)=>(
                <td key={idx} className="border-2 border-black p-1 text-center"></td>
              ))}
            </tr>
            {/* Totals Row */}
            <tr className="bg-yellow-100 font-bold">
              <td className="border-2 border-black p-1">{totalsRow.staff}</td>
              <td className="border-2 border-black p-1 text-right" colSpan={2}>{totalsRow.quota}</td>
              <td className="border-2 border-black p-1 text-right" colSpan={2}>{totalsRow.mtd}</td>
              <td className="border-2 border-black p-1 text-right" colSpan={2}>{totalsRow.projected}</td>
              {totalsRow.metrics.map((val,idx)=>(
                <td key={idx} className="border-2 border-black p-1 text-center">{val}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="text-xs italic mt-1">* Includes paid passes of one week or more</div>
    </div>
  )
} 