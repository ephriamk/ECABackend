// components/PersonalTraining.tsx
'use client'
import React, { useState, useEffect } from 'react'

// Import the same helper functions from ProductionResults2
export function normalizeName(raw: string): string {
  const s = raw.trim()
  if (!s) return ''
  if (s.includes(',')) {
    const [last, first] = s.split(',').map(p => p.trim())
    return `${first} ${last}`.replace(/\s+/g, ' ')
  }
  return s.replace(/\s+/g, ' ')
}

function canonicalize(raw: string, official: string[]): string {
  const n = normalizeName(raw)
  if (!n) return ''
  
  const directMatch = official.find(o => o.toLowerCase() === n.toLowerCase())
  if (directMatch) return directMatch
  
  const normalized = n.toLowerCase()
  const parts = normalized.split(/\s+/)
  
  let bestMatch: string | null = null
  let bestScore = 0
  
  for (const officialName of official) {
    const officialLower = officialName.toLowerCase()
    const officialParts = officialLower.split(/\s+/)
    
    let score = 0
    let allPartsFound = true
    
    for (const part of parts) {
      if (part.length < 2) continue
      let partFound = false
      for (const officialPart of officialParts) {
        if (part === officialPart) {
          score += 10
          partFound = true
          break
        }
        if (part.length === 1 && officialPart.startsWith(part)) {
          score += 5
          partFound = true
          break
        }
        if (part.length >= 3 && officialPart.startsWith(part)) {
          score += 7
          partFound = true
          break
        }
      }
      if (!partFound && part.length >= 3) {
        allPartsFound = false
      }
    }
    
    if (parts.length > 0 && officialParts.length > 0) {
      const lastPart = parts[parts.length - 1]
      const officialLastPart = officialParts[officialParts.length - 1]
      if (lastPart === officialLastPart) {
        score += 15
      }
    }
    
    if (allPartsFound || score > 0) {
      let reverseMatch = true
      for (const officialPart of officialParts) {
        if (officialPart.length === 1) continue
        let found = false
        for (const part of parts) {
          if (
            officialPart === part ||
            (part.length >= 3 && officialPart.startsWith(part)) ||
            (officialPart.length >= 3 && part.startsWith(officialPart))
          ) {
            found = true
            break
          }
        }
        if (!found && officialPart.length >= 3) {
          reverseMatch = false
        }
      }
      if (reverseMatch) {
        score += 5
      }
    }
    
    if (score > bestScore) {
      bestScore = score
      bestMatch = officialName
    }
  }
  
  return bestScore >= 15 ? bestMatch! : n
}

interface TrainerData {
  name: string
  position: string
}

interface Selected {
  staff: string
  metricIndex: number
  type: 'today' | 'mtd'
}

// Define the column headers for the Personal Training table
const GROUP_HEADERS_PT = [
  'Quota', 'MTD', 'Projected', 'New PT', 'Renew PT', 'Total PT',
  'New PT Units', 'Renew PT Units', '1st Workout', '5-Star Reviews',
  '30 Day Reprogram', 'Other Reprogram', 'GP Returns',
  'NPT % Units / 1W + RPs', 'Average NPT $'
]

const SUB_HEADERS_PT = ['Today', 'MTD']

// Add PT_CENTERS for all PT profit_center variants
const PT_CENTERS = [
  'PT Postdate - New',
  'PT Postdate - Renew',
  'Personal Training - NEW',
  'Personal Training - RENEW',
]
// Explicitly separate new and renew
const PT_NEW_CENTERS = [
  'PT Postdate - New',
  'Personal Training - NEW',
]
const PT_RENEW_CENTERS = [
  'PT Postdate - Renew',
  'Personal Training - RENEW',
]

