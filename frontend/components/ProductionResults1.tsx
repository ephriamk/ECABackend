// components/ProductionResults1.tsx
'use client'

import React, { useState, useEffect } from 'react'

// Header definitions
const GROUP_HEADERS = ['Quota', 'MTD', 'Projected']
const SUB_HEADERS   = ['Today', 'MTD']
const METRIC_CATEGORIES = [
  'NB Cash*', 'EFT', 'PT', 'FENPT Units', "BR's",
  '1st Workout', '5-Star Reviews', '30 Day Reprogram', 'Other Reprogram'
]

// PT‐related profit_center values
const PT_CENTERS = [
  'PT Postdate - New',
  'PT Postdate - Renew',
  'Personal Training - NEW',
  'Personal Training - RENEW',
]

// Upgrade main_item values to include in NB Cash
const UPGRADE_ITEMS = [
  'UPG to AMT+',
  'CT UPGRADE',
  'UPG CTG',
  'Upg to AMT',
  'CT - Upgrade',
  
  
]

interface CashEntry {
  sale_id: number
  member_name: string
  total_amount: number
  profit_center: string
  commission_employees: string
  sales_person: string
  latest_payment_date: string // YYYY-MM-DD
}

interface EftEntry {
  sale_id: number
  member_name: string
  price: number
  commission_employees: string
  sales_person: string
  latest_payment_date: string // YYYY-MM-DD
  agreement_payment_plan?: string
  main_item?: string
}

interface SaleAll {
  sale_id: number
  agreement_number: string
  member_name: string
  sales_person: string
  profit_center: string
  main_item?: string
  transaction_count: number
  latest_payment_date: string // YYYY-MM-DD
  total_amount: number
  commission_employees: string
  agreement_payment_plan?: string
}

interface Employee {
  name: string
  quota?: string
}

interface WorkoutCounts {
  [employee: string]: { today: number; mtd: number }
}

interface EftCounts {
  [employee: string]: { today: number; mtd: number }
}

interface WorkoutDetail {
  workout_id: string
  member_name: string
  event_date: string
  employee: string
}

interface EftDetail {
  sale_id: number
  member_name: string
  payment_date: string
  agreement_payment_plan: string
  matched_membership: string
  eft_amount: number
  total_sale_amount: number
  commission_employees: string
}

interface RowData {
  staff: string
  quota: string
  mtd: string
  projected: string
  metrics: string[]
}

interface Selected {
  staff: string
  metricIndex: number
  type: 'today' | 'mtd'
}

// normalize / canonicalize helpers (same as PersonalTraining.tsx)
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

// Only assign multi-owner sales > $25; tiny passes go to 'Other'
function getOwners(
  entry: { commission_employees: string; total_amount?: number, main_item?: string, profit_center?: string },
  official: string[],
  consolidationMap?: Record<string, string>
): string[] {
  // Only apply $25 rule to non-upgrades
  const isUpgrade = entry.profit_center === 'Promotion' && entry.main_item && isUpgradeItem(entry.main_item);
  if (entry.total_amount !== undefined && entry.total_amount <= 25 && !isUpgrade) {
    return []
  }
  const raw = entry.commission_employees || ''
  return raw
    .split(',')
    .map(c => {
      const normalized = normalizeName(c)
      if (consolidationMap && consolidationMap[normalized]) {
        return consolidationMap[normalized]
      }
      // If not in consolidation map, try to match against official employees
      const matched = canonicalize(normalized, official)
      // Only return if it's actually an official employee
      if (official.some(o => o.toLowerCase() === matched.toLowerCase())) {
        return matched
      }
      return '' // Will map to "Other"
    })
    .filter(Boolean)
}

// Helper to check if a main_item is an upgrade
function isUpgradeItem(main_item: string | undefined): boolean {
  if (!main_item) return false;
  const main = main_item.trim().toLowerCase();
  if (main.startsWith('upg')) return true;
  return UPGRADE_ITEMS.some(item => main === item.toLowerCase());
}

// Helper to check if an EFT entry is an upgrade (needs salesAll context)
function isEftUpgrade(e: { sale_id: number }, salesAll?: SaleAll[]): boolean {
  if (!salesAll) return false;
  const sale = salesAll.find(s => s.sale_id === e.sale_id)
  return !!(sale && sale.profit_center === 'Promotion' && isUpgradeItem(sale.main_item));
}

