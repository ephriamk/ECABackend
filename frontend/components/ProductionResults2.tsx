// components/ProductionResults2.tsx
'use client'
import React, { useState, useEffect } from 'react'

// normalizeName (same as in PR1)
export function normalizeName(raw: string): string {
  const s = raw.trim()
  if (!s) return ''
  if (s.includes(',')) {
    const [last, first] = s.split(',').map(p => p.trim())
    return `${first} ${last}`.replace(/\s+/g, ' ')
  }
  return s.replace(/\s+/g, ' ')
}

// canonicalize (same as in PR1)
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

interface Employee {
  name: string
}

interface GuestVisit {
  guest_id: number
  first_name: string
  last_name: string
  tour_date: string
  tour_time: string
  phone: string
  email: string
  source: string
  salesperson: string
  created_at: string
}

interface SalesEntry {
  sale_id: number
  member_name: string
  total_amount: number
  profit_center: string
  commission_employees: string  // <–– we'll update this
  sales_person: string         // still fetched, but no longer used for assignment
  latest_payment_date: string   // YYYY-MM-DD
  main_item?: string           // Added to support paid passes exclusion
  membership_type?: string     // Added for correct category logic
}

interface Selected {
  staff: string
  metricIndex: number
  type: 'today' | 'mtd'
}

const GROUP_HEADERS_2 = [
  'Tours', 'Deals', 'Access', 'Amenities Plus', 'Champions Training',
  'Paid Passes', 'Out of Area',
  'Underage', 'Class Pass', 'Closing %',
  'Average EFT Per Deal', 'NPT % PT/Deals', 'Average FENPT $'
]
const SUB_HEADERS_2 = ['Today', 'MTD']
const METRIC_CATEGORIES_2 = GROUP_HEADERS_2

// Helper to check membership type
function getMembershipCategory(membership_type: string | undefined): 'Access' | 'Amenities Plus' | 'Champions Training' | null {
  if (!membership_type) return null;
  const mt = membership_type.trim().toUpperCase();
  if (mt === 'ACCESS') return 'Access';
  if (mt === 'AMENITIES PLUS' || mt === 'AMENITIES') return 'Amenities Plus';
  if (mt === 'CHAMPIONS CLUB') return 'Champions Training';
  return null;
}

