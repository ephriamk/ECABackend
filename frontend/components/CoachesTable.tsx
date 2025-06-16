import React, { useEffect, useState } from 'react'

interface CoachesTableData {
  new_pt_today: number
  new_pt_mtd: number
  renew_pt_today: number
  renew_pt_mtd: number
  total_pt_today: number
  total_pt_mtd: number
}

interface SaleDetail {
  sale_id: number
  member_name: string
  total_amount: number
  latest_payment_date: string
  profit_center: string
  commission_employees?: string
}

type PopupType = {
  type: 'new' | 'renew' | 'total'
  period: 'today' | 'mtd'
  fdwfd: 'fd' | 'wfd'
}

function getDayOfWeek(dateStr: string) {
  // Returns 0 (Mon) to 6 (Sun)
  const d = new Date(dateStr)
  // JS: 0=Sun, 1=Mon...6=Sat; shift so 0=Mon
  return (d.getDay() + 6) % 7
}

function filterSalesByFDWFD(sales: SaleDetail[], fdwfd: 'fd' | 'wfd') {
  // FD: Mon-Thu (0-3), WFD: Fri-Sun (4-6)
  return sales.filter(sale => {
    if (!sale.latest_payment_date) return false
    const dow = getDayOfWeek(sale.latest_payment_date)
    return fdwfd === 'fd' ? dow >= 0 && dow <= 3 : dow >= 4 && dow <= 6
  })
}

function getYesterdayDate() {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  return [
    yesterday.getFullYear(),
    String(yesterday.getMonth() + 1).padStart(2, '0'),
    String(yesterday.getDate()).padStart(2, '0')
  ].join('-')
}