export default function ProductionResults1() {
  const [staffList, setStaffList]         = useState<string[]>([])
  const [cashEntries, setCashEntries]     = useState<CashEntry[]>([])
  const [eftEntries, setEftEntries]       = useState<EftEntry[]>([])
  const [salesAll, setSalesAll]           = useState<SaleAll[]>([])
  const [employees, setEmployees]         = useState<Employee[]>([])
  const [selected, setSelected]           = useState<Selected|null>(null)
  const [assignMap, setAssignMap]         = useState<Record<number,string>>({})
  const [searchOpen, setSearchOpen]       = useState(false)
  const [searchQuery, setSearchQuery]     = useState('')
  const [consolidationMap, setConsolidationMap] = useState<Record<string,string>>({})

  // Add state for trainers and combined assignment options
  const [trainerList, setTrainerList] = useState<{name: string, position: string}[]>([])
  const [ptAssignmentOptions, setPtAssignmentOptions] = useState<string[]>([])

  // State for workout & EFT details/assignments
  const [workoutDetails, setWorkoutDetails] = useState<WorkoutDetail[]>([])
  const [eftDetails, setEftDetails]         = useState<EftDetail[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [workoutAssignMap, setWorkoutAssignMap] = useState<Record<string,string>>({})
  const [eftAssignMap, setEftAssignMap]         = useState<Record<number,string>>({})

  const [showEftDebug, setShowEftDebug] = useState(false)

  const [memberships, setMemberships] = useState<{membership_type:string, price:number}[]>([])

  const [pendingAssignMap, setPendingAssignMap] = useState<Record<number,string>>({})

  // Replace individual count states with event-based counts (like PersonalTraining.tsx)
  const [firstWorkoutCounts, setFirstWorkoutCounts] = useState<Record<string, { today: number; mtd: number }>>({})
  const [thirtyDayCounts, setThirtyDayCounts] = useState<Record<string, { today: number; mtd: number }>>({})
  const [otherReprogramCounts, setOtherReprogramCounts] = useState<Record<string, { today: number; mtd: number }>>({})

  // Build membership price lookup for EFT upgrades
  const membershipPriceLookup: Record<string, number> = {};
  memberships.forEach(m => {
    if (m.membership_type) {
      membershipPriceLookup[m.membership_type.trim().toLowerCase()] = m.price;
    }
  });
  function getUpgradeEftValue(s: any) {
    // Use the full total_amount for upgrades
    return s.total_amount || 0;
  }

  const [undoAvailable, setUndoAvailable] = useState(false)

  // Check if undo is available
  async function checkUndoAvailable() {
    try {
      const res = await fetch('http://localhost:8000/api/sales/undo-available')
      if (!res.ok) throw new Error('Failed to check undo availability')
      const data = await res.json()
      setUndoAvailable(!!data.available)
    } catch {
      setUndoAvailable(false)
    }
  }

  useEffect(() => {
    checkUndoAvailable()
  }, [])

  useEffect(() => {
    // Load employees, sales, trainers, and event counts
    Promise.all([
      fetch('http://localhost:8000/api/employees'),
      fetch('http://localhost:8000/api/sales/nb-cash-entries'),
      fetch('http://localhost:8000/api/sales/eft-entries'),
      fetch('http://localhost:8000/api/sales/all'),
      fetch('http://localhost:8000/api/employees/trainers'),
      fetch('http://localhost:8000/api/events/first-workout/counts'),
      fetch('http://localhost:8000/api/events/thirtyday-reprogram/counts'),
      fetch('http://localhost:8000/api/events/other-reprogram/counts'),
    ])
    .then(async ([resEmp, resCash, resEft, resAll, resTrainers, resFW, res30, resOther]) => {
      if (![resEmp,resCash,resEft,resAll].every(r => r.ok)) {
        throw new Error('API failed')
      }
      const empData  = await resEmp.json()  as Employee[]
      const cashData = await resCash.json() as CashEntry[]
      const eftData  = await resEft.json()  as EftEntry[]
      const allData  = await resAll.json()  as SaleAll[]
      
      // Load trainers (may fail if endpoint doesn't exist)
      let trainersData: {name: string, position: string}[] = []
      if (resTrainers.ok) {
        try {
          trainersData = await resTrainers.json()
        } catch {
          trainersData = []
        }
      }

      // Load event counts
      let fwCounts = {}
      let tdCounts = {}
      let otherCounts = {}
      if (resFW.ok) fwCounts = await resFW.json()
      if (res30.ok) tdCounts = await res30.json()
      if (resOther.ok) otherCounts = await resOther.json()

      // Use the backend's ordering and filtering for official staff
      const official = empData.map(e => normalizeName(e.name)).filter(n => n)
      
      // Normalize trainer names
      const normalizedTrainers = trainersData.map(t => ({
        name: normalizeName(t.name),
        position: t.position
      })).filter(t => t.name)
      
      // Create combined PT assignment options (sales staff + trainers, no duplicates)
      const trainerNames = normalizedTrainers.map(t => t.name)
      const salesStaffOnly = official.filter(name => !trainerNames.includes(name))
      const ptOptions = [...salesStaffOnly, ...trainerNames].sort()
      
      // Collect all unique names from the data to build consolidation map
      const allNamesSet = new Set<string>()
      official.forEach(name => allNamesSet.add(name))
      trainerNames.forEach(name => allNamesSet.add(name))
      
      // Add names from cash entries
      cashData.forEach(e => {
        const owners = (e.commission_employees || '').split(',').map(n => normalizeName(n)).filter(Boolean)
        owners.forEach(o => allNamesSet.add(o))
      })
      
      // Add names from all sales
      allData.forEach(e => {
        const owners = (e.commission_employees || '').split(',').map(n => normalizeName(n)).filter(Boolean)
        owners.forEach(o => allNamesSet.add(o))
      })
      
      const allNames = Array.from(allNamesSet)
      
      // Create consolidation map - include both sales staff and trainers
      const consolidationMap: Record<string, string> = {}
      const allOfficialNames = [...official, ...trainerNames]
      
      // For each name found in the data, try to match it to an official employee or trainer
      allNames.forEach(name => {
        // Check if this name is already an official employee or trainer
        const exactMatch = allOfficialNames.find(o => o.toLowerCase() === name.toLowerCase())
        if (exactMatch) {
          consolidationMap[name] = exactMatch
          return
        }
        
        // Try to find a match among official employees and trainers
        const canonicalName = canonicalize(name, allOfficialNames)
        
        // Only add to consolidation map if we found a match
        const matchedOfficial = allOfficialNames.find(o => o.toLowerCase() === canonicalName.toLowerCase())
        if (matchedOfficial) {
          consolidationMap[name] = matchedOfficial
        }
        // If no match found, this name will map to "Other"
      })
      
      // Staff list should only include official sales employees + "Web" + "Other"
      const finalStaffList = [...official, 'Web', 'Other']

      // init assignments by sale_id
      const m: Record<number,string> = {}
      allData.forEach(e => {
        const owners = getOwners(e, allOfficialNames, consolidationMap)
        if (owners.length > 0) {
          // Check if the owner is in the consolidation map
          const firstOwner = owners[0]
          const mappedOwner = consolidationMap[firstOwner] || ''
          m[e.sale_id] = mappedOwner // Empty string will map to "Other"
        } else if (
          e.profit_center === 'New Business' &&
          (!e.commission_employees || e.commission_employees.trim() === '')
        ) {
          // Assign to 'Web' only if truly unassigned
          m[e.sale_id] = 'Web'
        } else {
          m[e.sale_id] = ''
        }
      })

      setEmployees(empData)
      setStaffList(finalStaffList)
      setTrainerList(normalizedTrainers)
      setPtAssignmentOptions(ptOptions)
      setCashEntries(cashData)
      setEftEntries(eftData)
      setSalesAll(allData)
      setAssignMap(m)
      setConsolidationMap(consolidationMap)
      setFirstWorkoutCounts(fwCounts)
      setThirtyDayCounts(tdCounts)
      setOtherReprogramCounts(otherCounts)
    })
    .catch(console.error)

    // Fetch memberships for EFT price lookup
    fetch('http://localhost:8000/api/memberships')
      .then(res => res.ok ? res.json() : Promise.reject('Memberships'))
      .then(setMemberships)
      .catch(() => setMemberships([]))
  }, [])

  // Save workout assignment
  async function saveWorkoutAssignment(workoutId: string) {
    const newOwner = workoutAssignMap[workoutId]
    try {
      const res = await fetch(`http://localhost:8000/api/events/first-workout/reassign`, {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ workout_id: workoutId, new_employee: newOwner })
      })
      if(!res.ok){
        alert('Reassignment failed: ' + await res.text())
        return
      }
      const result = await res.json()
      alert(result.message || 'Workout reassigned successfully!')
      // Refresh event counts
      fetch('http://localhost:8000/api/events/first-workout/counts')
        .then(res => res.ok ? res.json() : {})
        .then(setFirstWorkoutCounts)
        .catch(() => setFirstWorkoutCounts({}))
      if (selected) setSelected({...selected})
    } catch (error) {
      alert('Error reassigning workout: ' + error)
    }
  }

  // Save EFT assignment
  async function saveEftAssignment(sale_id: number) {
    const newOwner = eftAssignMap[sale_id]
    try {
      const res = await fetch(`http://localhost:8000/api/sales/${sale_id}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ commission_employees: newOwner })
      })
      if (!res.ok) {
        alert('EFT reassignment failed: ' + await res.text())
        return
      }
      alert('EFT sale reassigned successfully!')
      setCashEntries(es => es.map(e => e.sale_id === sale_id ? {...e, commission_employees: newOwner} : e))
      setEftEntries(es => es.map(e => e.sale_id === sale_id ? {...e, commission_employees: newOwner} : e))
      setSalesAll(sa => sa.map(s => s.sale_id === sale_id ? {...s, commission_employees: newOwner} : s))
      if (selected) setSelected({...selected})
    } catch (error) {
      alert('Error reassigning EFT sale: ' + error)
    }
  }

  // Save generic sale (cash/PT) assignment
  async function saveAssignment(sale_id: number) {
    const newOwner = pendingAssignMap[sale_id] !== undefined ? pendingAssignMap[sale_id] : assignMap[sale_id] || ''
    try {
      const res = await fetch(`http://localhost:8000/api/sales/${sale_id}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ commission_employees: newOwner })
      })
      if (!res.ok) {
        alert('Assignment failed: ' + await res.text())
        return
      }
      alert('Sale reassigned successfully!')
      setCashEntries(es => es.map(e => e.sale_id === sale_id ? {...e, commission_employees: newOwner} : e))
      setEftEntries(es => es.map(e => e.sale_id === sale_id ? {...e, commission_employees: newOwner} : e))
      setSalesAll(sa => sa.map(s => s.sale_id === sale_id ? {...s, commission_employees: newOwner} : s))
      setAssignMap(m => ({...m, [sale_id]: newOwner}))
      setPendingAssignMap(m => { const { [sale_id]:_, ...rest } = m; return rest })
      if (selected) setSelected({...selected})
    } catch (error) {
      alert('Error reassigning sale: ' + error)
    }
  }

  // Fetch details when modal opens
  useEffect(() => {
    if (!selected) {
      setWorkoutDetails([])
      setEftDetails([])
      return
    }
    const { staff, metricIndex, type } = selected
    const isWorkout = metricIndex === 10 || metricIndex === 11
    const isReprogram = metricIndex === 14 || metricIndex === 15
    const isEft     = metricIndex === 2  || metricIndex === 3

    setLoadingDetails(true)

    if (isWorkout) {
      // Use events-based endpoint for workout details
      fetch(`http://localhost:8000/api/events/first-workout/details/${encodeURIComponent(staff)}/${type}`)
        .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch workout details'))
        .then(data => {
          const details = data.details || []
          setWorkoutDetails(details)
          const map: Record<string,string> = {}
          details.forEach((w: WorkoutDetail) => {
            map[w.workout_id] = w.employee || ''
          })
          setWorkoutAssignMap(map)
          setLoadingDetails(false)
        })
        .catch(() => {
          setWorkoutDetails([])
          setLoadingDetails(false)
        })
    } else if (isReprogram) {
      // Use events-based endpoint for reprogram details
      fetch(`http://localhost:8000/api/events/reprogram/details/${encodeURIComponent(staff)}/${type}`)
        .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch reprogram details'))
        .then(data => {
          setWorkoutDetails(data.details || []) // Reuse workout details for reprogram
          setLoadingDetails(false)
        })
        .catch(() => {
          setWorkoutDetails([])
          setLoadingDetails(false)
        })
    } else if (isEft) {
      // Keep existing EFT logic as it's sales-based, not event-based
      fetch(`http://localhost:8000/api/eft-calculations/details/${encodeURIComponent(staff)}/${type}`)
        .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch EFT details'))
        .then(data => {
          const details = data.details || []
          setEftDetails(details)
          const map: Record<number,string> = {}
          details.forEach((e: EftDetail) => {
            map[e.sale_id] = assignMap[e.sale_id] ?? e.commission_employees ?? ''
          })
          setEftAssignMap(map)
          setLoadingDetails(false)
        })
        .catch(() => {
          setEftDetails([])
          setLoadingDetails(false)
        })
    } else {
      setWorkoutDetails([])
      setEftDetails([])
      setLoadingDetails(false)
    }
  }, [selected, assignMap, consolidationMap, staffList, firstWorkoutCounts])

  // FIXED: Calculate yesterday's date in YYYY-MM-DD format
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const today = [
    yesterday.getFullYear(),
    String(yesterday.getMonth()+1).padStart(2,'0'),
    String(yesterday.getDate()).padStart(2,'0')
  ].join('-')

  // Build a map of staff name to quota
  const quotaMap: Record<string, number> = {};
  employees.forEach(e => {
    if (e.name) quotaMap[normalizeName(e.name)] = Number(e.quota) || 0;
  });

  // Calculate days in month and days elapsed
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayNum = now.getDate();
  const daysElapsed = todayNum;

  // Build a list of all official names (sales staff + trainers, excluding Web/Other)
  const allOfficialNames = [
    ...staffList.filter(n => n !== 'Web' && n !== 'Other'),
    ...trainerList.map(t => t.name)
  ]

  // Build each row, using assignMap for "owns"
  const rowsData: RowData[] = staffList.map(name => {
    // REFINED "owns" function: use consolidationMap + staffList for PT, otherwise rely on assignMap
    const owns = (e: any) => {
      // If it's a PT entry, match via consolidationMap → allOfficialNames, but only from commission_employees
      if (PT_CENTERS.map(c => c.toLowerCase()).includes((e.profit_center || '').toLowerCase())) {
        const rawOwners = (e.commission_employees || '').split(',')
          .map((n: string) => normalizeName(n))
          .filter(Boolean)
        const mapped = rawOwners.map((n: string) => consolidationMap[n] || n)
          .filter((n: string) => allOfficialNames.includes(n))
        if (mapped.length > 0) {
          return mapped.includes(name)
        }
        // If nobody mapped (i.e. unassigned PT), assign to 'Other' only if not matching any official name
        return name === 'Other'
      }

      // Non-PT: use assignMap (which was prepopulated via getOwners on commission_employees)
      const owner = assignMap[e.sale_id] || ''
      if (name === 'Web') {
        return owner === 'Web'
      }
      if (name === 'Other') {
        // For non-PT, 'Other' means not matching any sales staff
        return owner === ''
      }
      return owner === name
    }

    // NB Cash sums - include regular cash entries + promotion/upgrade entries
    const mineCash = cashEntries.filter(owns)
    const mineUpgrades = salesAll.filter(s => 
      owns(s) && 
      s.profit_center === 'Promotion' && 
      s.main_item && 
      isUpgradeItem(s.main_item)
    )
    // Deduplicate sale_ids across both mineCash and mineUpgrades
    const allMineIdsToday = new Set([
      ...mineCash.filter(e => e.latest_payment_date === today).map(e => e.sale_id),
      ...mineUpgrades.filter(e => e.latest_payment_date === today).map(e => e.sale_id)
    ])
    const allMineIdsMTD = new Set([
      ...mineCash.map(e => e.sale_id),
      ...mineUpgrades.map(e => e.sale_id)
    ])
    const totalCashToday = Array.from(allMineIdsToday).reduce((sum, id) => {
      const e = mineCash.find(x => x.sale_id === id && x.latest_payment_date === today)
            || mineUpgrades.find(x => x.sale_id === id && x.latest_payment_date === today);
      return sum + (e ? e.total_amount : 0);
    }, 0)
    const totalCashMTD = Array.from(allMineIdsMTD).reduce((sum, id) => {
      const e = mineCash.find(x => x.sale_id === id)
            || mineUpgrades.find(x => x.sale_id === id);
      return sum + (e ? e.total_amount : 0);
    }, 0)
    
    // Add promotion/upgrade entries to NB Cash
    const sumUpgradesToday = mineUpgrades
      .filter(s => s.latest_payment_date === today)
      .reduce((s, e) => s + e.total_amount, 0)
    const sumUpgradesMTD = mineUpgrades
      .reduce((s, e) => s + e.total_amount, 0)
    
    // EFT - use eftEntries from backend, assign in frontend
    let eftToday = 0
    let eftMtd = 0
    // Helper to check if an EFT entry is an upgrade
    function isEftUpgrade(e: EftEntry) {
      const sale = salesAll.find(s => s.sale_id === e.sale_id)
      return sale && sale.profit_center === 'Promotion' && isUpgradeItem(sale.main_item)
    }
    if (name === 'Web') {
      // For 'Web', sum up EFT for all 'New Business' assigned to 'Web' (excluding upgrades)
      const webEftsToday = eftEntries.filter(e =>
        assignMap[e.sale_id] === 'Web' &&
        e.latest_payment_date === today &&
        !isEftUpgrade(e)
      )
      const webEftsMTD = eftEntries.filter(e =>
        assignMap[e.sale_id] === 'Web' &&
        !isEftUpgrade(e)
      )
      eftToday = webEftsToday.reduce((sum, e) => sum + (e.price || 0), 0)
      eftMtd = webEftsMTD.reduce((sum, e) => sum + (e.price || 0), 0)
      // Add upgrades assigned to Web
      const webUpgradesToday = salesAll.filter(s =>
        s.profit_center === 'Promotion' &&
        s.main_item &&
        isUpgradeItem(s.main_item) &&
        assignMap[s.sale_id] === 'Web' &&
        s.latest_payment_date === today
      ).reduce((sum, s) => sum + s.total_amount, 0)
      const webUpgradesMTD = salesAll.filter(s =>
        s.profit_center === 'Promotion' &&
        s.main_item &&
        isUpgradeItem(s.main_item) &&
        assignMap[s.sale_id] === 'Web'
      ).reduce((sum, s) => sum + s.total_amount, 0)
      eftToday += webUpgradesToday
      eftMtd += webUpgradesMTD
    } else if (name === 'Other') {
      // For 'Other', sum all EFTs not assigned to any staff or Web (excluding upgrades)
      const otherEftsToday = eftEntries.filter(e =>
        (!assignMap[e.sale_id] || assignMap[e.sale_id] === '') &&
        e.latest_payment_date === today &&
        !isEftUpgrade(e)
      )
      const otherEftsMTD = eftEntries.filter(e =>
        (!assignMap[e.sale_id] || assignMap[e.sale_id] === '') &&
        !isEftUpgrade(e)
      )
      eftToday = otherEftsToday.reduce((sum, e) => sum + (e.price || 0), 0)
      eftMtd = otherEftsMTD.reduce((sum, e) => sum + (e.price || 0), 0)
      // Add upgrades assigned to Other
      const otherUpgradesToday = salesAll.filter(s =>
        s.profit_center === 'Promotion' &&
        s.main_item &&
        isUpgradeItem(s.main_item) &&
        (!assignMap[s.sale_id] || assignMap[s.sale_id] === '') &&
        s.latest_payment_date === today
      ).reduce((sum, s) => sum + s.total_amount, 0)
      const otherUpgradesMTD = salesAll.filter(s =>
        s.profit_center === 'Promotion' &&
        s.main_item &&
        isUpgradeItem(s.main_item) &&
        (!assignMap[s.sale_id] || assignMap[s.sale_id] === '')
      ).reduce((sum, s) => sum + s.total_amount, 0)
      eftToday += otherUpgradesToday
      eftMtd += otherUpgradesMTD
    } else {
      // For each staff, sum all EFTs where commission_employees matches staff (excluding upgrades)
      const staffEftsToday = eftEntries.filter(e => {
        if (isEftUpgrade(e)) return false;
        const ceList = (e.commission_employees || '').split(',').map((n: string) => normalizeName(n)).filter(Boolean)
        const mapped = ceList.map((n: string) => consolidationMap[n] || n).filter((n: string) => staffList.includes(n))
        return mapped.includes(name) && e.latest_payment_date === today
      })
      const staffEftsMTD = eftEntries.filter(e => {
        if (isEftUpgrade(e)) return false;
        const ceList = (e.commission_employees || '').split(',').map((n: string) => normalizeName(n)).filter(Boolean)
        const mapped = ceList.map((n: string) => consolidationMap[n] || n).filter((n: string) => staffList.includes(n))
        return mapped.includes(name)
      })
      eftToday = staffEftsToday.reduce((sum, e) => sum + (e.price || 0), 0)
      eftMtd = staffEftsMTD.reduce((sum, e) => sum + (e.price || 0), 0)
      // Add upgrades assigned to this staff
      const staffUpgradesToday = salesAll.filter(s =>
        s.profit_center === 'Promotion' &&
        s.main_item &&
        isUpgradeItem(s.main_item) &&
        assignMap[s.sale_id] === name &&
        s.latest_payment_date === today
      ).reduce((sum, s) => sum + s.total_amount, 0)
      const staffUpgradesMTD = salesAll.filter(s =>
        s.profit_center === 'Promotion' &&
        s.main_item &&
        isUpgradeItem(s.main_item) &&
        assignMap[s.sale_id] === name
      ).reduce((sum, s) => sum + s.total_amount, 0)
      eftToday += staffUpgradesToday
      eftMtd += staffUpgradesMTD
    }

    // PT dollars – now only looking at commission_employees
    const minePT     = salesAll.filter(s => 
      PT_CENTERS.map(c => c.toLowerCase()).includes((s.profit_center || '').toLowerCase()) && owns(s)
    )
    const sumPTToday = minePT.filter(s => s.latest_payment_date === today)
                        .reduce((s,x) => s + x.total_amount, 0)
    const sumPTMTD   = minePT.reduce((s,x) => s + x.total_amount, 0)

    // Units
    const sumUnitsToday = minePT.filter(s => s.latest_payment_date === today)
                          .reduce((s,x) => s + (x.transaction_count || 0), 0)
    const sumUnitsMTD   = minePT.reduce((s,x) => s + (x.transaction_count || 0), 0)

    // 1st Workout - use event counts like PersonalTraining.tsx
    let fwToday = 0
    let fwMtd = 0
    
    if (name === 'Other') {
      // For "Other", sum up all workout counts that don't map to official employees
      Object.entries(firstWorkoutCounts).forEach(([empName, counts]) => {
        const canonicalName = consolidationMap[empName] || ''
        // Only add if the name doesn't map to any official employee
        if (!canonicalName || canonicalName === '' || !staffList.includes(canonicalName)) {
          fwToday += counts.today
          fwMtd += counts.mtd
        }
      })
    } else {
      // For official employees, sum up all their name variations
      Object.entries(firstWorkoutCounts).forEach(([empName, counts]) => {
        const canonicalName = consolidationMap[empName] || ''
        if (canonicalName === name) {
          fwToday += counts.today
          fwMtd += counts.mtd
        }
      })
    }

    // 30 Day Reprogram - similar logic to 1st Workout
    let rpToday = 0
    let rpMtd = 0
    if (name === 'Other') {
      Object.entries(thirtyDayCounts).forEach(([empName, counts]) => {
        const canonicalName = consolidationMap[empName] || ''
        if (!canonicalName || canonicalName === '' || !staffList.includes(canonicalName)) {
          rpToday += counts.today
          rpMtd += counts.mtd
        }
      })
    } else {
      Object.entries(thirtyDayCounts).forEach(([empName, counts]) => {
        const canonicalName = consolidationMap[empName] || ''
        if (canonicalName === name) {
          rpToday += counts.today
          rpMtd += counts.mtd
        }
      })
    }

    // Other Reprogram - similar logic
    let orToday = 0
    let orMtd = 0
    if (name === 'Other') {
      Object.entries(otherReprogramCounts).forEach(([empName, counts]) => {
        const canonicalName = consolidationMap[empName] || ''
        if (!canonicalName || canonicalName === '' || !staffList.includes(canonicalName)) {
          orToday += counts.today
          orMtd += counts.mtd
        }
      })
    } else {
      Object.entries(otherReprogramCounts).forEach(([empName, counts]) => {
        const canonicalName = consolidationMap[empName] || ''
        if (canonicalName === name) {
          orToday += counts.today
          orMtd += counts.mtd
        }
      })
    }

    // assemble metrics
    const m = Array(METRIC_CATEGORIES.length * SUB_HEADERS.length).fill('')
    m[0]  = totalCashToday.toFixed(2)
    m[1]  = totalCashMTD.toFixed(2)
    m[2]  = eftToday.toFixed(2)
    m[3]  = eftMtd.toFixed(2)
    m[4]  = sumPTToday.toFixed(2)
    m[5]  = sumPTMTD.toFixed(2)
    m[6]  = sumUnitsToday.toString()
    m[7]  = sumUnitsMTD.toString()
    m[8]  = '0'
    m[9]  = '0'
    m[10] = fwToday.toString()
    m[11] = fwMtd.toString()
    m[12] = '0'
    m[13] = '0'
    m[14] = rpToday.toString()
    m[15] = rpMtd.toString()
    m[16] = orToday.toString()
    m[17] = orMtd.toString()

    // MTD value for this staff
    const mtdValue = totalCashMTD + eftMtd + sumPTMTD;
    // Quota for this staff
    const quota = quotaMap[name] || 0;
    // Projected value for this staff
    let projected = '';
    if (quota > 0 && daysElapsed > 0) {
      const projectedTotal = (mtdValue / daysElapsed) * daysInMonth;
      const projectedPercent = projectedTotal / quota;
      projected = Math.round(projectedPercent * 100) + '%';
    } else {
      projected = '';
    }

    return { staff: name, quota: quota ? String(quota) : '', mtd: mtdValue.toFixed(2), projected, metrics: m }
  })

  // Add unique upgrade totals
  const upgradeEntries = salesAll.filter((s: SaleAll) => 
    s.profit_center === 'Promotion' && 
    s.main_item && 
    isUpgradeItem(s.main_item)
  );

  // Compute deduped NB Cash totals (including upgrades)
  // Union of sale_ids from both cashEntries and upgradeEntries
  const allRelevantIdsToday = Array.from(new Set([
    ...cashEntries.filter((e: CashEntry) => e.latest_payment_date === today).map((e: CashEntry) => e.sale_id),
    ...upgradeEntries.filter((e: SaleAll) => e.latest_payment_date === today).map((e: SaleAll) => e.sale_id)
  ]));
  const allRelevantIdsMTD = Array.from(new Set([
    ...cashEntries.map((e: CashEntry) => e.sale_id),
    ...upgradeEntries.map((e: SaleAll) => e.sale_id)
  ]));

  const totalCashTodayUnique = allRelevantIdsToday.reduce((sum: number, id: number) => {
    const e = cashEntries.find((x: CashEntry) => x.sale_id === id && x.latest_payment_date === today)
           || upgradeEntries.find((x: SaleAll) => x.sale_id === id && x.latest_payment_date === today);
    return sum + (e ? e.total_amount : 0);
  }, 0);
  const totalCashMTDUnique = allRelevantIdsMTD.reduce((sum: number, id: number) => {
    const e = cashEntries.find((x: CashEntry) => x.sale_id === id)
           || upgradeEntries.find((x: SaleAll) => x.sale_id === id);
    return sum + (e ? e.total_amount : 0);
  }, 0);

  // Build totals row
  const totalsRow: RowData = (() => {
    const totalMetrics = Array(METRIC_CATEGORIES.length * SUB_HEADERS.length).fill(0)
    rowsData.forEach(r => r.metrics.forEach((v,i) => totalMetrics[i] += parseFloat(v)||0))
    const formatted = totalMetrics.map((t,i) =>
      (i===6||i===7||i>=8) ? Math.round(t).toString() : t.toFixed(2)
    )
    // override NB Cash with deduped totals
    formatted[0] = totalCashTodayUnique.toFixed(2)
    formatted[1] = totalCashMTDUnique.toFixed(2)
    return { staff:'TOTALS', quota:'', mtd:'', projected:'', metrics: formatted }
  })()

  const getMetricCategoryName = (idx: number) =>
    METRIC_CATEGORIES[Math.floor(idx/2)] || 'Unknown'

  const detailList = selected
    ? (() => {
        const { staff, metricIndex:idx, type } = selected
        if (idx === 0 || idx === 1) {
          // NB Cash popup: use cashEntries and upgrades, filter by assignment and date
          // Use the same owns logic as the main table
          const owns = (e: any) => {
            // PT logic not needed for NB Cash
            const owner = assignMap[e.sale_id] || ''
            if (staff === 'Web') return owner === 'Web'
            if (staff === 'Other') return owner === ''
            return owner === staff
          }
          const cashList = cashEntries.filter(e => {
            if (!owns(e)) return false
            if (idx === 0) {
              return e.latest_payment_date === today;
            }
            return true;
          })
          let upgradeList = salesAll.filter(s => {
            if (s.profit_center !== 'Promotion' || !s.main_item) return false
            if (!isUpgradeItem(s.main_item)) return false
            if (!owns(s)) return false
            if (idx === 0) {
              return s.latest_payment_date === today;
            }
            return true;
          })
          // Deduplicate upgrades by sale_id
          const seenUpgradeIds = new Set();
          upgradeList = upgradeList.filter(s => {
            if (seenUpgradeIds.has(s.sale_id)) return false;
            seenUpgradeIds.add(s.sale_id);
            return true;
          });
          return [...cashList, ...upgradeList]
        }
        if (idx === 2 || idx === 3) {
          // EFT entries (regular + upgrades as synthetic EFTs)
          const isToday = idx === 2;
          // Regular EFTs (from eftEntries, excluding upgrades)
          const eftDetails = eftEntries.filter(e => {
            if (isEftUpgrade(e, salesAll)) return false;
            if (staff === 'Web') return assignMap[e.sale_id] === 'Web' && (isToday ? e.latest_payment_date === today : true)
            if (staff === 'Other') return (!assignMap[e.sale_id] || assignMap[e.sale_id] === '') && (isToday ? e.latest_payment_date === today : true)
            const ceList = (e.commission_employees || '').split(',').map((n: string) => normalizeName(n)).filter(Boolean)
            const mapped = ceList.map((n: string) => consolidationMap[n] || n).filter((n: string) => staffList.includes(n))
            return mapped.includes(staff) && (isToday ? e.latest_payment_date === today : true)
          })
          // Upgrades as synthetic EFTs
          const upgradeEfts = salesAll.filter(s => {
            if (s.profit_center !== 'Promotion' || !s.main_item) return false;
            if (!isUpgradeItem(s.main_item)) return false;
            if (staff === 'Web') return assignMap[s.sale_id] === 'Web' && (isToday ? s.latest_payment_date === today : true)
            if (staff === 'Other') return (!assignMap[s.sale_id] || assignMap[s.sale_id] === '') && (isToday ? s.latest_payment_date === today : true)
            return assignMap[s.sale_id] === staff && (isToday ? s.latest_payment_date === today : true)
          }).map(s => ({
            sale_id: s.sale_id,
            member_name: s.member_name,
            payment_date: s.latest_payment_date,
            agreement_payment_plan: 'Upgrade',
            matched_membership: s.main_item || '',
            eft_amount: s.total_amount,
            total_sale_amount: s.total_amount,
            commission_employees: s.commission_employees,
          }))
          return [
            ...eftDetails.map(e => ({
              sale_id: e.sale_id,
              member_name: e.member_name,
              payment_date: e.latest_payment_date,
              agreement_payment_plan: e.agreement_payment_plan || '',
              matched_membership: e.main_item || '',
              eft_amount: e.price || 0,
              total_sale_amount: (salesAll.find(s => s.sale_id === e.sale_id)?.total_amount) || 0,
              commission_employees: e.commission_employees,
            })),
            ...upgradeEfts
          ]
        }
        if (idx === 4 || idx === 5 || idx === 6 || idx === 7) {
          // PT popups: filter salesAll for PT_CENTERS and assignment
          const isToday = idx % 2 === 0;
          const isUnits = idx === 6 || idx === 7;
          const owns = (e: any) => {
            if (PT_CENTERS.map(c => c.toLowerCase()).includes((e.profit_center || '').toLowerCase())) {
              const rawOwners = (e.commission_employees || '').split(',').map((n: string) => normalizeName(n)).filter(Boolean)
              const mapped = rawOwners.map((n: string) => consolidationMap[n] || n).filter((n: string) => staffList.includes(n))
              if (mapped.length > 0) {
                return mapped.includes(staff)
              }
              return staff === 'Other'
            }
            return false
          }
          return salesAll.filter(s =>
            PT_CENTERS.map(c => c.toLowerCase()).includes((s.profit_center || '').toLowerCase()) &&
            owns(s) &&
            (isToday ? s.latest_payment_date === today : true)
          )
        }
      })()
    : []

  const safeDetailList = detailList || [];

  // Deduplicate safeDetailList by the key used for rendering
  const seenKeys = new Set();
  const dedupedDetailList = safeDetailList.filter(item => {
    const key = item.sale_id + '_' + ((item as any).profit_center || '') + '_' + ((item as any).main_item || '') + '_' + ((item as any).latest_payment_date || '');
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  const filteredSales = salesAll.filter(s => {
    const q = searchQuery.toLowerCase()
    return String(s.member_name || '').toLowerCase().includes(q)
        || String(s.sales_person || '').toLowerCase().includes(q)
        || String(s.agreement_number || '').toLowerCase().includes(q)
  })

  // For search modal assignment editing
  const [searchAssignMap, setSearchAssignMap] = useState<Record<number, string>>({});

  useEffect(() => {
    // Initialize searchAssignMap when filteredSales changes
    if (searchOpen) {
      const m: Record<number, string> = {};
      filteredSales.forEach(s => {
        m[s.sale_id] = s.commission_employees || '';
      });
      setSearchAssignMap(m);
    }
  }, [searchOpen, searchQuery, salesAll]);

  const [otherPromoItems, setOtherPromoItems] = useState<any[]>([])
  const [showOtherPromoModal, setShowOtherPromoModal] = useState(false)

  // Fetch all promo-only items and filter for 'other' promo items
  useEffect(() => {
    async function fetchOtherPromo() {
      try {
        const res = await fetch('http://localhost:8000/api/sales/all')
        if (!res.ok) return
        const allSales = await res.json()
        // Filter for promo-only: profit_center = 'Promotion', main_item not like '%Downgrade%'
        let promoItems = allSales.filter((s: any) =>
          s.profit_center === 'Promotion' &&
          (!s.main_item || !s.main_item.toLowerCase().includes('downgrade'))
        )
        // Remove upgrades (isUpgradeItem) and Guest Fee, and remove New Business
        promoItems = promoItems.filter((s: any) => {
          if (!s.main_item) return true
          const main = s.main_item.toLowerCase()
          if (isUpgradeItem(s.main_item)) return false
          if (main.startsWith('guest fee')) return false
          return true
        })
        setOtherPromoItems(promoItems)
      } catch {}
    }
    fetchOtherPromo()
  }, [salesAll])

  return (
    <div className="mb-4 relative">
      {/* Export/Import Buttons */}
      <div className="flex gap-2 mb-2">
        <button
          className="px-3 py-1 bg-green-600 text-white rounded border border-green-800 hover:bg-green-700"
          onClick={() => {
            // Download CSV from backend
            fetch('http://localhost:8000/api/sales/export-csv')
              .then(res => {
                if (!res.ok) throw new Error('Failed to export CSV')
                return res.blob()
              })
              .then(blob => {
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'sales_export.csv'
                document.body.appendChild(a)
                a.click()
                a.remove()
                window.URL.revokeObjectURL(url)
              })
              .catch(err => alert('Export failed: ' + err))
          }}
        >
          Export Sales DB as CSV
        </button>
        <label className="px-3 py-1 bg-blue-600 text-white rounded border border-blue-800 hover:bg-blue-700 cursor-pointer">
          Replace Sales DB with CSV
          <input
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const formData = new FormData()
              formData.append('file', file)
              try {
                const res = await fetch('http://localhost:8000/api/sales/import-csv', {
                  method: 'POST',
                  body: formData
                })
                if (!res.ok) {
                  const err = await res.json()
                  alert('Import failed: ' + (err.error || res.statusText))
                  return
                }
                alert('Sales DB replaced successfully!')
                // Reload data
                Promise.all([
                  fetch('http://localhost:8000/api/employees'),
                  fetch('http://localhost:8000/api/sales/nb-cash-entries'),
                  fetch('http://localhost:8000/api/sales/eft-entries'),
                  fetch('http://localhost:8000/api/sales/all'),
                ])
                .then(async ([resEmp, resCash, resEft, resAll]) => {
                  if (![resEmp,resCash,resEft,resAll].every(r => r.ok)) {
                    throw new Error('API failed')
                  }
                  setEmployees(await resEmp.json())
                  setCashEntries(await resCash.json())
                  setEftEntries(await resEft.json())
                  setSalesAll(await resAll.json())
                  checkUndoAvailable()
                })
                .catch(console.error)
              } catch (err) {
                alert('Import failed: ' + err)
              }
            }}
          />
        </label>
        <button
          className={`px-3 py-1 rounded border ${undoAvailable ? 'bg-yellow-500 text-black border-yellow-700 hover:bg-yellow-400 cursor-pointer' : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'}`}
          disabled={!undoAvailable}
          onClick={async () => {
            if (!undoAvailable) return
            if (!window.confirm('Are you sure you want to undo the last DB replace?')) return
            try {
              const res = await fetch('http://localhost:8000/api/sales/undo-import', { method: 'POST' })
              if (!res.ok) {
                const err = await res.json()
                alert('Undo failed: ' + (err.error || res.statusText))
                return
              }
              alert('Undo successful!')
              // Reload data
              Promise.all([
                fetch('http://localhost:8000/api/employees'),
                fetch('http://localhost:8000/api/sales/nb-cash-entries'),
                fetch('http://localhost:8000/api/sales/eft-entries'),
                fetch('http://localhost:8000/api/sales/all'),
              ])
              .then(async ([resEmp, resCash, resEft, resAll]) => {
                if (![resEmp,resCash,resEft,resAll].every(r => r.ok)) {
                  throw new Error('API failed')
                }
                setEmployees(await resEmp.json())
                setCashEntries(await resCash.json())
                setEftEntries(await resEft.json())
                setSalesAll(await resAll.json())
                checkUndoAvailable()
              })
              .catch(console.error)
            } catch (err) {
              alert('Undo failed: ' + err)
            }
          }}
        >
          Undo Last Replace
        </button>
      </div>

      {/* Header */}
      <div className="bg-blue-500 flex justify-between items-center p-2 text-white text-lg font-bold border-2 border-black relative">
        <span>PRODUCTION RESULTS 1</span>
        <div className="flex items-center gap-2">
          {/* Red icon for other promo items */}
          {otherPromoItems.length > 0 && (
            <button
              className="relative group"
              title="Show unhandled Promo sales"
              onClick={() => setShowOtherPromoModal(true)}
              style={{ lineHeight: 0 }}
            >
              <span className="inline-block w-3 h-3 rounded-full bg-red-600 border-2 border-white mr-1 animate-pulse"></span>
              <span className="hidden group-hover:inline text-xs bg-white text-red-700 px-2 py-1 rounded shadow absolute right-0 top-6 z-50">Unhandled Promo Items</span>
            </button>
          )}
          <button onClick={()=>setSearchOpen(true)} className="p-1 hover:bg-blue-400 rounded">🔍</button>
        </div>
      </div>

      {/* Main table */}
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
            {rowsData.map((row,i)=>(
              <tr key={i} className={i%2?'bg-gray-100':''}>
                <td className="border-2 border-black p-1">{row.staff}</td>
                <td className="border-2 border-black p-1 text-right" colSpan={2}>{row.quota}</td>
                <td className="border-2 border-black p-1 text-right" colSpan={2}>{row.mtd}</td>
                <td className="border-2 border-black p-1 text-right" colSpan={2}>{row.projected}</td>
                {row.metrics.map((val,idx)=>(
                  <td
                    key={idx}
                    className="border-2 border-black p-1 text-center cursor-pointer hover:bg-gray-200"
                    onClick={()=>setSelected({ staff:row.staff, metricIndex:idx, type: idx%2===0?'today':'mtd' })}
                  >{val}</td>
                ))}
              </tr>
            ))}
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

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40" onClick={()=>setSelected(null)}>
          <div className="bg-white p-4 rounded shadow-lg max-h-[80vh] overflow-auto w-[95%] max-w-5xl relative" onClick={e=>e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-600 hover:text-black" onClick={()=>setSelected(null)}>❌</button>
            <h2 className="font-bold mb-2">
              {selected.type==='today'?'Today':'MTD'} {getMetricCategoryName(selected.metricIndex)} for {selected.staff}
            </h2>

            {/* Workout Detail (1st Workout) */}
            {(selected.metricIndex===10||selected.metricIndex===11) && (
              loadingDetails
                ? <div className="text-center p-4">Loading workout details...</div>
                : (
                  <table className="w-full text-sm mb-2 border-collapse">
                    <thead>
                      <tr>
                        <th className="border px-2 py-1">Employee</th>
                        <th className="border px-2 py-1">Member</th>
                        <th className="border px-2 py-1">Date</th>
                        <th className="border px-2 py-1">Reassign</th>
                        <th className="border px-2 py-1">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workoutDetails.length===0
                        ? <tr><td colSpan={5} className="border px-2 py-1 text-center text-gray-500">No workouts found</td></tr>
                        : workoutDetails.map((w: WorkoutDetail) => (
                            <tr key={w.workout_id}>
                              <td className="border px-2 py-1">{w.employee}</td>
                              <td className="border px-2 py-1">{w.member_name}</td>
                              <td className="border px-2 py-1">{w.event_date}</td>
                              <td className="border px-2 py-1">
                                <select
                                  className="w-full text-xs"
                                  value={workoutAssignMap[w.workout_id]||''}
                                  onChange={ev=>setWorkoutAssignMap(m=>({...m,[w.workout_id]:ev.target.value}))}
                                >
                                  <option value="">— none —</option>
                                  {staffList.filter(st => st !== 'Other').map(st=><option key={st} value={st}>{st}</option>)}
                                </select>
                              </td>
                              <td className="border px-2 py-1 text-center">
                                <button className="text-sm bg-blue-500 text-white px-2 py-1 rounded" onClick={()=>saveWorkoutAssignment(w.workout_id)}>Save</button>
                              </td>
                            </tr>
                          ))
                      }
                    </tbody>
                  </table>
                )
            )}

            {/* Reprogram Detail (30 Day and Other) */}
            {(selected.metricIndex===14||selected.metricIndex===15||selected.metricIndex===16||selected.metricIndex===17) && (
              loadingDetails
                ? <div className="text-center p-4">Loading reprogram details...</div>
                : (
                  <table className="w-full text-sm mb-2 border-collapse">
                    <thead>
                      <tr>
                        <th className="border px-2 py-1">Employee</th>
                        <th className="border px-2 py-1">Member</th>
                        <th className="border px-2 py-1">Date</th>
                        <th className="border px-2 py-1">Agreement #</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workoutDetails.length===0
                        ? <tr><td colSpan={4} className="border px-2 py-1 text-center text-gray-500">No reprograms found</td></tr>
                        : workoutDetails.map((r: any) => (
                            <tr key={r.reprogram_id || r.workout_id}>
                              <td className="border px-2 py-1">{r.employee}</td>
                              <td className="border px-2 py-1">{r.member_name}</td>
                              <td className="border px-2 py-1">{r.event_date}</td>
                              <td className="border px-2 py-1">{r.agreement_number || '-'}</td>
                            </tr>
                          ))
                      }
                    </tbody>
                  </table>
                )
            )}

            {/* EFT Detail */}
            {(selected.metricIndex===2||selected.metricIndex===3) && (
              loadingDetails
                ? <div className="text-center p-4">Loading EFT details...</div>
                : (
                  <table className="w-full text-sm mb-2 border-collapse">
                    <thead>
                      <tr>
                        <th className="border px-2 py-1">Member</th>
                        <th className="border px-2 py-1">Payment Plan</th>
                        <th className="border px-2 py-1">Matched Plan</th>
                        <th className="border px-2 py-1 text-right">EFT Amount (Monthly)</th>
                        <th className="border px-2 py-1 text-right">Sale Amount (One-Time)</th>
                        <th className="border px-2 py-1">Date</th>
                        <th className="border px-2 py-1">Current Assignment</th>
                        <th className="border px-2 py-1">Reassign</th>
                        <th className="border px-2 py-1">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dedupedDetailList.length===0
                        ? <tr><td colSpan={9} className="border px-2 py-1 text-center text-gray-500">No EFT details found</td></tr>
                        : dedupedDetailList.map((item, i)=>{
                          const keyBase = item.sale_id + '_' + ((item as any).profit_center || '') + '_' + ((item as any).main_item || '') + '_' + ((item as any).latest_payment_date || '')
                          const key = selected.staff === 'Other' ? keyBase + '_' + i : keyBase;
                          const agreement_payment_plan = 'agreement_payment_plan' in item ? item.agreement_payment_plan : ((item as any).main_item ? 'Upgrade' : '-')
                          const matched_membership = 'matched_membership' in item ? item.matched_membership : ((item as any).main_item || '-')
                          const eft_amount = 'eft_amount' in item ? item.eft_amount : ((item as any).price || 0)
                          // Find the sale amount from salesAll if available
                          const saleObj = salesAll.find(s => s.sale_id === item.sale_id);
                          const total_sale_amount = saleObj ? saleObj.total_amount : 0;
                          const payment_date = 'payment_date' in item ? item.payment_date : (item as any).latest_payment_date || '-'
                          return (
                            <tr key={key}>
                              <td className="border px-2 py-1">{item.member_name}</td>
                              <td className="border px-2 py-1 text-xs">{agreement_payment_plan}</td>
                              <td className="border px-2 py-1 text-xs">{matched_membership}</td>
                              <td className="border px-2 py-1 text-right">${eft_amount.toFixed(2)}</td>
                              <td className="border px-2 py-1 text-right">${total_sale_amount.toFixed(2)}</td>
                              <td className="border px-2 py-1">{payment_date}</td>
                              <td className="border px-2 py-1 text-xs italic">{item.commission_employees || '(none)'}</td>
                              <td className="border px-2 py-1">
                                <select
                                  className="w-full text-xs"
                                  value={eftAssignMap[item.sale_id]||''}
                                  onChange={ev=>setEftAssignMap(m=>({...m,[item.sale_id]:ev.target.value}))}
                                >
                                  <option value="">— none —</option>
                                  {staffList.filter(st => st !== 'Other').map(st=><option key={st} value={st}>{st}</option>)}
                                </select>
                              </td>
                              <td className="border px-2 py-1 text-center">
                                <button className="text-sm bg-blue-500 text-white px-2 py-1 rounded" onClick={()=>saveEftAssignment(item.sale_id)}>Save</button>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                )
            )}

            {/* Cash/PT Detail */}
            {![2,3,10,11,14,15,16,17].includes(selected.metricIndex) && (
              <table className="w-full text-sm mb-2 border-collapse">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Member</th>
                    <th className="border px-2 py-1">Type</th>
                    <th className="border px-2 py-1 text-right">
                      {selected.metricIndex<2||(selected.metricIndex>=4&&selected.metricIndex<6)
                        ? 'Amount'
                        : selected.metricIndex<4
                          ? 'EFT'
                          : 'Units'}
                    </th>
                    {selected.metricIndex===2||selected.metricIndex===3 ? (
                      <th className="border px-2 py-1 text-right">EFT Value</th>
                    ) : null}
                    <th className="border px-2 py-1">Current Assignment</th>
                    <th className="border px-2 py-1">Reassign</th>
                    <th className="border px-2 py-1">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dedupedDetailList.map((item, i)=>{
                    const idx = selected.metricIndex
                    const isCashOrPT = idx<2||(idx>=4&&idx<6)
                    const isEft = idx>=2&&idx<4
                    const id = (item as any).sale_id
                    const currentAssignment = (item as any).commission_employees || '(none)'
                    
                    // Determine if this is an upgrade entry
                    const isUpgrade = (item as any).profit_center === 'Promotion' && 
                                    (item as any).main_item && 
                                    isUpgradeItem((item as any).main_item)
                    
                    const entryType = isUpgrade ? `Upgrade: ${(item as any).main_item}` : 
                                    (item as any).profit_center || 'Cash'
                    
                    const keyBase = id + '_' + ((item as any).profit_center || '') + '_' + ((item as any).main_item || '') + '_' + ((item as any).latest_payment_date || '')
                    const key = selected.staff === 'Other' ? keyBase + '_' + i : keyBase;
                    return (
                      <tr key={key}>
                        <td className="border px-2 py-1">{(item as any).member_name}</td>
                        <td className="border px-2 py-1 text-xs">{entryType}</td>
                        <td className="border px-2 py-1 text-right">
                          {isCashOrPT
                            ? `${((item as any).total_amount as number).toFixed(2)}`
                            : isEft
                              ? `${((item as any).price||0).toFixed(2)}`
                              : `${(item as any).transaction_count||0}`
                          }
                        </td>
                        {isEft && isUpgrade ? (
                          <td className="border px-2 py-1 text-right text-green-600">
                            ${((item as any).total_amount).toFixed(2)}
                          </td>
                        ) : isEft ? (
                          <td className="border px-2 py-1 text-right">-</td>
                        ) : null}
                        <td className="border px-2 py-1 text-xs italic">{currentAssignment}</td>
                        <td className="border px-2 py-1">
                          <select
                            className="w-full text-xs"
                            value={pendingAssignMap[id] !== undefined ? pendingAssignMap[id] : assignMap[id] || ''}
                            onChange={ev=>setPendingAssignMap(m=>({...m,[id]:ev.target.value}))}
                          >
                            <option value="">— none —</option>
                            {/* Use PT assignment options for PT sales, regular staff for others */}
                            {PT_CENTERS.map(c => c.toLowerCase()).includes(((item as any).profit_center || '').toLowerCase()) ? (
                              // PT sales: show trainers and sales staff
                              ptAssignmentOptions.map(st=><option key={st} value={st}>{st}</option>)
                            ) : (
                              // Regular sales: show only sales staff
                              staffList.filter(st => st !== 'Other').map(st=><option key={st} value={st}>{st}</option>)
                            )}
                          </select>
                        </td>
                        <td className="border px-2 py-1 text-center">
                          <button className="text-sm bg-blue-500 text-white px-2 py-1 rounded" onClick={()=>saveAssignment(id)}>Save</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-start justify-center pt-20 z-50" onClick={()=>setSearchOpen(false)}>
          <div className="bg-white w-[90%] max-w-xl p-4 rounded shadow-lg" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center mb-4">
              <input
                type="text"
                placeholder="Search by member, salesperson, or agreement #"
                value={searchQuery}
                onChange={e=>setSearchQuery(e.target.value)}
                className="flex-grow border px-2 py-1 rounded"
              />
              <button className="ml-2 p-1 text-gray-600 hover:text-black" onClick={()=>setSearchOpen(false)}>❌</button>
            </div>
            <div className="max-h-80 overflow-auto">
              {filteredSales.length===0
                ? <div className="text-center text-gray-500">No matches</div>
                : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className="border px-2 py-1">Agreement #</th>
                        <th className="border px-2 py-1">Member</th>
                        <th className="border px-2 py-1">Salesperson</th>
                        <th className="border px-2 py-1">Assigned To</th>
                        <th className="border px-2 py-1 text-right">Amount</th>
                        <th className="border px-2 py-1">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSales.map(s=>(
                        <tr key={s.sale_id} className="hover:bg-gray-100">
                          <td className="border px-2 py-1">{s.agreement_number}</td>
                          <td className="border px-2 py-1">{s.member_name}</td>
                          <td className="border px-2 py-1">{s.sales_person}</td>
                          <td className="border px-2 py-1">
                            <select
                              className="w-full"
                              value={searchAssignMap[s.sale_id] || ''}
                              onChange={e => setSearchAssignMap(m => ({ ...m, [s.sale_id]: e.target.value }))}
                            >
                              <option value="">-- Select --</option>
                              {/* If current value is not in employees and not empty, show it as an option */}
                              {s.commission_employees &&
                                !employees.some(emp => emp.name === s.commission_employees) && (
                                  <option value={s.commission_employees}>{s.commission_employees}</option>
                                )}
                              {employees.map(emp => (
                                <option key={emp.name} value={emp.name}>{emp.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="border px-2 py-1 text-right">{s.total_amount.toFixed(2)}</td>
                          <td className="border px-2 py-1">
                            <button
                              className={`px-2 py-1 rounded ${searchAssignMap[s.sale_id] !== (s.commission_employees || '') ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                              disabled={searchAssignMap[s.sale_id] === (s.commission_employees || '')}
                              onClick={async () => {
                                const newOwner = searchAssignMap[s.sale_id] || '';
                                try {
                                  const res = await fetch(`http://localhost:8000/api/sales/${s.sale_id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ commission_employees: newOwner })
                                  });
                                  if (!res.ok) {
                                    const err = await res.json();
                                    alert('Assignment failed: ' + (err.error || res.statusText));
                                    return;
                                  }
                                  alert('Assignment updated!');
                                  // Update UI
                                  setSalesAll(sa => sa.map(row => row.sale_id === s.sale_id ? { ...row, commission_employees: newOwner } : row));
                                } catch (err) {
                                  alert('Assignment failed: ' + err);
                                }
                              }}
                            >
                              Save
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
          </div>
        </div>
      )}

      <button className="mt-2 mb-2 px-2 py-1 bg-gray-200 border rounded" onClick={()=>setShowEftDebug(v=>!v)}>
        {showEftDebug ? 'Hide' : 'Show'} EFT Debug
      </button>
      {showEftDebug && (
        <div className="bg-yellow-50 border border-yellow-300 p-2 mb-4 overflow-x-auto">
          <pre style={{fontSize:'11px',lineHeight:'1.3em'}}>
            {staffList.map(name => {
              let otherUpgradesToday = 0, otherUpgradesMTD = 0, staffUpgradesToday = 0, staffUpgradesMTD = 0;
              let eftToday = 0, eftMtd = 0;
              if (name === 'Other') {
                otherUpgradesToday = salesAll.filter(s =>
                  s.profit_center === 'Promotion' &&
                  s.main_item &&
                  isUpgradeItem(s.main_item) &&
                  (!assignMap[s.sale_id] || assignMap[s.sale_id] === '')
                  && s.latest_payment_date === today
                ).reduce((sum, s) => sum + s.total_amount, 0)
                otherUpgradesMTD = salesAll.filter(s =>
                  s.profit_center === 'Promotion' &&
                  s.main_item &&
                  isUpgradeItem(s.main_item) &&
                  (!assignMap[s.sale_id] || assignMap[s.sale_id] === '')
                ).reduce((sum, s) => sum + s.total_amount, 0)
                eftToday += otherUpgradesToday
                eftMtd += otherUpgradesMTD
              } else {
                staffUpgradesToday = salesAll.filter(s =>
                  s.profit_center === 'Promotion' &&
                  s.main_item &&
                  isUpgradeItem(s.main_item) &&
                  assignMap[s.sale_id] === name &&
                  s.latest_payment_date === today
                ).reduce((sum, s) => sum + s.total_amount, 0)
                staffUpgradesMTD = salesAll.filter(s =>
                  s.profit_center === 'Promotion' &&
                  s.main_item &&
                  isUpgradeItem(s.main_item) &&
                  assignMap[s.sale_id] === name
                ).reduce((sum, s) => sum + s.total_amount, 0)
                eftToday += staffUpgradesToday
                eftMtd += staffUpgradesMTD
              }
              return `${name}  \n  UpgradesToday: ${otherUpgradesToday || staffUpgradesToday}  UpgradesMTD: ${otherUpgradesMTD || staffUpgradesMTD}\n  eftToday: ${eftToday}  eftMtd: ${eftMtd}\n`;
            }).join('\n')}
          </pre>
        </div>
      )}
      
      <div className="text-xs text-gray-600 mt-2">
        * Event data based on yesterday ({today}) and cumulative (MTD) from events.db
      </div>

      {/* Other Promo Modal */}
      {showOtherPromoModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={()=>setShowOtherPromoModal(false)}>
          <div className="bg-white p-4 rounded shadow-lg max-h-[80vh] overflow-auto w-[95%] max-w-2xl relative" onClick={e=>e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-600 hover:text-black" onClick={()=>setShowOtherPromoModal(false)}>❌</button>
            <h2 className="font-bold mb-2 text-red-700">Unhandled Promo Items</h2>
            {otherPromoItems.length === 0 ? (
              <div className="text-center text-gray-500">No unhandled promo items found.</div>
            ) : (
              <table className="w-full text-xs border-collapse mb-2">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Agreement #</th>
                    <th className="border px-2 py-1">Member</th>
                    <th className="border px-2 py-1">Main Item</th>
                    <th className="border px-2 py-1">Amount</th>
                    <th className="border px-2 py-1">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {otherPromoItems.map((item, i) => (
                    <tr key={item.sale_id || i}>
                      <td className="border px-2 py-1">{item.agreement_number}</td>
                      <td className="border px-2 py-1">{item.member_name}</td>
                      <td className="border px-2 py-1">{item.main_item}</td>
                      <td className="border px-2 py-1 text-right">{item.total_amount?.toFixed(2)}</td>
                      <td className="border px-2 py-1">{item.latest_payment_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="text-xs text-gray-500">These are Promotion sales that are not upgrades, Guest Fee, or New Business.</div>
          </div>
        </div>
      )}
    </div>
  )
}