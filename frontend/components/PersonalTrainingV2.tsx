// SKELETON CLONE OF PersonalTraining.tsx FOR API v2
'use client'

import React from 'react'

const GROUP_HEADERS_PT = [
  'Quota', 'MTD', 'Projected', 'New PT', 'Renew PT', 'Total PT',
  'New PT Units', 'Renew PT Units', '1st Workout', '5-Star Reviews',
  '30 Day Reprogram', 'Other Reprogram', 'GP Returns',
  'NPT % Units / 1W + RPs', 'Average NPT $'
]
const SUB_HEADERS_PT = ['Today', 'MTD']

export default function PersonalTrainingV2() {
  // Placeholder empty rows for demonstration
  const rowsData = [];
  const totalsRow = { staff: 'TOTALS', metrics: Array(GROUP_HEADERS_PT.length * SUB_HEADERS_PT.length).fill('') };

  return (
    <div className="mb-4 relative">
      <div className="bg-blue-500 flex justify-between items-center p-2 text-white text-lg font-bold border-2 border-black relative">
        <span>PERSONAL TRAINING (API v2)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border-2 border-black bg-blue-500 text-white p-1 text-left">TRAINER</th>
              {GROUP_HEADERS_PT.map(h=>(
                <th key={h} className="border-2 border-black bg-blue-500 text-white p-1 text-center" colSpan={2}>{h}</th>
              ))}
            </tr>
            <tr>
              <th className="border-2 border-black bg-blue-500 p-1 text-white"></th>
              {GROUP_HEADERS_PT.map((cat,i)=>(
                <th key={i} className="border-2 border-black bg-blue-500 text-white p-1 text-center" colSpan={2}></th>
              ))}
            </tr>
            <tr>
              <th className="border-2 border-black bg-blue-500 p-1 text-white"></th>
              {GROUP_HEADERS_PT.map(cat=>SUB_HEADERS_PT.map(sub=>(
                <th key={`${cat}-${sub}`} className="border-2 border-black bg-blue-500 text-white p-1 text-center">{sub}</th>
              )))}
            </tr>
          </thead>
          <tbody>
            {/* Example empty row */}
            <tr>
              <td className="border-2 border-black p-1">(empty)</td>
              {Array(GROUP_HEADERS_PT.length * SUB_HEADERS_PT.length).fill('').map((_,idx)=>(
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