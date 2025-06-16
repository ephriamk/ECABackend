"use client"

import { useState, useEffect, useMemo } from "react"
import { normalizeName } from "./ProductionResults1"

type ClubTotalsTableProps = {
  promoData: {
    nb_yesterday: number | null
    nb_mtd: number | null
    promo_yesterday: number | null
    promo_mtd: number | null
  }
  formatCurrency: (value: number | null) => string
}

const PT_CENTERS = [
  'PT Postdate - New',
  'PT Postdate - Renew',
  'Personal Training - NEW',
  'Personal Training - RENEW',
]

// Helper: get day of week from yyyy-mm-dd (0=Sun, 1=Mon, ... 6=Sat)
function getDayOfWeek(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}
function isGM(dateStr: string) {
  const dow = getDayOfWeek(dateStr)
  return dow >= 1 && dow <= 4 // Mon-Thu
}
function isAGM(dateStr: string) {
  const dow = getDayOfWeek(dateStr)
  return dow === 0 || dow === 5 || dow === 6 // Fri-Sun
}

export default function ClubTotalsTable({ promoData, formatCurrency }: ClubTotalsTableProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sales, setSales] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [frontEndPTToday, setFrontEndPTToday] = useState<number | null>(null)
  const [frontEndPTMTD, setFrontEndPTMTD] = useState<number | null>(null)
  const [detailsPeriod, setDetailsPeriod] = useState<'today' | 'mtd'>('mtd')
  const [frontEndPTSalesToday, setFrontEndPTSalesToday] = useState<any[]>([])
  const [frontEndPTSalesMTD, setFrontEndPTSalesMTD] = useState<any[]>([])
  const [detailsCell, setDetailsCell] = useState<{ period: 'today' | 'mtd', gmOrAgm: 'gm' | 'agm' } | null>(null)
  const [nbPromoDetailsCell, setNbPromoDetailsCell] = useState<'gm' | 'agm' | null>(null)
  const [quotas, setQuotas] = useState<any>(null)
  const [loadingQuotas, setLoadingQuotas] = useState(true)
  const [memberships, setMemberships] = useState<any[]>([])
  const [eftEntries, setEftEntries] = useState<any[]>([])
  const [salesAll, setSalesAll] = useState<any[]>([])
  const [consolidationMap, setConsolidationMap] = useState<Record<string, string>>({})
  const [staffList, setStaffList] = useState<string[]>([])
  // Popup state for New EFT
  const [eftDetailsCell, setEftDetailsCell] = useState<{ period: 'today' | 'mtd', gmOrAgm: 'gm' | 'agm' } | null>(null);

  const combinedYesterday = (promoData.nb_yesterday ?? 0) + (promoData.promo_yesterday ?? 0)
  const combinedMTD = (promoData.nb_mtd ?? 0) + (promoData.promo_mtd ?? 0)
  const quota = 50000
  const percentQuota = quota > 0 ? `${Math.round((combinedMTD / quota) * 100)}%` : "--"

  // Helper: get membership price for upgrades
  const membershipPriceLookup = useMemo(() => {
    const lookup: Record<string, number> = {};
    memberships.forEach((m: any) => {
      if (m.membership_type) {
        lookup[m.membership_type.trim().toLowerCase()] = m.price;
      }
    });
    return lookup;
  }, [memberships]);

  const getUpgradeEftValue = (s: any) => {
    // Use the full total_amount for upgrades
    return s.total_amount || 0;
  };

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:8000/api/sales/all').then(res => res.json()),
      fetch('http://localhost:8000/api/employees').then(res => res.json()),
      fetch('http://localhost:8000/api/memberships').then(res => res.json()),
      fetch('http://localhost:8000/api/sales/eft-entries').then(res => res.json()),
    ]).then(([salesData, employeesData, membershipsData, eftData]) => {
      setSales(salesData)
      setSalesAll(salesData)
      setEmployees(employeesData)
      setMemberships(membershipsData)
      setEftEntries(eftData)
      // Compute staff list (official sales employees + Web + Other)
      const official = employeesData.map((e: any) => normalizeName(e.name)).filter((n: string) => n)
      setStaffList([...official, 'Web', 'Other'])
      // Build consolidation map
      const allNamesSet = new Set<string>()
      official.forEach((name: string) => allNamesSet.add(name))
      salesData.forEach((e: any) => {
        const owners = (e.commission_employees || '').split(',').map((n: string) => normalizeName(n)).filter(Boolean)
        owners.forEach((o: string) => allNamesSet.add(o))
      })
      const allNames = Array.from(allNamesSet)
      const consolidation: Record<string, string> = {}
      allNames.forEach((name: string) => {
        const exactMatch = official.find((o: string) => o.toLowerCase() === name.toLowerCase())
        if (exactMatch) {
          consolidation[name] = exactMatch
        }
      })
      setConsolidationMap(consolidation)
      // Compute sales team names (not trainers)
      const salesTeam = employeesData
        .filter((e: any) => !e.position || !e.position.toLowerCase().includes('trainer'))
        .map((e: any) => normalizeName(e.name))
      // Compute yesterday
      const getYesterday = () => {
        const now = new Date()
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        return [
          yesterday.getFullYear(),
          String(yesterday.getMonth() + 1).padStart(2, '0'),
          String(yesterday.getDate()).padStart(2, '0')
        ].join('-')
      }
      const yesterday = getYesterday()
      // Helper: is front end PT sale
      const isFrontEndPT = (sale: any) => {
        if (!PT_CENTERS.includes(sale.profit_center)) return false
        if (!sale.commission_employees || sale.commission_employees.trim() === '') return true
        // If any commission employee is a sales team member, count it
        const owners = sale.commission_employees.split(',').map((n: string) => normalizeName(n)).filter(Boolean)
        return owners.some((o: string) => salesTeam.includes(o))
      }
      // Today sales split
      const todaySales = salesData.filter((sale: any) => isFrontEndPT(sale) && sale.latest_payment_date === yesterday)
      setFrontEndPTSalesToday(todaySales)
      // MTD sales split
      const mtdSales = salesData.filter((sale: any) => isFrontEndPT(sale))
      setFrontEndPTSalesMTD(mtdSales)
      // Totals for each split
      setFrontEndPTToday(todaySales.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0))
      setFrontEndPTMTD(mtdSales.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0))
    })
    // Fetch quotas
    setLoadingQuotas(true)
    fetch('http://localhost:8000/api/kpi/pt-quotas')
      .then(res => res.json())
      .then(data => setQuotas(data))
      .catch(() => setQuotas(null))
      .finally(() => setLoadingQuotas(false))
  }, [])

  // --- EFT MTD and splits (ProductionResults1 logic) ---
  // GM = all days, AGM = Fri–Sun only
  const isEftUpgrade = (e: any) => {
    const sale = salesAll.find((s: any) => s.sale_id === e.sale_id)
    return sale && sale.profit_center === 'Promotion' && isUpgradeItem(sale.main_item)
  }
  // Regular EFTs (not upgrades)
  const regularEFTs = eftEntries.filter((e: any) => !isEftUpgrade(e))
  // Upgrades (Promotion + upgrade main_item)
  const upgradeEFTs = salesAll.filter((s: any) =>
    s.profit_center === 'Promotion' &&
    s.main_item &&
    isUpgradeItem(s.main_item)
  )
  // GM: all days
  const eftMTDGM = [
    ...regularEFTs,
    ...upgradeEFTs
  ].reduce((sum, e) => {
    if (e.price !== undefined) {
      return sum + (e.price || 0)
    } else {
      return sum + getUpgradeEftValue(e)
    }
  }, 0)
  // AGM: Fri–Sun only
  const eftMTDAGM = [
    ...regularEFTs.filter((e: any) => isAGM(e.latest_payment_date)),
    ...upgradeEFTs.filter((e: any) => isAGM(e.latest_payment_date))
  ].reduce((sum, e) => {
    if (e.price !== undefined) {
      return sum + (e.price || 0)
    } else {
      return sum + getUpgradeEftValue(e)
    }
  }, 0)

  useEffect(() => {
    console.log('eftEntries:', eftEntries);
    console.log('upgradeEFTs:', upgradeEFTs);
    eftEntries.forEach(e => {
      console.log('EFT:', e.latest_payment_date, 'isAGM:', isAGM(e.latest_payment_date), 'getDayOfWeek:', getDayOfWeek(e.latest_payment_date));
    });
    upgradeEFTs.forEach(e => {
      console.log('Upgrade EFT:', e.latest_payment_date, 'isAGM:', isAGM(e.latest_payment_date), 'getDayOfWeek:', getDayOfWeek(e.latest_payment_date));
    });
    console.log('getEftDetails(mtd, agm):', getEftDetails('mtd', 'agm'));
  }, [eftEntries, upgradeEFTs]);

  // Split helpers
  const yesterday = (() => {
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return [
      yesterday.getFullYear(),
      String(yesterday.getMonth() + 1).padStart(2, '0'),
      String(yesterday.getDate()).padStart(2, '0')
    ].join('-')
  })()
  const frontEndPTTodayGM = frontEndPTSalesToday.filter(sale => isGM(sale.latest_payment_date)).reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
  const frontEndPTTodayAGM = frontEndPTSalesToday.filter(sale => isAGM(sale.latest_payment_date)).reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
  const frontEndPTMTDGM = frontEndPTSalesMTD.filter(sale => isGM(sale.latest_payment_date)).reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
  const frontEndPTMTDAGM = frontEndPTSalesMTD.filter(sale => isAGM(sale.latest_payment_date)).reduce((sum, sale) => sum + (sale.total_amount || 0), 0)

  // --- Projected logic for GM/AGM ---
  // Helper: get all dates in current month
  function getAllMonthDates() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const dates: string[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      dates.push([
        year,
        String(month + 1).padStart(2, '0'),
        String(d).padStart(2, '0')
      ].join('-'))
    }
    return dates
  }
  // Count relevant days elapsed and total for GM/AGM
  const now = new Date()
  const todayNum = now.getDate()
  const allMonthDates = getAllMonthDates()
  const gmDates = allMonthDates.filter(d => isGM(d))
  const agmDates = allMonthDates.filter(d => isAGM(d))
  const gmDaysElapsed = gmDates.filter(d => Number(d.split('-')[2]) <= todayNum).length
  const agmDaysElapsed = agmDates.filter(d => Number(d.split('-')[2]) <= todayNum).length
  const gmDaysTotal = gmDates.length
  const agmDaysTotal = agmDates.length
  // Use quotas from API or fallback
  const nbPromoQuotaGM = quotas?.nbpromo_quota_gm ?? 50000
  const nbPromoQuotaAGM = quotas?.nbpromo_quota_agm ?? 20000
  const feptQuotaGM = quotas?.fept_quota_gm ?? 15000
  const feptQuotaAGM = quotas?.fept_quota_agm ?? 5347
  // Projected values
  const frontEndPTProjGM = (gmDaysElapsed > 0 && gmDaysTotal > 0) ? (frontEndPTMTDGM / gmDaysElapsed) * gmDaysTotal : 0
  const frontEndPTProjAGM = (agmDaysElapsed > 0 && agmDaysTotal > 0) ? (frontEndPTMTDAGM / agmDaysElapsed) * agmDaysTotal : 0
  const frontEndPTProjGMPercent = feptQuotaGM > 0 ? `${Math.round((frontEndPTProjGM / feptQuotaGM) * 100)}%` : '-'
  const frontEndPTProjAGMPercent = feptQuotaAGM > 0 ? `${Math.round((frontEndPTProjAGM / feptQuotaAGM) * 100)}%` : '-'

  // --- Projected logic for NB/Promo ---
  const nbPromoQuota = quota
  // Use all days in month for NB/Promo
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysElapsed = now.getDate()
  const nbPromoProj = daysElapsed > 0 ? (combinedMTD / daysElapsed) * daysInMonth : 0
  const nbPromoProjPercent = nbPromoQuota > 0 ? `${Math.round((nbPromoProj / nbPromoQuota) * 100)}%` : '-'

  // --- NB/Promo MTD split for GM/AGM ---
  // Assume promoData.nb_mtd and promoData.promo_mtd are arrays of sales or, if not, we need to filter sales by profit_center and date
  // We'll use the sales state (all sales) to filter NB/Promo by date
  const isNBPromo = (sale: any) => {
    // You may want to refine this if you have more precise NB/Promo profit_center values
    return sale.profit_center === 'New Business' || sale.profit_center === 'Promotion'
  }
  const nbPromoSalesMTD = sales.filter(isNBPromo)
  const nbPromoMTDGM = nbPromoSalesMTD.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) // all days
  const nbPromoMTDAGM = nbPromoSalesMTD.filter(sale => isAGM(sale.latest_payment_date)).reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
  const nbPromoSalesGM = nbPromoSalesMTD.filter(sale => isGM(sale.latest_payment_date))
  const nbPromoSalesAGM = nbPromoSalesMTD.filter(sale => isAGM(sale.latest_payment_date))

  // --- Projected logic for NB/Promo GM/AGM (updated formula) ---
  const gmDaysElapsedAll = allMonthDates.filter(d => Number(d.split('-')[2]) <= todayNum).length // all days elapsed
  const gmDaysTotalAll = allMonthDates.length // all days in month
  const nbPromoProjGM = (gmDaysElapsedAll > 0 && gmDaysTotalAll > 0) ? (nbPromoMTDGM / gmDaysElapsedAll) * gmDaysTotalAll : 0
  const nbPromoProjAGM = (agmDaysElapsed > 0 && agmDaysTotal > 0) ? (nbPromoMTDAGM / agmDaysElapsed) * agmDaysTotal : 0
  const nbPromoProjGMPercent = nbPromoQuotaGM > 0 ? `${Math.round((nbPromoProjGM / nbPromoQuotaGM) * 100)}%` : '-'
  const nbPromoProjAGMPercent = nbPromoQuotaAGM > 0 ? `${Math.round((nbPromoProjAGM / nbPromoQuotaAGM) * 100)}%` : '-'

  // Helper: is upgrade
  function isUpgradeItem(main_item: string | undefined): boolean {
    if (!main_item) return false;
    const main = main_item.trim().toLowerCase();
    if (main.startsWith('upg')) return true;
    const UPGRADE_ITEMS = [
      'UPG to AMT+', 'CT UPGRADE', 'UPG CTG', 'Upg to AMT', 'CT - Upgrade',
    ];
    return UPGRADE_ITEMS.some(item => main === item.toLowerCase());
  }

  // Assignment logic (like ProductionResults1)
  // Build assignMap: sale_id -> owner (staff, Web, Other)
  const assignMap: Record<number, string> = {}
  salesAll.forEach((e: any) => {
    const owners = (e.commission_employees || '').split(',').map((n: string) => normalizeName(n)).filter(Boolean)
    const mapped = owners.map((n: string) => consolidationMap[n] || n).filter((n: string) => staffList.includes(n))
    if (mapped.length > 0) {
      assignMap[e.sale_id] = mapped[0]
    } else if (
      e.profit_center === 'New Business' &&
      (!e.commission_employees || e.commission_employees.trim() === '')
    ) {
      assignMap[e.sale_id] = 'Web'
    } else {
      assignMap[e.sale_id] = ''
    }
  })

  // --- New EFT projection and percent quota ---
  const eftProjGM = (gmDaysElapsed > 0 && gmDaysTotal > 0) ? (eftMTDGM / gmDaysElapsed) * gmDaysTotal : 0;
  const eftProjAGM = (agmDaysElapsed > 0 && agmDaysTotal > 0) ? (eftMTDAGM / agmDaysElapsed) * agmDaysTotal : 0;
  const eftProjGMPercent = quotas?.neweft_quota_gm > 0 ? `${Math.round((eftProjGM / quotas.neweft_quota_gm) * 100)}%` : '-';
  const eftProjAGMPercent = quotas?.neweft_quota_agm > 0 ? `${Math.round((eftProjAGM / quotas.neweft_quota_agm) * 100)}%` : '-';

  // --- Total SP calculations ---
  // NB/Promo Today GM/AGM
  const nbPromoTodayGM = nbPromoSalesGM.filter(sale => sale.latest_payment_date === yesterday).reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
  const nbPromoTodayAGM = nbPromoSalesAGM.filter(sale => sale.latest_payment_date === yesterday).reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
  // New EFT Today GM/AGM
  const eftTodayGM = [
    ...regularEFTs.filter(e => isGM(e.latest_payment_date) && e.latest_payment_date === yesterday),
    ...upgradeEFTs.filter(e => isGM(e.latest_payment_date) && e.latest_payment_date === yesterday)
  ].reduce((sum, e) => {
    if (e.price !== undefined) {
      return sum + (e.price || 0)
    } else {
      return sum + getUpgradeEftValue(e)
    }
  }, 0);
  const eftTodayAGM = [
    ...regularEFTs.filter(e => isAGM(e.latest_payment_date) && e.latest_payment_date === yesterday),
    ...upgradeEFTs.filter(e => isAGM(e.latest_payment_date) && e.latest_payment_date === yesterday)
  ].reduce((sum, e) => {
    if (e.price !== undefined) {
      return sum + (e.price || 0)
    } else {
      return sum + getUpgradeEftValue(e)
    }
  }, 0);
  // Front End PT Today GM/AGM
  // (already calculated as frontEndPTTodayGM, frontEndPTTodayAGM)
  // Total SP Today GM/AGM
  const totalSPTodayGM = nbPromoTodayGM + (eftTodayGM * 10) + frontEndPTTodayGM;
  const totalSPTodayAGM = nbPromoTodayAGM + (eftTodayAGM * 10) + frontEndPTTodayAGM;
  // Total SP MTD GM/AGM
  const totalSPMTDGM = nbPromoMTDGM + (eftMTDGM * 10) + frontEndPTMTDGM;
  const totalSPMTDAGM = nbPromoMTDAGM + (eftMTDAGM * 10) + frontEndPTMTDAGM;
  // Total SP Quota GM/AGM
  const totalSPQuotaGM = (nbPromoQuotaGM ?? 0) + ((quotas?.neweft_quota_gm ?? 0) * 10) + (feptQuotaGM ?? 0);
  const totalSPQuotaAGM = (nbPromoQuotaAGM ?? 0) + ((quotas?.neweft_quota_agm ?? 0) * 10) + (feptQuotaAGM ?? 0);
  // Total SP Proj GM/AGM
  const totalSPProjGM = nbPromoProjGM + (eftProjGM * 10) + frontEndPTProjGM;
  const totalSPProjAGM = nbPromoProjAGM + (eftProjAGM * 10) + frontEndPTProjAGM;
  // Total SP % Quota GM/AGM
  const totalSPPercentGM = totalSPQuotaGM > 0 ? `${Math.round((totalSPProjGM / totalSPQuotaGM) * 100)}%` : '-';
  const totalSPPercentAGM = totalSPQuotaAGM > 0 ? `${Math.round((totalSPProjAGM / totalSPQuotaAGM) * 100)}%` : '-';

  // Helper to get EFT details for popup
  function getEftDetails(period: 'today' | 'mtd', gmOrAgm: 'gm' | 'agm') {
    // Filter regular and upgrade EFTs by GM/AGM and period
    const isSplit = gmOrAgm === 'gm' ? isGM : isAGM;
    const dateFilter = period === 'today' ? yesterday : undefined;
    // Regular EFTs
    const regular = regularEFTs.filter(e => isSplit(e.latest_payment_date) && (!dateFilter || e.latest_payment_date === dateFilter));
    // Upgrades
    const upgrades = upgradeEFTs.filter(e => isSplit(e.latest_payment_date) && (!dateFilter || e.latest_payment_date === dateFilter));
    // Map to detail objects
    return [
      ...regular.map(e => ({
        type: 'Regular',
        member_name: e.member_name,
        date: e.latest_payment_date,
        amount: e.price || 0,
        assignment: e.commission_employees || '',
        sale_id: e.sale_id,
        main_item: '-',
      })),
      ...upgrades.map(e => ({
        type: 'Upgrade',
        member_name: e.member_name,
        date: e.latest_payment_date,
        amount: getUpgradeEftValue(e),
        assignment: e.commission_employees || '',
        sale_id: e.sale_id,
        main_item: e.main_item || '-',
      })),
    ];
  }

  const handleProcessSales = async () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/tools/process-sales`
    try {
      setLoading(true)
      const res = await fetch(url, { method: "POST" })
      const data = await res.json()

      if (data.success) {
        alert("✅ Sales data processed successfully.")
      } else {
        alert(`❌ Failed to process sales: ${data.error || "Unknown error"}`)
      }
    } catch (err) {
      console.error("❌ Error:", err)
      alert("❌ Failed to process sales data.")
    } finally {
      setLoading(false)
    }
  }

  if (loading || loadingQuotas || !quotas) {
    return <div className="p-4 text-center">Loading Club Totals...</div>
  }

  return (
    <div id="club-totals-table" className="mb-4 border border-gray-300">
      {/* GM/AGM Projected Percent Summary */}
      <div className="mb-2 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
        <div id="gm-section">
          <div className="table-responsive">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td
                    className="border border-gray-300 p-1 font-bold"
                    style={{ width: "75%", backgroundColor: "#00b050" }}
                  >
                    GM - Dakota
                  </td>
                  <td className="border border-gray-300 p-1 text-center font-bold" style={{ width: "25%" }}>
                    {frontEndPTProjGMPercent}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div id="agm-section">
          <div className="table-responsive">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td
                    className="border border-gray-300 p-1 font-bold"
                    style={{ width: "75%", backgroundColor: "#00b050" }}
                  >
                    AGM - Xavier
                  </td>
                  <td className="border border-gray-300 p-1 text-center font-bold" style={{ width: "25%" }}>
                    {frontEndPTProjAGMPercent}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="table-responsive">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th
                className="border border-gray-300 p-1 text-left"
                style={{ backgroundColor: "#00b050" }}
                rowSpan={2}
              >
                Club Totals
                <button
                  onClick={handleProcessSales}
                  disabled={loading}
                  className={`ml-2 text-xs px-2 py-1 rounded ${
                    loading
                      ? "bg-gray-400 text-white cursor-wait"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                  title="Process Sales CSV"
                >
                  {loading ? "..." : "🔄"}
                </button>
              </th>
              <th
                className="border border-gray-300 p-1 text-center"
                style={{ backgroundColor: "#00b050" }}
                rowSpan={2}
              >
                Today
              </th>
              <th
                className="border border-gray-300 p-1 text-center"
                style={{ backgroundColor: "#00b050" }}
                colSpan={4}
              >
                GM
              </th>
              <th
                className="border border-gray-300 p-1 text-center"
                style={{ backgroundColor: "#00b050" }}
                colSpan={4}
              >
                AGM - Xavier
              </th>
            </tr>
            <tr>
              {["MTD", "Quota", "Proj", "% Quota", "MTD", "Quota", "Proj", "% Quota"].map((label, index) => (
                <th
                  key={`${label}-${index}`}
                  className="border border-gray-300 p-1 text-center"
                  style={{ backgroundColor: "#00b050" }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-green-100">
              <td className="border border-gray-300 p-1 font-medium">NB / Promo</td>
              <td
                className="border border-gray-300 p-1 text-center cursor-pointer hover:bg-green-200"
                onClick={() => setShowDetails(!showDetails)}
                title="Click to view breakdown"
              >
                {formatCurrency(combinedYesterday)}
                {showDetails && (
                  <div className="mt-1 text-xs text-left bg-white shadow-md p-2 rounded border border-green-300 z-10 relative">
                    <p>
                      <strong className="text-green-800">NB:</strong> {formatCurrency(promoData.nb_yesterday)}
                    </p>
                    <p>
                      <strong className="text-green-800">Promo:</strong> {formatCurrency(promoData.promo_yesterday)}
                    </p>
                  </div>
                )}
              </td>
              {/* GM MTD */}
              <td
                className="border border-gray-300 p-1 text-center cursor-pointer hover:bg-green-200"
                onClick={() => setNbPromoDetailsCell('gm')}
                title="Click to view all GM NB/Promo sales"
              >
                {formatCurrency(nbPromoMTDGM)}
              </td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">{formatCurrency(nbPromoQuotaGM)}</td>
              <td className="border border-gray-300 p-1 text-center">{formatCurrency(nbPromoProjGM)}</td>
              <td className="border border-gray-300 p-1 text-center">{nbPromoProjGMPercent}</td>
              {/* AGM MTD */}
              <td
                className="border border-gray-300 p-1 text-center cursor-pointer hover:bg-green-200"
                onClick={() => setNbPromoDetailsCell('agm')}
                title="Click to view all AGM NB/Promo sales"
              >
                {formatCurrency(nbPromoMTDAGM)}
              </td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">{formatCurrency(nbPromoQuotaAGM)}</td>
              <td className="border border-gray-300 p-1 text-center">{formatCurrency(nbPromoProjAGM)}</td>
              <td className="border border-gray-300 p-1 text-center">{nbPromoProjAGMPercent}</td>
            </tr>

            <tr>
              <td className="border border-gray-300 p-1">New EFT</td>
              <td className="border border-gray-300 p-1 text-center cursor-pointer hover:bg-green-200" onClick={() => setEftDetailsCell({ period: 'today', gmOrAgm: 'gm' })}>-</td>
              <td className="border border-gray-300 p-1 text-center cursor-pointer hover:bg-green-200" onClick={() => setEftDetailsCell({ period: 'mtd', gmOrAgm: 'gm' })}>{formatCurrency(eftMTDGM)}</td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">{quotas?.neweft_quota_gm !== undefined ? formatCurrency(quotas.neweft_quota_gm) : '-'}</td>
              <td className="border border-gray-300 p-1 text-center">{formatCurrency(eftProjGM)}</td>
              <td className="border border-gray-300 p-1 text-center">{eftProjGMPercent}</td>
              <td className="border border-gray-300 p-1 text-center cursor-pointer hover:bg-green-200" onClick={() => setEftDetailsCell({ period: 'mtd', gmOrAgm: 'agm' })}>{formatCurrency(eftMTDAGM)}</td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">{quotas?.neweft_quota_agm !== undefined ? formatCurrency(quotas.neweft_quota_agm) : '-'}</td>
              <td className="border border-gray-300 p-1 text-center">{formatCurrency(eftProjAGM)}</td>
              <td className="border border-gray-300 p-1 text-center">{eftProjAGMPercent}</td>
            </tr>

            <tr>
              <td className="border border-gray-300 p-1">Front End PT</td>
              {/* Yesterday cell (not split) */}
              <td
                className="border border-gray-300 p-1 text-center cursor-pointer hover:bg-green-200"
                onClick={() => setDetailsCell({ period: 'today', gmOrAgm: 'gm' })}
                title="Click to view all sales"
              >
                {formatCurrency(frontEndPTTodayGM + frontEndPTTodayAGM)}
              </td>
              {/* GM MTD */}
              <td
                className="border border-gray-300 p-1 text-center cursor-pointer hover:bg-green-200"
                onClick={() => setDetailsCell({ period: 'mtd', gmOrAgm: 'gm' })}
                title="Click to view all GM sales"
              >
                {formatCurrency(frontEndPTMTDGM)}
              </td>
              {/* GM Quota */}
              <td className="border border-gray-300 p-1 text-center bg-gray-300">{formatCurrency(feptQuotaGM)}</td>
              {/* GM Proj */}
              <td className="border border-gray-300 p-1 text-center">{formatCurrency(frontEndPTProjGM)}</td>
              {/* GM % Quota */}
              <td className="border border-gray-300 p-1 text-center">{frontEndPTProjGMPercent}</td>
              {/* AGM MTD */}
              <td
                className="border border-gray-300 p-1 text-center cursor-pointer hover:bg-green-200"
                onClick={() => setDetailsCell({ period: 'mtd', gmOrAgm: 'agm' })}
                title="Click to view all AGM sales"
              >
                {formatCurrency(frontEndPTMTDAGM)}
              </td>
              {/* AGM Quota */}
              <td className="border border-gray-300 p-1 text-center bg-gray-300">{formatCurrency(feptQuotaAGM)}</td>
              {/* AGM Proj */}
              <td className="border border-gray-300 p-1 text-center">{formatCurrency(frontEndPTProjAGM)}</td>
              {/* AGM % Quota */}
              <td className="border border-gray-300 p-1 text-center">{frontEndPTProjAGMPercent}</td>
            </tr>

            <tr style={{ borderTop: '3px double #333', fontWeight: 'bold', background: '#f9fafb' }}>
              <td className="border border-gray-300 p-1">Total SP</td>
              <td className="border border-gray-300 p-1 text-center">{formatCurrency(totalSPTodayGM)}</td>
              <td className="border border-gray-300 p-1 text-center">{formatCurrency(totalSPMTDGM)}</td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">{formatCurrency(totalSPQuotaGM)}</td>
              <td className="border border-gray-300 p-1 text-center">{formatCurrency(totalSPProjGM)}</td>
              <td className="border border-gray-300 p-1 text-center">{totalSPPercentGM}</td>
              <td className="border border-gray-300 p-1 text-center">{formatCurrency(totalSPMTDAGM)}</td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">{formatCurrency(totalSPQuotaAGM)}</td>
              <td className="border border-gray-300 p-1 text-center">{formatCurrency(totalSPProjAGM)}</td>
              <td className="border border-gray-300 p-1 text-center">{totalSPPercentAGM}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* Front End PT Popup Card */}
      {detailsCell && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setDetailsCell(null)}>
          <div className="bg-white p-4 rounded shadow-lg max-h-[80vh] overflow-auto w-[95%] max-w-2xl relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-600 hover:text-black" onClick={() => setDetailsCell(null)}>
              ❌
            </button>
            <h2 className="font-bold mb-2">
              Front End PT Sales ({detailsCell.period === 'today' ? 'Today' : 'MTD'} - {detailsCell.gmOrAgm === 'gm' ? 'GM' : 'AGM'})
            </h2>
            <table className="w-full text-sm mb-2 border-collapse">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Sale ID</th>
                  <th className="border px-2 py-1">Member Name</th>
                  <th className="border px-2 py-1">Date</th>
                  <th className="border px-2 py-1 text-right">Amount</th>
                  <th className="border px-2 py-1">Commission Employee(s)</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let salesList: any[] = []
                  if (detailsCell.period === 'today') {
                    salesList = (detailsCell.gmOrAgm === 'gm')
                      ? frontEndPTSalesToday.filter(sale => isGM(sale.latest_payment_date))
                      : frontEndPTSalesToday.filter(sale => isAGM(sale.latest_payment_date))
                  } else {
                    salesList = (detailsCell.gmOrAgm === 'gm')
                      ? frontEndPTSalesMTD.filter(sale => isGM(sale.latest_payment_date))
                      : frontEndPTSalesMTD.filter(sale => isAGM(sale.latest_payment_date))
                  }
                  if (salesList.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="border px-2 py-1 text-center text-gray-500">
                          No sales found
                        </td>
                      </tr>
                    )
                  }
                  return salesList.map((sale: any) => (
                    <tr key={sale.sale_id}>
                      <td className="border px-2 py-1">{sale.sale_id}</td>
                      <td className="border px-2 py-1">{sale.member_name}</td>
                      <td className="border px-2 py-1">{sale.latest_payment_date}</td>
                      <td className="border px-2 py-1 text-right">{formatCurrency(sale.total_amount)}</td>
                      <td className="border px-2 py-1">{sale.commission_employees || '-'}</td>
                    </tr>
                  ))
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* NB/Promo Popup Card */}
      {nbPromoDetailsCell && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setNbPromoDetailsCell(null)}>
          <div className="bg-white p-4 rounded shadow-lg max-h-[80vh] overflow-auto w-[95%] max-w-2xl relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-600 hover:text-black" onClick={() => setNbPromoDetailsCell(null)}>
              ❌
            </button>
            <h2 className="font-bold mb-2">
              NB / Promo Sales ({nbPromoDetailsCell === 'gm' ? 'GM' : 'AGM'})
            </h2>
            <table className="w-full text-sm mb-2 border-collapse">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Sale ID</th>
                  <th className="border px-2 py-1">Member Name</th>
                  <th className="border px-2 py-1">Date</th>
                  <th className="border px-2 py-1 text-right">Amount</th>
                  <th className="border px-2 py-1">Sales Person</th>
                </tr>
              </thead>
              <tbody>
                {(nbPromoDetailsCell === 'gm' ? nbPromoSalesGM : nbPromoSalesAGM).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="border px-2 py-1 text-center text-gray-500">
                      No sales found
                    </td>
                  </tr>
                ) : (
                  (nbPromoDetailsCell === 'gm' ? nbPromoSalesGM : nbPromoSalesAGM)
                    .slice()
                    .sort((a, b) => b.latest_payment_date.localeCompare(a.latest_payment_date))
                    .map((sale: any) => (
                      <tr key={sale.sale_id}>
                        <td className="border px-2 py-1">{sale.sale_id}</td>
                        <td className="border px-2 py-1">{sale.member_name}</td>
                        <td className="border px-2 py-1">{sale.latest_payment_date}</td>
                        <td className="border px-2 py-1 text-right">{formatCurrency(sale.total_amount)}</td>
                        <td className="border px-2 py-1">{sale.sales_person || '-'}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* New EFT Popup Card */}
      {eftDetailsCell && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEftDetailsCell(null)}>
          <div className="bg-white p-4 rounded shadow-lg max-h-[80vh] overflow-auto w-[95%] max-w-2xl relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-600 hover:text-black" onClick={() => setEftDetailsCell(null)}>
              ❌
            </button>
            <h2 className="font-bold mb-2">
              New EFT Details ({eftDetailsCell.period === 'today' ? 'Today' : 'MTD'} - {eftDetailsCell.gmOrAgm === 'gm' ? 'GM' : 'AGM'})
            </h2>
            <table className="w-full text-sm mb-2 border-collapse">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Type</th>
                  <th className="border px-2 py-1">Member Name</th>
                  <th className="border px-2 py-1">Date</th>
                  <th className="border px-2 py-1 text-right">Amount</th>
                  <th className="border px-2 py-1">Assignment</th>
                  <th className="border px-2 py-1">Main Item</th>
                </tr>
              </thead>
              <tbody>
                {getEftDetails(eftDetailsCell.period, eftDetailsCell.gmOrAgm).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="border px-2 py-1 text-center text-gray-500">
                      No EFT sales found
                    </td>
                  </tr>
                ) : (
                  getEftDetails(eftDetailsCell.period, eftDetailsCell.gmOrAgm)
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((e, i) => (
                      <tr key={e.sale_id + '_' + e.type + '_' + e.date + '_' + i}>
                        <td className="border px-2 py-1">{e.type}</td>
                        <td className="border px-2 py-1">{e.member_name}</td>
                        <td className="border px-2 py-1">{e.date}</td>
                        <td className="border px-2 py-1 text-right">{formatCurrency(e.amount)}</td>
                        <td className="border px-2 py-1">{e.assignment}</td>
                        <td className="border px-2 py-1">{e.main_item || '-'}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