export default function PersonalTraining() {
  const [trainerList, setTrainerList] = useState<TrainerData[]>([])
  const [employeeList, setEmployeeList] = useState<string[]>([])
  const [consolidationMap, setConsolidationMap] = useState<Record<string,string>>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Selected|null>(null)
  const [salesEntries, setSalesEntries] = useState<any[]>([])
  
  // State for PT sales details and reassignment
  const [ptSalesDetails, setPtSalesDetails] = useState<any[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [ptAssignMap, setPtAssignMap] = useState<Record<number,string>>({})

  // Add state for event counts
  const [firstWorkoutCounts, setFirstWorkoutCounts] = useState<Record<string, { today: number; mtd: number }>>({})
  const [thirtyDayCounts, setThirtyDayCounts] = useState<Record<string, { today: number; mtd: number }>>({})
  const [otherReprogramCounts, setOtherReprogramCounts] = useState<Record<string, { today: number; mtd: number }>>({})

  // Manual consolidation for known mismatches
  const manualConsolidation: Record<string, string> = {
    'Sean G Swet': 'Sean Swet',
    'Sean Swet': 'Sean Swet',
    // Add more as needed
  }

  // Compute yesterday's date (YYYY-MM-DD)
  const getYesterdayDate = () => {
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return [
      yesterday.getFullYear(),
      String(yesterday.getMonth() + 1).padStart(2,'0'),
      String(yesterday.getDate()).padStart(2,'0')
    ].join('-')
  }
  const yesterday = getYesterdayDate()

  // Calculate New PT total amount for a trainer
  const calculateNewPT = (trainerName: string, dateFilter?: 'today' | 'mtd'): number => {
    return salesEntries
      .filter(sale => {
        if (!PT_NEW_CENTERS.includes(sale.profit_center)) return false
        if (dateFilter === 'today' && sale.latest_payment_date !== yesterday) return false
        if (!sale.commission_employees || sale.commission_employees.trim() === '') {
          return false
        }
        // Updated logic: handle multiple names
        const rawOwners = (sale.commission_employees || '').split(',').map((n: string) => normalizeName(n)).filter(Boolean)
        const mapped = rawOwners.map((n: string) => consolidationMap[n] || n)
        return mapped.includes(trainerName)
      })
      .reduce((total, sale) => total + (sale.total_amount || 0), 0)
  }

  // Calculate Renew PT total amount for a trainer
  const calculateRenewPT = (trainerName: string, dateFilter?: 'today' | 'mtd'): number => {
    return salesEntries
      .filter(sale => {
        if (!PT_RENEW_CENTERS.includes(sale.profit_center)) return false
        if (dateFilter === 'today' && sale.latest_payment_date !== yesterday) return false
        if (!sale.commission_employees || sale.commission_employees.trim() === '') {
          return false
        }
        // Updated logic: handle multiple names
        const rawOwners = (sale.commission_employees || '').split(',').map((n: string) => normalizeName(n)).filter(Boolean)
        const mapped = rawOwners.map((n: string) => consolidationMap[n] || n)
        return mapped.includes(trainerName)
      })
      .reduce((total, sale) => total + (sale.total_amount || 0), 0)
  }

  // Count New PT units (number of sales) for a trainer
  const countNewPTUnits = (trainerName: string, dateFilter?: 'today' | 'mtd'): number => {
    return salesEntries.filter(sale => {
      if (!PT_NEW_CENTERS.includes(sale.profit_center)) return false
      if (dateFilter === 'today' && sale.latest_payment_date !== yesterday) return false
      if (!sale.commission_employees || sale.commission_employees.trim() === '') {
        return false
      }
      // Updated logic: handle multiple names
      const rawOwners = (sale.commission_employees || '').split(',').map((n: string) => normalizeName(n)).filter(Boolean)
      const mapped = rawOwners.map((n: string) => consolidationMap[n] || n)
      return mapped.includes(trainerName)
    }).length
  }

  // Count Renew PT units (number of sales) for a trainer
  const countRenewPTUnits = (trainerName: string, dateFilter?: 'today' | 'mtd'): number => {
    return salesEntries.filter(sale => {
      if (!PT_RENEW_CENTERS.includes(sale.profit_center)) return false
      if (dateFilter === 'today' && sale.latest_payment_date !== yesterday) return false
      if (!sale.commission_employees || sale.commission_employees.trim() === '') {
        return false
      }
      // Updated logic: handle multiple names
      const rawOwners = (sale.commission_employees || '').split(',').map((n: string) => normalizeName(n)).filter(Boolean)
      const mapped = rawOwners.map((n: string) => consolidationMap[n] || n)
      return mapped.includes(trainerName)
    }).length
  }

  // Data loading function (used on mount and for refresh)
  const loadAllData = () => {
    setLoading(true)
    Promise.all([
      fetch('http://localhost:8000/api/employees/trainers'),
      fetch('http://localhost:8000/api/employees'),
      fetch('http://localhost:8000/api/sales/all'),
      fetch('http://localhost:8000/api/events/first-workout/counts'),
      fetch('http://localhost:8000/api/events/thirtyday-reprogram/counts'),
      fetch('http://localhost:8000/api/events/other-reprogram/counts'),
    ])
      .then(async ([resTrainers, resEmployees, resSales, resFW, res30, resOther]) => {
        if (!resTrainers.ok) throw new Error('Failed to fetch trainers')
        const trainersData = (await resTrainers.json()) as { name: string, position: string }[]
        let employeesData: { name: string }[] = []
        if (resEmployees.ok) {
          try {
            employeesData = await resEmployees.json()
          } catch {
            employeesData = []
          }
        }
        let salesData: any[] = []
        if (resSales.ok) {
          try {
            salesData = await resSales.json()
          } catch {
            salesData = []
          }
        }
        // Event counts
        let fwCounts = {}
        let tdCounts = {}
        let otherCounts = {}
        if (resFW.ok) fwCounts = await resFW.json()
        if (res30.ok) tdCounts = await res30.json()
        if (resOther.ok) otherCounts = await resOther.json()
        // Create trainer data with normalized names
        const trainerData: TrainerData[] = trainersData
          .map(trainer => ({
            name: normalizeName(trainer.name),
            position: trainer.position
          }))
          .filter(t => t.name)
        // Build employee list (sales staff, normalized, no duplicates)
        const employeeNames = Array.from(new Set(
          (employeesData || []).map(e => normalizeName(e.name)).filter(Boolean)
        ))
        setEmployeeList(employeeNames)
        // Build consolidation map for name matching
        const namesSet = new Set<string>()
        trainerData.forEach(t => namesSet.add(t.name))
        employeeNames.forEach(n => namesSet.add(n))
        salesData.forEach(sale => {
          if (sale.commission_employees) {
            const nm = normalizeName(sale.commission_employees)
            if (nm) namesSet.add(nm)
          }
        })
        const officialNames = [...trainerData.map(t => t.name), ...employeeNames]
        const consolidationMap: Record<string,string> = {}
        Array.from(namesSet).forEach(nm => {
          if (manualConsolidation[nm]) {
            consolidationMap[nm] = manualConsolidation[nm]
            return
          }
          const exact = officialNames.find(o => o.toLowerCase() === nm.toLowerCase())
          if (exact) {
            consolidationMap[nm] = exact
            return
          }
          const cand = canonicalize(nm, officialNames)
          const matched = officialNames.find(o => o.toLowerCase() === cand.toLowerCase())
          if (matched) {
            consolidationMap[nm] = matched
          }
        })
        setTrainerList(trainerData)
        setConsolidationMap(consolidationMap)
        setSalesEntries(salesData)
        setFirstWorkoutCounts(fwCounts)
        setThirtyDayCounts(tdCounts)
        setOtherReprogramCounts(otherCounts)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading data:', err)
        setLoading(false)
      })
  }

  // On mount, load all data
  useEffect(() => {
    loadAllData()
  }, [])

  // Debug output: print trainer names and commission_employees after data loads
  useEffect(() => {
    if (!loading) {
      // Print canonical trainer names
      console.log('Trainer List:', trainerList.map(t => t.name));
      // Print all commission_employees from sales
      console.log('Sales commission_employees:', salesEntries.map(s => s.commission_employees));
      // Print normalized commission_employees
      console.log('Normalized commission_employees:', salesEntries.map(s => normalizeName(s.commission_employees || '')));
    }
  }, [loading, trainerList, salesEntries]);

  // Handle when PT metric is selected for popup details
  useEffect(() => {
    if (!selected) {
      setPtSalesDetails([])
      return
    }
    
    const { staff, metricIndex, type } = selected
    setLoadingDetails(true)

    // Only show details for PT-related columns (indices 3-12)
    if (metricIndex >= 3 && metricIndex <= 12) {
      const details = getPTSalesDetails(staff, metricIndex, type)
      // Initialize assignment map from commission_employees
      const map: Record<number,string> = {}
      details.forEach(sale => {
        map[sale.sale_id] = sale.commission_employees || ''
      })
      setPtAssignMap(map)
      setPtSalesDetails(details)
    } else {
      setPtSalesDetails([])
    }
    
    setLoadingDetails(false)
  }, [selected, salesEntries, consolidationMap])

  // Build the main table rows - now with event counts
  const rowsData = trainerList.map(trainer => {
    // Collapse Quota, MTD, Projected to single columns
    const metrics = Array(GROUP_HEADERS_PT.length + (GROUP_HEADERS_PT.length - 3) /* for double columns after Projected */).fill('0')
    // Quota, MTD, Projected (single columns)
    metrics[0] = '10000' // Quota
    metrics[1] = '10000' // MTD
    // Projected: (MTD / daysElapsed) * daysInMonth
    const today = new Date();
    const daysElapsed = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const mtd = parseInt(metrics[1] || '0', 10);
    metrics[2] = daysElapsed > 0 ? Math.round((mtd / daysElapsed) * daysInMonth).toString() : '0';
    // Now, fill in the rest as before, but shift indices by -3 for double columns
    // New PT (Today, MTD)
    metrics[3] = calculateNewPT(trainer.name, 'today').toFixed(0)
    metrics[4] = calculateNewPT(trainer.name, 'mtd').toFixed(0)
    // Renew PT (Today, MTD)
    metrics[5] = calculateRenewPT(trainer.name, 'today').toFixed(0)
    metrics[6] = calculateRenewPT(trainer.name, 'mtd').toFixed(0)
    // Total PT (Today, MTD)
    const newPTToday = calculateNewPT(trainer.name, 'today')
    const renewPTToday = calculateRenewPT(trainer.name, 'today')
    const newPTMTD = calculateNewPT(trainer.name, 'mtd')
    const renewPTMTD = calculateRenewPT(trainer.name, 'mtd')
    metrics[7] = (newPTToday + renewPTToday).toFixed(0)
    metrics[8] = (newPTMTD + renewPTMTD).toFixed(0)
    // New PT Units (Today, MTD)
    metrics[9] = countNewPTUnits(trainer.name, 'today').toString()
    metrics[10] = countNewPTUnits(trainer.name, 'mtd').toString()
    // Renew PT Units (Today, MTD)
    metrics[11] = countRenewPTUnits(trainer.name, 'today').toString()
    metrics[12] = countRenewPTUnits(trainer.name, 'mtd').toString()
    // 1st Workout (Today, MTD)
    const fw = firstWorkoutCounts[trainer.name] || 
              firstWorkoutCounts[trainer.name.toLowerCase()] || 
              { today: 0, mtd: 0 }
    metrics[13] = fw.today.toString()
    metrics[14] = fw.mtd.toString()
    // 5-Star Reviews (Today, MTD)
    metrics[15] = ''
    metrics[16] = ''
    // 30 Day Reprogram (Today, MTD)
    const td = thirtyDayCounts[trainer.name] || 
              thirtyDayCounts[trainer.name.toLowerCase()] || 
              { today: 0, mtd: 0 }
    metrics[17] = td.today.toString()
    metrics[18] = td.mtd.toString()
    // Other Reprogram (Today, MTD)
    const other = otherReprogramCounts[trainer.name] || 
                 otherReprogramCounts[trainer.name.toLowerCase()] || 
                 { today: 0, mtd: 0 }
    metrics[19] = other.today.toString()
    metrics[20] = other.mtd.toString()
    // GP Returns (Today, MTD)
    metrics[21] = ''
    metrics[22] = ''
    // NPT % Units / 1W + RPs (Today, MTD)
    metrics[23] = ''
    metrics[24] = ''
    // Average NPT $ (Today, MTD)
    metrics[25] = ''
    metrics[26] = ''
    return { 
      trainer: trainer.name,
      position: trainer.position,
      metrics 
    }
  })

  // Add totals row
  const totalsRow = {
    trainer: 'TOTALS',
    position: '',
    metrics: rowsData[0] ? rowsData[0].metrics.map((_, i) =>
      rowsData.reduce((sum, row) => sum + parseInt(row.metrics[i] || '0'), 0).toString()
    ) : []
  }

  // Get PT sales details for popup
  const getPTSalesDetails = (trainerName: string, metricIndex: number, type: 'today' | 'mtd') => {
    // New column indices after collapse:
    // 3: New PT Today, 4: New PT MTD
    // 5: Renew PT Today, 6: Renew PT MTD
    // 7: Total PT Today, 8: Total PT MTD
    // 9: New PT Units Today, 10: New PT Units MTD
    // 11: Renew PT Units Today, 12: Renew PT Units MTD
    let profitCenters: string[] = []
    if (metricIndex === 3 || metricIndex === 4 || metricIndex === 9 || metricIndex === 10) {
      // Only New types
      profitCenters = PT_NEW_CENTERS
    } else if (metricIndex === 5 || metricIndex === 6 || metricIndex === 11 || metricIndex === 12) {
      // Only Renew types
      profitCenters = PT_RENEW_CENTERS
    } else if (metricIndex === 7 || metricIndex === 8) {
      // Total PT - all PT types
      profitCenters = [...PT_NEW_CENTERS, ...PT_RENEW_CENTERS]
    } else {
      // Not a PT column
      return []
    }
    return salesEntries.filter(sale => {
      if (!profitCenters.includes(sale.profit_center)) return false
      if (type === 'today' && sale.latest_payment_date !== yesterday) return false
      if (!sale.commission_employees || sale.commission_employees.trim() === '') {
        return false
      }
      // Updated logic: handle multiple names
      const rawOwners = (sale.commission_employees || '').split(',').map((n: string) => normalizeName(n)).filter(Boolean)
      const mapped = rawOwners.map((n: string) => consolidationMap[n] || n)
      return mapped.includes(trainerName)
    })
  }

  // Save PT assignment to database
  const savePTAssignment = async (sale_id: number) => {
    const newOwner = ptAssignMap[sale_id] || ''
    try {
      const res = await fetch(`http://localhost:8000/api/sales/${sale_id}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ commission_employees: newOwner })
      })
      if (!res.ok) {
        alert('PT assignment failed: ' + await res.text())
        return
      }
      alert('PT assignment saved successfully!')
      await refreshAllSales()
      // Update the detail list so popup shows new value immediately
      setPtSalesDetails(details => details.map(d => 
        d.sale_id === sale_id ? { ...d, commission_employees: newOwner } : d
      ))
      if (selected) {
        setSelected({...selected})
      }
    } catch (error) {
      alert('Error saving PT assignment: ' + error)
    }
  }

  // Refresh sales data after assignment changes
  const refreshAllSales = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/sales/all')
      if (!res.ok) throw new Error('Failed to re-fetch sales')
      const updatedSales = await res.json()
      setSalesEntries(updatedSales)
    } catch (err) {
      console.error(err)
    }
  }

  // Get metric name for popup header
  const getMetricName = (idx: number) => {
    const groupIndex = Math.floor(idx / 2)
    if (groupIndex < GROUP_HEADERS_PT.length) {
      return GROUP_HEADERS_PT[groupIndex]
    }
    return 'Unknown'
  }

  if (loading) {
    return (
      <div className="mb-4">
        <div className="bg-teal-500 text-center font-bold p-2 text-white text-lg border-2 border-black">
          PERSONAL TRAINING
        </div>
        <div className="text-center p-4">Loading trainer data...</div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <div className="bg-teal-500 text-center font-bold p-2 text-white text-lg border-2 border-black">
        PERSONAL TRAINING
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-2 border-black bg-teal-500 text-white p-1 text-left">
                PERSONAL TRAINERS & COACHES
              </th>
              {/* Quota, MTD, Projected as single columns */}
              <th className="border-2 border-black bg-teal-500 text-white p-1 text-center">Quota</th>
              <th className="border-2 border-black bg-teal-500 text-white p-1 text-center">MTD</th>
              <th className="border-2 border-black bg-teal-500 text-white p-1 text-center">Projected</th>
              {/* The rest as double columns (Today/MTD) */}
              {[...GROUP_HEADERS_PT.slice(3)].map((header, idx) => (
                <th key={header+idx} className="border-2 border-black bg-teal-500 text-white p-1 text-center" colSpan={2}>{header}</th>
              ))}
            </tr>
            <tr>
              <th className="border-2 border-black bg-teal-500 text-white p-1 text-center"></th>
              {/* No subheaders for Quota, MTD, Projected */}
              <th className="border-2 border-black bg-teal-500 text-white p-1 text-center"></th>
              <th className="border-2 border-black bg-teal-500 text-white p-1 text-center"></th>
              <th className="border-2 border-black bg-teal-500 text-white p-1 text-center"></th>
              {/* The rest get Today/MTD subheaders */}
              {[...GROUP_HEADERS_PT.slice(3)].map((header, idx) => (
                <React.Fragment key={header+idx}>
                  <th className="border-2 border-black bg-teal-500 text-white p-1 text-center">Today</th>
                  <th className="border-2 border-black bg-teal-500 text-white p-1 text-center">MTD</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="text-xs">
            {rowsData.map((row, idx) => (
              <tr key={row.trainer}>
                <td className="border-2 border-black bg-gray-200 p-1">
                  {(() => {
                    const pos = row.position.toLowerCase()
                    if (pos.includes('fitness director')) {
                      if (pos.includes('weekend')) {
                        return `WFD: ${row.trainer}`
                      } else if (pos.includes('assistant')) {
                        return `AFD: ${row.trainer}`
                      } else {
                        return `FD: ${row.trainer}`
                      }
                    }
                    return row.trainer
                  })()}
                </td>
                {row.metrics.map((val, j) => (
                  <td
                    key={j}
                    className={`border-2 border-black p-1 text-center ${
                      j < 3 ? 'bg-gray-200 text-right' : 'cursor-pointer hover:bg-gray-200'
                    }`}
                    onClick={() => {
                      // Only allow popup for PT columns (indices 3-12)
                      if (j >= 3 && j <= 12) {
                        setSelected({ 
                          staff: row.trainer, 
                          metricIndex: j, 
                          type: j % 2 === 1 ? 'today' : 'mtd' 
                        })
                      }
                    }}
                  >
                    {/* Format currency columns vs count columns */}
                    {j < 3
                      ? (val === '0' ? '-' : `$${val}`)
                      : (val === '0' ? '-' : val)
                    }
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-gray-200 font-bold">
              <td className="border-2 border-black p-1">Total</td>
              {totalsRow.metrics.map((val, idx) => (
                <td 
                  key={idx} 
                  className={`border-2 border-black p-1 ${
                    idx < 3 ? 'text-right' : 'text-center'
                  }`}
                >
                  {/* Format totals - currency vs count columns */}
                  {idx < 3 ? `(${val})` : (val === '0' ? '-' : val)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="text-xs text-gray-600 mt-2">
        * Personal Training data based on yesterday ({yesterday}) and cumulative (MTD)
      </div>

      {/* Detail Modal - placeholder for now */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-40"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white p-4 rounded shadow-lg max-h-[80vh] overflow-auto w-[95%] max-w-5xl relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-black"
              onClick={() => setSelected(null)}
            >
              ❌
            </button>
            <h2 className="font-bold mb-2">
              {selected.type === 'today' ? 'Today' : 'MTD'} {getMetricName(selected.metricIndex)} for {selected.staff}
            </h2>
            
            {/* PT Sales Details */}
            {(selected.metricIndex >= 3 && selected.metricIndex <= 12) && (
              loadingDetails ? (
                <div className="text-center p-4">Loading PT details...</div>
              ) : (
                <table className="w-full text-sm mb-2 border-collapse">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">Sale ID</th>
                      <th className="border px-2 py-1">Member Name</th>
                      <th className="border px-2 py-1 text-right">Amount</th>
                      <th className="border px-2 py-1">Date</th>
                      <th className="border px-2 py-1">Profit Center</th>
                      <th className="border px-2 py-1">Current Assignment</th>
                      <th className="border px-2 py-1">Reassign</th>
                      <th className="border px-2 py-1">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ptSalesDetails.length === 0 ? (
                      <tr key="no-pt-sales-found">
                        <td colSpan={8} className="border px-2 py-1 text-center text-gray-500">
                          No PT sales found
                        </td>
                      </tr>
                    ) : (
                      ptSalesDetails.map((sale) => (
                        <tr key={sale.sale_id}>
                          <td className="border px-2 py-1">{sale.sale_id}</td>
                          <td className="border px-2 py-1">{sale.member_name}</td>
                          <td className="border px-2 py-1 text-right">
                            ${sale.total_amount?.toFixed(2) || '0.00'}
                          </td>
                          <td className="border px-2 py-1">{sale.latest_payment_date}</td>
                          <td className="border px-2 py-1 text-xs">
                            {sale.profit_center === 'Personal Training - NEW' ? 'New PT' : 'Renew PT'}
                          </td>
                          <td className="border px-2 py-1 text-xs italic">
                            {sale.commission_employees || '(unassigned)'}
                          </td>
                          <td className="border px-2 py-1">
                            <select
                              className="w-full text-xs"
                              value={ptAssignMap[sale.sale_id] || ''}
                              onChange={ev =>
                                setPtAssignMap(m => ({
                                  ...m,
                                  [sale.sale_id]: ev.target.value
                                }))
                              }
                            >
                              <option value="">— none —</option>
                              {/* Show all unique trainers and sales staff, sorted */}
                              {Array.from(new Set([...trainerList.map(t => t.name), ...employeeList]))
                                .sort((a, b) => a.localeCompare(b))
                                .map(name => (
                                  <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                          </td>
                          <td className="border px-2 py-1 text-center">
                            <button
                              className="text-sm bg-teal-500 text-white px-2 py-1 rounded"
                              onClick={() => savePTAssignment(sale.sale_id)}
                            >
                              Save
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )
            )}
            
            {/* Placeholder for non-PT columns */}
            {(selected.metricIndex < 3 || selected.metricIndex > 12) && (
              <div className="text-center text-gray-500 p-4">
                Details for this metric will be implemented later
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}