export default function CoachesTable() {
  const [allSales, setAllSales] = useState<SaleDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [popup, setPopup] = useState<PopupType | null>(null)
  const [popupSales, setPopupSales] = useState<SaleDetail[]>([])
  const [loadingPopup, setLoadingPopup] = useState(false)
  const [quotas, setQuotas] = useState<{ pt_quota_new_fd: number, pt_quota_renew_fd: number, pt_quota_new_wfd: number, pt_quota_renew_wfd: number } | null>(null)
  const [loadingQuotas, setLoadingQuotas] = useState(true)

  useEffect(() => {
    setLoading(true)
    // Get all sales for both new and renew, MTD
    Promise.all([
      fetch('http://localhost:8000/api/coachees-table/sales?type=new&period=mtd').then(res => res.json()),
      fetch('http://localhost:8000/api/coachees-table/sales?type=renew&period=mtd').then(res => res.json())
    ])
      .then(([newSales, renewSales]) => setAllSales([...newSales, ...renewSales]))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setLoadingQuotas(true)
    fetch('http://localhost:8000/api/kpi/pt-quotas')
      .then(res => res.json())
      .then(data => setQuotas(data))
      .catch(err => setError('Failed to load quotas'))
      .finally(() => setLoadingQuotas(false))
  }, [])

  // Helper to get sales for a table (fd or wfd)
  const getSalesFor = (fdwfd: 'fd' | 'wfd') => filterSalesByFDWFD(allSales, fdwfd)

  // Helper to calculate metrics for a table
  const getMetrics = (sales: SaleDetail[], fdwfd: 'fd' | 'wfd') => {
    let newPTQuota = 0, renewPTQuota = 0
    if (quotas) {
      if (fdwfd === 'fd') {
        newPTQuota = quotas.pt_quota_new_fd ?? 0
        renewPTQuota = quotas.pt_quota_renew_fd ?? 0
      } else {
        newPTQuota = quotas.pt_quota_new_wfd ?? 0
        renewPTQuota = quotas.pt_quota_renew_wfd ?? 0
      }
    }
    const totalPTQuota = newPTQuota + renewPTQuota
    const yesterday = getYesterdayDate()
    // Filter by type and period
    const newPTSalesToday = sales.filter(s => (s.profit_center === 'Personal Training - NEW' || s.profit_center === 'PT Postdate - New') && s.latest_payment_date === yesterday)
    const newPTSalesMTD = sales.filter(s => s.profit_center === 'Personal Training - NEW' || s.profit_center === 'PT Postdate - New')
    const renewPTSalesToday = sales.filter(s => (s.profit_center === 'Personal Training - RENEW' || s.profit_center === 'PT Postdate - Renew') && s.latest_payment_date === yesterday)
    const renewPTSalesMTD = sales.filter(s => s.profit_center === 'Personal Training - RENEW' || s.profit_center === 'PT Postdate - Renew')
    // Sums
    const new_pt_today = newPTSalesToday.reduce((sum, s) => sum + (s.total_amount || 0), 0)
    const new_pt_mtd = newPTSalesMTD.reduce((sum, s) => sum + (s.total_amount || 0), 0)
    const renew_pt_today = renewPTSalesToday.reduce((sum, s) => sum + (s.total_amount || 0), 0)
    const renew_pt_mtd = renewPTSalesMTD.reduce((sum, s) => sum + (s.total_amount || 0), 0)
    const total_pt_today = new_pt_today + renew_pt_today
    const total_pt_mtd = new_pt_mtd + renew_pt_mtd
    // Days calculations
    const now = new Date()
    const daysElapsed = now.getDate() // 1-based, so today is included
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    // Projected values
    const project = (mtd: number) => daysElapsed > 0 ? (mtd / daysElapsed) * daysInMonth : 0
    const newPTProj = project(new_pt_mtd)
    const renewPTProj = project(renew_pt_mtd)
    const totalPTProj = project(total_pt_mtd)
    // Projected percentages
    const percent = (val: number, quota: number) => quota ? Math.round((val / quota) * 100) + '%' : '-'
    const newPTPercent = percent(new_pt_mtd, newPTQuota)
    const renewPTPercent = percent(renew_pt_mtd, renewPTQuota)
    const totalPTPercent = percent(total_pt_mtd, totalPTQuota)
    const newPTProjPercent = percent(newPTProj, newPTQuota)
    const renewPTProjPercent = percent(renewPTProj, renewPTQuota)
    const totalPTProjPercent = percent(totalPTProj, totalPTQuota)
    return {
      newPTQuota, renewPTQuota, totalPTQuota,
      new_pt_today, new_pt_mtd,
      renew_pt_today, renew_pt_mtd,
      total_pt_today, total_pt_mtd,
      newPTPercent, renewPTPercent, totalPTPercent,
      newPTProj, renewPTProj, totalPTProj,
      newPTProjPercent, renewPTProjPercent, totalPTProjPercent
    }
  }

  // Popup logic
  useEffect(() => {
    if (!popup) return
    setLoadingPopup(true)
    setPopupSales([])
    const fdwfdSales = getSalesFor(popup.fdwfd)
    let filtered: SaleDetail[] = []
    if (popup.type === 'new') {
      filtered = fdwfdSales.filter(s =>
        (s.profit_center === 'Personal Training - NEW' || s.profit_center === 'PT Postdate - New') &&
        (popup.period === 'today' ? s.latest_payment_date === getYesterdayDate() : true)
      )
    } else if (popup.type === 'renew') {
      filtered = fdwfdSales.filter(s =>
        (s.profit_center === 'Personal Training - RENEW' || s.profit_center === 'PT Postdate - Renew') &&
        (popup.period === 'today' ? s.latest_payment_date === getYesterdayDate() : true)
      )
    } else {
      filtered = fdwfdSales.filter(s =>
        popup.period === 'today' ? s.latest_payment_date === getYesterdayDate() : true
      )
    }
    setPopupSales(filtered)
    setLoadingPopup(false)
  }, [popup, allSales])

  if (loading || loadingQuotas || !quotas) {
    return <div className="p-4 text-center">Loading Coaches Table...</div>
  }
  if (error) {
    return <div className="p-4 text-center text-red-600">Error: {error}</div>
  }

  // Render a table for FD or WFD
  const renderTable = (fdwfd: 'fd' | 'wfd', label: string) => {
    const sales = getSalesFor(fdwfd)
    const metrics = getMetrics(sales, fdwfd)
    return (
      <div className="border border-gray-300 mb-4">
        <div className="table-responsive">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 p-1 text-left" style={{ backgroundColor: "#00b050" }}>{label}</th>
                <th className="border border-gray-300 p-1 text-center" style={{ backgroundColor: "#00b050" }}>Today</th>
                <th className="border border-gray-300 p-1 text-center" style={{ backgroundColor: "#00b050" }}>MTD</th>
                <th className="border border-gray-300 p-1 text-center" style={{ backgroundColor: "#00b050" }}>Quota</th>
                <th className="border border-gray-300 p-1 text-center" style={{ backgroundColor: "#00b050" }}>Proj</th>
                <th className="border border-gray-300 p-1 text-center" style={{ backgroundColor: "#00b050" }}>% Quota</th>
                <th className="border border-gray-300 p-1 text-center" style={{ backgroundColor: "#00b050" }}>% Proj</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-1">New PT</td>
                <td className="border border-gray-300 p-1 text-center cursor-pointer hover:bg-gray-200" onClick={() => setPopup({ type: 'new', period: 'today', fdwfd })}>{metrics.new_pt_today.toLocaleString()}</td>
                <td className="border border-gray-300 p-1 text-center cursor-pointer hover:bg-gray-200" onClick={() => setPopup({ type: 'new', period: 'mtd', fdwfd })}>{metrics.new_pt_mtd.toLocaleString()}</td>
                <td className="border border-gray-300 p-1 text-center bg-gray-300">{metrics.newPTQuota.toLocaleString()}</td>
                <td className="border border-gray-300 p-1 text-center">{Math.round(metrics.newPTProj).toLocaleString()}</td>
                <td className="border border-gray-300 p-1 text-center">{metrics.newPTPercent}</td>
                <td className="border border-gray-300 p-1 text-center">{metrics.newPTProjPercent}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-1">Renew PT</td>
                <td className="border border-gray-300 p-1 text-center cursor-pointer hover:bg-gray-200" onClick={() => setPopup({ type: 'renew', period: 'today', fdwfd })}>{metrics.renew_pt_today.toLocaleString()}</td>
                <td className="border border-gray-300 p-1 text-center cursor-pointer hover:bg-gray-200" onClick={() => setPopup({ type: 'renew', period: 'mtd', fdwfd })}>{metrics.renew_pt_mtd.toLocaleString()}</td>
                <td className="border border-gray-300 p-1 text-center bg-gray-300">{metrics.renewPTQuota.toLocaleString()}</td>
                <td className="border border-gray-300 p-1 text-center">{Math.round(metrics.renewPTProj).toLocaleString()}</td>
                <td className="border border-gray-300 p-1 text-center">{metrics.renewPTPercent}</td>
                <td className="border border-gray-300 p-1 text-center">{metrics.renewPTProjPercent}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-1 font-bold">Total PT</td>
                <td className="border border-gray-300 p-1 text-center font-bold cursor-pointer hover:bg-gray-200" onClick={() => setPopup({ type: 'total', period: 'today', fdwfd })}>{metrics.total_pt_today.toLocaleString()}</td>
                <td className="border border-gray-300 p-1 text-center font-bold cursor-pointer hover:bg-gray-200" onClick={() => setPopup({ type: 'total', period: 'mtd', fdwfd })}>{metrics.total_pt_mtd.toLocaleString()}</td>
                <td className="border border-gray-300 p-1 text-center font-bold bg-gray-300">{metrics.totalPTQuota.toLocaleString()}</td>
                <td className="border border-gray-300 p-1 text-center font-bold">{Math.round(metrics.totalPTProj).toLocaleString()}</td>
                <td className="border border-gray-300 p-1 text-center font-bold">{metrics.totalPTPercent}</td>
                <td className="border border-gray-300 p-1 text-center font-bold">{metrics.totalPTProjPercent}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* FD Table */}
      <div>
        <div className="mb-2">
          <div className="table-responsive">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-1 font-bold" style={{ width: "75%", backgroundColor: "#00b050" }}>FD - Zach</td>
                  <td className="border border-gray-300 p-1 text-center font-bold" style={{ width: "25%" }}>{getMetrics(getSalesFor('fd'), 'fd').totalPTProjPercent}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        {renderTable('fd', 'Coaches')}
      </div>
      {/* WFD Table */}
      <div>
        <div className="mb-2">
          <div className="table-responsive">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-1 font-bold" style={{ width: "75%", backgroundColor: "#00b050" }}>WFD - </td>
                  <td className="border border-gray-300 p-1 text-center font-bold" style={{ width: "25%" }}>{getMetrics(getSalesFor('wfd'), 'wfd').totalPTProjPercent}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        {renderTable('wfd', 'Coaches (WFD)')}
      </div>

      {/* Popup Modal for Sales Details */}
      {popup && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40" onClick={() => setPopup(null)}>
          <div className="bg-white p-4 rounded shadow-lg max-h-[80vh] overflow-auto w-[95%] max-w-3xl relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-600 hover:text-black" onClick={() => setPopup(null)}>
              ❌
            </button>
            <h2 className="font-bold mb-2">
              MTD Sales for {popup.type === 'new' ? 'New PT' : popup.type === 'renew' ? 'Renew PT' : 'Total PT'} ({popup.fdwfd === 'fd' ? 'FD' : 'WFD'})
            </h2>
            {loadingPopup ? (
              <div className="text-center p-4">Loading sales...</div>
            ) : (
              <table className="w-full text-sm mb-2 border-collapse">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Sale ID</th>
                    <th className="border px-2 py-1">Member Name</th>
                    <th className="border px-2 py-1 text-right">Amount</th>
                    <th className="border px-2 py-1">Date</th>
                    <th className="border px-2 py-1">Profit Center</th>
                    <th className="border px-2 py-1">Commission Employee(s)</th>
                  </tr>
                </thead>
                <tbody>
                  {popupSales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="border px-2 py-1 text-center text-gray-500">
                        No sales found
                      </td>
                    </tr>
                  ) : (
                    popupSales.map(sale => (
                      <tr key={sale.sale_id}>
                        <td className="border px-2 py-1">{sale.sale_id}</td>
                        <td className="border px-2 py-1">{sale.member_name}</td>
                        <td className="border px-2 py-1 text-right">${sale.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="border px-2 py-1">{sale.latest_payment_date}</td>
                        <td className="border px-2 py-1">{sale.profit_center}</td>
                        <td className="border px-2 py-1">{sale.commission_employees || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