export default function ProductionResults2() {
  const [staffList, setStaffList] = useState<string[]>([])
  const [guestVisits, setGuestVisits] = useState<GuestVisit[]>([])
  const [salesEntries, setSalesEntries] = useState<SalesEntry[]>([])
  const [consolidationMap, setConsolidationMap] = useState<Record<string,string>>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Selected|null>(null)

  // We'll store commission_employees per sale_id for editing
  const [dealAssignMap, setDealAssignMap] = useState<Record<number,string>>({})

  const [guestDetails, setGuestDetails] = useState<GuestVisit[]>([])
  const [dealDetails, setDealDetails] = useState<SalesEntry[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

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

  // Helper to count Paid Passes for a staff
  function countPaidPasses(staffName: string, dateFilter?: 'today' | 'mtd') {
    return salesEntries.filter(s => {
      if (s.profit_center !== 'Promotion') return false
      if (s.main_item && (s.main_item === 'Downgrade' || s.main_item === 'Downgrade Fee')) return false
      if (dateFilter === 'today' && s.latest_payment_date !== yesterday) return false
      if (!s.commission_employees || s.commission_employees.trim() === '') {
        return staffName === 'Other'
      }
      const nm = normalizeName(s.commission_employees)
      const mapped = consolidationMap[nm] || ''
      if (staffName === 'Other') {
        return mapped === ''
      }
      return staffName === mapped
    }).length
  }

  // Helper to get Paid Passes details for popup
  function getPaidPassesDetails(staffName: string, type: 'today' | 'mtd') {
    return salesEntries.filter(s => {
      if (s.profit_center !== 'Promotion') return false
      if (s.main_item && (s.main_item === 'Downgrade' || s.main_item === 'Downgrade Fee')) return false
      if (type === 'today' && s.latest_payment_date !== yesterday) return false
      if (!s.commission_employees || s.commission_employees.trim() === '') {
        return staffName === 'Other'
      }
      const nm = normalizeName(s.commission_employees)
      const mapped = consolidationMap[nm] || ''
      if (staffName === 'Other') {
        return mapped === ''
      }
      return staffName === mapped
    })
  }

  // Helper to count guests by normalized source
  function countGuestsBySource(staffName: string, source: string, dateFilter?: 'today' | 'mtd') {
    return guestVisits.filter(g => {
      if (dateFilter === 'today' && g.created_at.substring(0,10) !== yesterday) return false;
      if (!g.source || g.source.trim() === '') return false;
      // Normalize source
      let normalizedSource = g.source;
      if (normalizedSource === 'Out of Town Guest') normalizedSource = 'Out of Area';
      if (normalizedSource === 'Under 18 guest') normalizedSource = 'Underage';
      // Staff filter
      if (!g.salesperson || g.salesperson.trim() === '') {
        return staffName === 'Other';
      }
      const nm = normalizeName(g.salesperson);
      const mapped = consolidationMap[nm] || '';
      if (staffName === 'Other') {
        return mapped === '';
      }
      return staffName === mapped && normalizedSource === source;
    }).length;
  }

  // Helper to get guest details by source for popup
  function getGuestsBySourceDetails(staffName: string, source: string, type: 'today' | 'mtd') {
    return guestVisits.filter(g => {
      if (type === 'today' && g.created_at.substring(0,10) !== yesterday) return false;
      if (!g.source || g.source.trim() === '') return false;
      let normalizedSource = g.source;
      if (normalizedSource === 'Out of Town Guest') normalizedSource = 'Out of Area';
      if (normalizedSource === 'Under 18 guest') normalizedSource = 'Underage';
      if (!g.salesperson || g.salesperson.trim() === '') {
        return staffName === 'Other';
      }
      const nm = normalizeName(g.salesperson);
      const mapped = consolidationMap[nm] || '';
      if (staffName === 'Other') {
        return mapped === '';
      }
      return staffName === mapped && normalizedSource === source;
    });
  }

  // Helper to calculate Closing %
  function calculateClosingPercent(staffName: string, dateFilter: 'today' | 'mtd') {
    const tours = calculateTours(staffName, dateFilter)
    const paidPasses = countPaidPasses(staffName, dateFilter)
    const outOfArea = countGuestsBySource(staffName, 'Out of Area', dateFilter)
    const classPass = countGuestsBySource(staffName, 'Class Pass', dateFilter)
    const deals = calculateDeals(staffName, dateFilter)
    const denominator = tours - paidPasses - outOfArea - classPass
    if (denominator <= 0) return '-'
    const percent = Math.round((deals / denominator) * 100)
    return percent + '%'
  }

  // 1) On mount, fetch employees, guest visits, and all sales
  useEffect(() => {
    Promise.all([
      fetch('http://localhost:8000/api/employees'),
      fetch('http://localhost:8000/api/guests/all'),
      fetch('http://localhost:8000/api/sales/all'),
    ])
    .then(async ([resEmp, resGuests, resSales]) => {
      if (!resEmp.ok) throw new Error('Failed to fetch employees')

      const empData = (await resEmp.json()) as { name: string }[]

      let guestData: GuestVisit[] = []
      if (resGuests.ok) {
        try {
          guestData = await resGuests.json() as GuestVisit[]
        } catch {
          guestData = []
        }
      }

      let salesData: SalesEntry[] = []
      if (resSales.ok) {
        try {
          salesData = await resSales.json() as SalesEntry[]
        } catch {
          salesData = []
        }
      }

      // Build the official staff list from employees
      const officialNames = empData
        .map(e => normalizeName(e.name))
        .filter(n => n)
      const uniqueStaff = Array.from(new Set(officialNames))

      // Build consolidationMap from all commission_employees & salesperson values
      const namesSet = new Set<string>()
      guestData.forEach(g => {
        if (g.salesperson) {
          const nm = normalizeName(g.salesperson)
          if (nm) namesSet.add(nm)
        }
      })
      salesData.forEach(s => {
        if (s.commission_employees) {
          const nm = normalizeName(s.commission_employees)
          if (nm) namesSet.add(nm)
        }
        if (s.sales_person) {
          const nm = normalizeName(s.sales_person)
          if (nm) namesSet.add(nm)
        }
      })

      const consolidationMap: Record<string,string> = {}
      Array.from(namesSet).forEach(nm => {
        const exact = uniqueStaff.find(o => o.toLowerCase() === nm.toLowerCase())
        if (exact) {
          consolidationMap[nm] = exact
          return
        }
        const cand = canonicalize(nm, uniqueStaff)
        const matched = uniqueStaff.find(o => o.toLowerCase() === cand.toLowerCase())
        if (matched) {
          consolidationMap[nm] = matched
        }
      })

      setStaffList([...uniqueStaff, 'Other'])
      setGuestVisits(guestData)
      setSalesEntries(salesData)
      setConsolidationMap(consolidationMap)
      setLoading(false)
    })
    .catch(err => {
      console.error(err)
      // Fallback: at least load employees
      fetch('http://localhost:8000/api/employees')
        .then(r => r.json())
        .then((empData: { name: string }[]) => {
          const names = empData.map(e => normalizeName(e.name)).filter(n => n)
          setStaffList([...Array.from(new Set(names)), 'Other'])
          setGuestVisits([])
          setSalesEntries([])
          setConsolidationMap({})
          setLoading(false)
        })
        .catch(() => setLoading(false))
    })
  }, [])

  // 2) Count Tours per staff
  const calculateTours = (staffName: string, dateFilter?: 'today' | 'mtd'): number => {
    return guestVisits.filter(g => {
      if (dateFilter === 'today' && g.created_at.substring(0,10) !== yesterday) return false
      if (!g.salesperson || g.salesperson.trim() === '') {
        return staffName === 'Other'
      }
      const nm = normalizeName(g.salesperson)
      const mapped = consolidationMap[nm] || ''
      if (staffName === 'Other') {
        return mapped === ''
      }
      return staffName === mapped
    }).length
  }

  // 3) Count Deals per staff based on commission_employees
  const calculateDeals = (staffName: string, dateFilter?: 'today' | 'mtd'): number => {
    return salesEntries.filter(s => {
      if (s.profit_center !== 'New Business') return false
      if (dateFilter === 'today' && s.latest_payment_date !== yesterday) return false
      if (!s.commission_employees || s.commission_employees.trim() === '') {
        return staffName === 'Other'
      }
      const nm = normalizeName(s.commission_employees)
      const mapped = consolidationMap[nm] || ''
      if (staffName === 'Other') {
        return mapped === ''
      }
      return staffName === mapped
    }).length
  }

  // Count deals by membership category
  function countDealsByCategory(staffName: string, category: 'Access' | 'Amenities Plus' | 'Champions Training', dateFilter?: 'today' | 'mtd') {
    return salesEntries.filter(s => {
      if (s.profit_center !== 'New Business') return false
      if (dateFilter === 'today' && s.latest_payment_date !== yesterday) return false
      if (!s.commission_employees || s.commission_employees.trim() === '') {
        const cat = getMembershipCategory(s.membership_type)
        return staffName === 'Other' && cat === category
      }
      const nm = normalizeName(s.commission_employees)
      const mapped = consolidationMap[nm] || ''
      const cat = getMembershipCategory(s.membership_type)
      if (staffName === 'Other') {
        return mapped === '' && cat === category
      }
      return staffName === mapped && cat === category
    }).length
  }

  // 4) "Tours" detail rows when popup is open
  const getGuestDetails = (
    staffName: string,
    metricIndex: number,
    type: 'today' | 'mtd'
  ): GuestVisit[] => {
    if (metricIndex !== 0 && metricIndex !== 1) return []
    return guestVisits.filter(g => {
      if (type === 'today' && g.created_at.substring(0,10) !== yesterday) return false
      if (!g.salesperson || g.salesperson.trim() === '') {
        return staffName === 'Other'
      }
      const nm = normalizeName(g.salesperson)
      const mapped = consolidationMap[nm] || ''
      if (staffName === 'Other') {
        return mapped === ''
      }
      return staffName === mapped
    })
  }

  // 5) "Deals" detail rows when popup is open (based on commission_employees)
  const getDealDetails = (
    staffName: string,
    metricIndex: number,
    type: 'today' | 'mtd'
  ): SalesEntry[] => {
    if (metricIndex !== 2 && metricIndex !== 3) return []
    return salesEntries.filter(s => {
      if (s.profit_center !== 'New Business') return false
      if (type === 'today' && s.latest_payment_date !== yesterday) return false
      if (!s.commission_employees || s.commission_employees.trim() === '') {
        return staffName === 'Other'
      }
      const nm = normalizeName(s.commission_employees)
      const mapped = consolidationMap[nm] || ''
      if (staffName === 'Other') {
        return mapped === ''
      }
      return staffName === mapped
    })
  }

  // 5b) Get deals for a staff/category for popup
  function getCategoryDealDetails(staffName: string, category: 'Access' | 'Amenities Plus' | 'Champions Training', type: 'today' | 'mtd') {
    return salesEntries.filter(s => {
      if (s.profit_center !== 'New Business') return false
      if (type === 'today' && s.latest_payment_date !== yesterday) return false
      if (!s.commission_employees || s.commission_employees.trim() === '') {
        const cat = getMembershipCategory(s.membership_type)
        return staffName === 'Other' && cat === category
      }
      const nm = normalizeName(s.commission_employees)
      const mapped = consolidationMap[nm] || ''
      if (staffName === 'Other') {
        return mapped === ''
      }
      const cat = getMembershipCategory(s.membership_type)
      return staffName === mapped && cat === category
    })
  }

  // 6) Build the main table rows
  const rowsData = staffList.map(staff => {
    const metrics = Array(GROUP_HEADERS_2.length * SUB_HEADERS_2.length).fill('')
    metrics[0] = calculateTours(staff, 'today').toString()
    metrics[1] = calculateTours(staff, 'mtd').toString()
    metrics[2] = calculateDeals(staff, 'today').toString()
    metrics[3] = calculateDeals(staff, 'mtd').toString()
    // Access
    metrics[4] = countDealsByCategory(staff, 'Access', 'today').toString()
    metrics[5] = countDealsByCategory(staff, 'Access', 'mtd').toString()
    // Amenities Plus
    metrics[6] = countDealsByCategory(staff, 'Amenities Plus', 'today').toString()
    metrics[7] = countDealsByCategory(staff, 'Amenities Plus', 'mtd').toString()
    // Champions Training
    metrics[8] = countDealsByCategory(staff, 'Champions Training', 'today').toString()
    metrics[9] = countDealsByCategory(staff, 'Champions Training', 'mtd').toString()
    // Paid Passes
    metrics[10] = countPaidPasses(staff, 'today').toString()
    metrics[11] = countPaidPasses(staff, 'mtd').toString()
    // Out of Area
    metrics[12] = countGuestsBySource(staff, 'Out of Area', 'today').toString()
    metrics[13] = countGuestsBySource(staff, 'Out of Area', 'mtd').toString()
    // Underage
    metrics[14] = countGuestsBySource(staff, 'Underage', 'today').toString()
    metrics[15] = countGuestsBySource(staff, 'Underage', 'mtd').toString()
    // Class Pass
    metrics[16] = countGuestsBySource(staff, 'Class Pass', 'today').toString()
    metrics[17] = countGuestsBySource(staff, 'Class Pass', 'mtd').toString()
    // Closing %
    metrics[18] = calculateClosingPercent(staff, 'today')
    metrics[19] = calculateClosingPercent(staff, 'mtd')
    return { staff, metrics }
  })

  const totalsRow = {
    staff: 'TOTALS',
    metrics: Array(GROUP_HEADERS_2.length * SUB_HEADERS_2.length).fill(0).map((_, i) => {
      // For Closing %, show blank or '-' in totals row
      if (i === 18 || i === 19) return '-'
      return rowsData.reduce((sum, row) => sum + parseInt(row.metrics[i] || '0'), 0).toString()
    })
  }

  const getMetricCategoryName = (idx: number) =>
    METRIC_CATEGORIES_2[Math.floor(idx / 2)] || 'Unknown'

  // 7) Whenever user opens a popup cell ("selected" changes), load detail lists
  useEffect(() => {
    if (!selected) {
      setGuestDetails([])
      setDealDetails([])
      setCategoryDetails([])
      setPaidPassesDetails([])
      setGuestSourceDetails([])
      return
    }
    const { staff, metricIndex, type } = selected
    setLoadingDetails(true)

    if (metricIndex === 0 || metricIndex === 1) {
      // Tours detail
      const details = getGuestDetails(staff, metricIndex, type)
      setGuestDetails(details)
      setLoadingDetails(false)
    } else if (metricIndex === 2 || metricIndex === 3) {
      // Deals detail (by commission_employees)
      const details = getDealDetails(staff, metricIndex, type)
      // Initialize dealAssignMap from commission_employees
      const map: Record<number,string> = {}
      details.forEach(d => {
        map[d.sale_id] = d.commission_employees || ''
      })
      setDealAssignMap(map)
      setDealDetails(details)
      setLoadingDetails(false)
    } else if ([4,5,6,7,8,9].includes(metricIndex)) {
      // Access, Amenities Plus, Champions Training
      let category: 'Access' | 'Amenities Plus' | 'Champions Training' = 'Access';
      if (metricIndex === 4 || metricIndex === 5) category = 'Access';
      if (metricIndex === 6 || metricIndex === 7) category = 'Amenities Plus';
      if (metricIndex === 8 || metricIndex === 9) category = 'Champions Training';
      const details = getCategoryDealDetails(staff, category, type)
      setCategoryDetails(details)
      setLoadingDetails(false)
    } else if (metricIndex === 10 || metricIndex === 11) {
      // Paid Passes
      const details = getPaidPassesDetails(staff, type)
      setPaidPassesDetails(details)
      setLoadingDetails(false)
    } else if ([12,13].includes(metricIndex)) {
      // Out of Area
      const details = getGuestsBySourceDetails(staff, 'Out of Area', type)
      setGuestSourceDetails(details)
      setLoadingDetails(false)
    } else if ([14,15].includes(metricIndex)) {
      // Underage
      const details = getGuestsBySourceDetails(staff, 'Underage', type)
      setGuestSourceDetails(details)
      setLoadingDetails(false)
    } else if ([16,17].includes(metricIndex)) {
      // Class Pass
      const details = getGuestsBySourceDetails(staff, 'Class Pass', type)
      setGuestSourceDetails(details)
      setLoadingDetails(false)
    } else {
      setGuestDetails([])
      setDealDetails([])
      setCategoryDetails([])
      setPaidPassesDetails([])
      setGuestSourceDetails([])
      setLoadingDetails(false)
    }
  }, [selected, salesEntries, consolidationMap, staffList])

  // 8) After we issue a PUT, re-fetch /api/sales/all so PR1 will see the new commission_employees
  const refreshAllSales = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/sales/all')
      if (!res.ok) throw new Error('Failed to re-fetch sales')
      const updatedSales = (await res.json()) as SalesEntry[]
      setSalesEntries(updatedSales)
    } catch (err) {
      console.error(err)
    }
  }

  // 9) Called when user clicks "Save" on a deal row
  async function saveDealAssignment(sale_id: number) {
    const newOwner = dealAssignMap[sale_id] || ''
    try {
      const res = await fetch(`http://localhost:8000/api/sales/${sale_id}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        // <–– Update commission_employees, not sales_person
        body: JSON.stringify({ commission_employees: newOwner })
      })
      if (!res.ok) {
        alert('Deal reassignment failed: ' + await res.text())
        return
      }
      alert('Deal reassigned successfully!')
      await refreshAllSales()
      // Also update the detail list so popup shows new value immediately
      setDealDetails(dd => dd.map(d => d.sale_id === sale_id ? { ...d, commission_employees: newOwner } : d))
      if (selected) {
        setSelected({...selected})
      }
    } catch (error) {
      alert('Error reassigning deal: ' + error)
    }
  }

  // State for category popup
  const [categoryDetails, setCategoryDetails] = useState<SalesEntry[]>([])
  // State for paid passes popup
  const [paidPassesDetails, setPaidPassesDetails] = useState<SalesEntry[]>([])
  // State for guest source popups
  const [guestSourceDetails, setGuestSourceDetails] = useState<GuestVisit[]>([])

  if (loading) {
    return (
      <div className="mb-4">
        <div className="bg-blue-500 text-center font-bold p-2 text-white text-lg border-2 border-black">
          PRODUCTION RESULTS 2
        </div>
        <div className="text-center p-4">Loading data...</div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <div className="bg-blue-500 text-center font-bold p-2 text-white text-lg border-2 border-black">
        PRODUCTION RESULTS 2
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border-2 border-black bg-blue-500 text-white p-1 text-left">PRODUCTION STAFF</th>
              {GROUP_HEADERS_2.map(header => (
                <th
                  key={header}
                  className="border-2 border-black bg-blue-500 text-white p-1 text-center"
                  colSpan={2}
                >
                  {header}
                </th>
              ))}
            </tr>
            <tr>
              <th className="border-2 border-black bg-blue-500 p-1" />
              {GROUP_HEADERS_2.map((_, idx) => (
                <React.Fragment key={idx}>
                  <th className="border-2 border-black bg-blue-500 p-1 text-center">Today</th>
                  <th className="border-2 border-black bg-blue-500 p-1 text-center">MTD</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsData.map((row, idx) => (
              <tr key={row.staff} className={idx % 2 ? 'bg-gray-100' : ''}>
                <td className="border-2 border-black p-1">{row.staff}</td>
                {row.metrics.map((val, j) => (
                  <td
                    key={j}
                    className="border-2 border-black p-1 text-center cursor-pointer hover:bg-gray-200"
                    onClick={() => setSelected({ staff: row.staff, metricIndex: j, type: j % 2 === 0 ? 'today' : 'mtd' })}
                  >
                    {val}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-yellow-100 font-bold">
              <td className="border-2 border-black p-1">{totalsRow.staff}</td>
              {totalsRow.metrics.map((val, idx) => (
                <td key={idx} className="border-2 border-black p-1 text-center">{val}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="text-xs text-gray-600 mt-2">
        * Tours and Deals data based on yesterday ({yesterday}) and cumulative (MTD)
      </div>

      {/* Detail Modal */}
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
              {selected.type === 'today' ? 'Today' : 'MTD'}{' '}
              {getMetricCategoryName(selected.metricIndex)} for {selected.staff}
            </h2>

            {/* Tours Detail */}
            {(selected.metricIndex === 0 || selected.metricIndex === 1) && (
              <table className="w-full text-sm mb-2 border-collapse">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Guest Name</th>
                    <th className="border px-2 py-1">Tour Date</th>
                    <th className="border px-2 py-1">Tour Time</th>
                    <th className="border px-2 py-1">Source</th>
                    <th className="border px-2 py-1">Phone</th>
                    <th className="border px-2 py-1">Email</th>
                    <th className="border px-2 py-1">Assigned To</th>
                  </tr>
                </thead>
                <tbody>
                  {guestDetails.length === 0 ? (
                    <tr key="no-tours-found">
                      <td colSpan={7} className="border px-2 py-1 text-center text-gray-500">
                        No tours found
                      </td>
                    </tr>
                  ) : (
                    guestDetails.map((guest: GuestVisit, i) => (
                      <tr key={guest.guest_id ? `${guest.guest_id}` : `${guest.first_name}_${guest.last_name}_${guest.tour_date}_${i}`}>
                        <td className="border px-2 py-1">{`${guest.first_name} ${guest.last_name}`}</td>
                        <td className="border px-2 py-1">{guest.tour_date}</td>
                        <td className="border px-2 py-1">{guest.tour_time}</td>
                        <td className="border px-2 py-1">{guest.source}</td>
                        <td className="border px-2 py-1">{guest.phone}</td>
                        <td className="border px-2 py-1">{guest.email}</td>
                        <td className="border px-2 py-1">{guest.salesperson || '(unassigned)'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* Deals Detail */}
            {(selected.metricIndex === 2 || selected.metricIndex === 3) && (
              loadingDetails ? (
                <div className="text-center p-4">Loading deal details...</div>
              ) : (
                <table className="w-full text-sm mb-2 border-collapse">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">Sale ID</th>
                      <th className="border px-2 py-1">Member Name</th>
                      <th className="border px-2 py-1 text-right">Amount</th>
                      <th className="border px-2 py-1">Date</th>
                      <th className="border px-2 py-1">Current Assignment</th>
                      <th className="border px-2 py-1">Reassign</th>
                      <th className="border px-2 py-1">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dealDetails.length === 0 ? (
                      <tr key="no-deals-found">
                        <td colSpan={7} className="border px-2 py-1 text-center text-gray-500">
                          No deals found
                        </td>
                      </tr>
                    ) : (
                      dealDetails.map((deal: SalesEntry) => (
                        <tr key={deal.sale_id}>
                          <td className="border px-2 py-1">{deal.sale_id}</td>
                          <td className="border px-2 py-1">{deal.member_name}</td>
                          <td className="border px-2 py-1 text-right">
                            {deal.total_amount.toFixed(2)}
                          </td>
                          <td className="border px-2 py-1">{deal.latest_payment_date}</td>
                          <td className="border px-2 py-1 text-xs italic">
                            {deal.commission_employees || '(unassigned)'}
                          </td>
                          <td className="border px-2 py-1">
                            <select
                              className="w-full text-xs"
                              value={dealAssignMap[deal.sale_id] || ''}
                              onChange={ev =>
                                setDealAssignMap(m => ({
                                  ...m,
                                  [deal.sale_id]: ev.target.value
                                }))
                              }
                            >
                              <option value="">— none —</option>
                              {staffList
                                .filter(st => st !== 'Other')
                                .map(st => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td className="border px-2 py-1 text-center">
                            <button
                              className="text-sm bg-blue-500 text-white px-2 py-1 rounded"
                              onClick={() => saveDealAssignment(deal.sale_id)}
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

            {/* Access, Amenities Plus, Champions Training Detail */}
            {([4,5,6,7,8,9].includes(selected.metricIndex)) && (
              loadingDetails ? (
                <div className="text-center p-4">Loading details...</div>
              ) : (
                <table className="w-full text-sm mb-2 border-collapse">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">Sale ID</th>
                      <th className="border px-2 py-1">Member Name</th>
                      <th className="border px-2 py-1 text-right">Amount</th>
                      <th className="border px-2 py-1">Date</th>
                      <th className="border px-2 py-1">Current Assignment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryDetails.length === 0 ? (
                      <tr key="no-category-deals-found">
                        <td colSpan={5} className="border px-2 py-1 text-center text-gray-500">
                          No deals found
                        </td>
                      </tr>
                    ) : (
                      categoryDetails.map((deal: SalesEntry) => (
                        <tr key={deal.sale_id}>
                          <td className="border px-2 py-1">{deal.sale_id}</td>
                          <td className="border px-2 py-1">{deal.member_name}</td>
                          <td className="border px-2 py-1 text-right">{deal.total_amount.toFixed(2)}</td>
                          <td className="border px-2 py-1">{deal.latest_payment_date}</td>
                          <td className="border px-2 py-1 text-xs italic">{deal.commission_employees || '(unassigned)'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )
            )}

            {/* Paid Passes Detail */}
            {(selected.metricIndex === 10 || selected.metricIndex === 11) && (
              loadingDetails ? (
                <div className="text-center p-4">Loading details...</div>
              ) : (
                <table className="w-full text-sm mb-2 border-collapse">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">Sale ID</th>
                      <th className="border px-2 py-1">Member Name</th>
                      <th className="border px-2 py-1 text-right">Amount</th>
                      <th className="border px-2 py-1">Date</th>
                      <th className="border px-2 py-1">Current Assignment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paidPassesDetails.length === 0 ? (
                      <tr key="no-paid-passes-found">
                        <td colSpan={5} className="border px-2 py-1 text-center text-gray-500">
                          No paid passes found
                        </td>
                      </tr>
                    ) : (
                      paidPassesDetails.map((deal: SalesEntry) => (
                        <tr key={deal.sale_id}>
                          <td className="border px-2 py-1">{deal.sale_id}</td>
                          <td className="border px-2 py-1">{deal.member_name}</td>
                          <td className="border px-2 py-1 text-right">{deal.total_amount.toFixed(2)}</td>
                          <td className="border px-2 py-1">{deal.latest_payment_date}</td>
                          <td className="border px-2 py-1 text-xs italic">{deal.commission_employees || '(unassigned)'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )
            )}

            {/* Out of Area, Underage, Class Pass Detail */}
            {([12,13,14,15,16,17].includes(selected.metricIndex)) && (
              loadingDetails ? (
                <div className="text-center p-4">Loading details...</div>
              ) : (
                <table className="w-full text-sm mb-2 border-collapse">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">Guest Name</th>
                      <th className="border px-2 py-1">Tour Date</th>
                      <th className="border px-2 py-1">Tour Time</th>
                      <th className="border px-2 py-1">Source</th>
                      <th className="border px-2 py-1">Phone</th>
                      <th className="border px-2 py-1">Email</th>
                      <th className="border px-2 py-1">Assigned To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guestSourceDetails.length === 0 ? (
                      <tr key="no-guests-found">
                        <td colSpan={7} className="border px-2 py-1 text-center text-gray-500">
                          No guests found
                        </td>
                      </tr>
                    ) : (
                      guestSourceDetails.map((guest: GuestVisit, i) => (
                        <tr key={guest.guest_id ? `${guest.guest_id}` : `${guest.first_name}_${guest.last_name}_${guest.tour_date}_${i}`}>
                          <td className="border px-2 py-1">{`${guest.first_name} ${guest.last_name}`}</td>
                          <td className="border px-2 py-1">{guest.tour_date}</td>
                          <td className="border px-2 py-1">{guest.tour_time}</td>
                          <td className="border px-2 py-1">{guest.source}</td>
                          <td className="border px-2 py-1">{guest.phone}</td>
                          <td className="border px-2 py-1">{guest.email}</td>
                          <td className="border px-2 py-1">{guest.salesperson || '(unassigned)'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}