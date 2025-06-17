// SKELETON CLONE OF ProductionResults2.tsx FOR API v2
'use client'

import React from 'react'

const GROUP_HEADERS_2 = [
  'Tours', 'Deals', 'Access', 'Amenities Plus', 'Champions Training',
  'Paid Passes', 'Out of Area',
  'Underage', 'Class Pass', 'Closing %',
  'Average EFT Per Deal', 'NPT % PT/Deals', 'Average FENPT $'
]
const SUB_HEADERS_2 = ['Today', 'MTD']
const METRIC_CATEGORIES_2 = GROUP_HEADERS_2

export default function ProductionResults2v2() {
  // Placeholder empty rows for demonstration
  const rowsData = [];
  const totalsRow = { staff: 'TOTALS', metrics: Array(METRIC_CATEGORIES_2.length * SUB_HEADERS_2.length).fill('') };

  return (
    <div className="mb-4 relative">
      <div className="bg-blue-500 flex justify-between items-center p-2 text-white text-lg font-bold border-2 border-black relative">
        <span>PRODUCTION RESULTS 2 (API v2)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border-2 border-black bg-blue-500 text-white p-1 text-left">PRODUCTION STAFF</th>
              {METRIC_CATEGORIES_2.map(cat=>SUB_HEADERS_2.map(sub=>(
                <th key={`${cat}-${sub}`} className="border-2 border-black bg-blue-500 text-white p-1 text-center">{sub}</th>
              )))}
            </tr>
            <tr>
              <th className="border-2 border-black bg-blue-500 p-1 text-white"></th>
              {METRIC_CATEGORIES_2.map(cat=>(
                <th key={cat} className="border-2 border-black bg-blue-500 text-white p-1 text-center" colSpan={2}>{cat}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Example empty row */}
            <tr>
              <td className="border-2 border-black p-1">(empty)</td>
              {Array(METRIC_CATEGORIES_2.length * SUB_HEADERS_2.length).fill('').map((_,idx)=>(
                <td key={idx} className="border-2 border-black p-1 text-center"></td>
              ))}
            </tr>
            {/* Totals Row */}
            <tr className="bg-yellow-100 font-bold">
              <td className="border-2 border-black p-1">{totalsRow.staff}</td>
              {totalsRow.metrics.map((val,idx)=>(
                <td key={idx} className="border-2 border-black p-1 text-center">{val}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
} 