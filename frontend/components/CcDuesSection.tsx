import React, { useEffect, useState } from "react";

interface Sale {
  sale_id: string;
  profit_center: string;
  total_amount: number;
  latest_payment_date: string; // YYYY-MM-DD
}

function getYesterday(): string {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return [
    yesterday.getFullYear(),
    String(yesterday.getMonth() + 1).padStart(2, "0"),
    String(yesterday.getDate()).padStart(2, "0"),
  ].join("-");
}

function getMonthStart(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    "01",
  ].join("-");
}

export default function CcDuesSection() {
  const [collectionsToday, setCollectionsToday] = useState<number | null>(null);
  const [collectionsMTD, setCollectionsMTD] = useState<number | null>(null);
  const [pifRenewalsToday, setPifRenewalsToday] = useState<number | null>(null);
  const [pifRenewalsMTD, setPifRenewalsMTD] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [quotas, setQuotas] = useState<any>(null);
  const [loadingQuotas, setLoadingQuotas] = useState(true);
  const [collectionsSalesToday, setCollectionsSalesToday] = useState<Sale[]>([]);
  const [collectionsSalesMTD, setCollectionsSalesMTD] = useState<Sale[]>([]);
  const [showCollectionsPopup, setShowCollectionsPopup] = useState<null | 'today' | 'mtd'>(null);
  const [pifRenewalsSalesToday, setPifRenewalsSalesToday] = useState<Sale[]>([]);
  const [pifRenewalsSalesMTD, setPifRenewalsSalesMTD] = useState<Sale[]>([]);
  const [showPifRenewalsPopup, setShowPifRenewalsPopup] = useState<null | 'today' | 'mtd'>(null);

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = now.getDate();

  useEffect(() => {
    async function fetchCollections() {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:8000/api/sales/collections-dues");
        if (!res.ok) throw new Error("Failed to fetch collections dues");
        const data = await res.json();
        // Fetch all sales for downgrade fees
        const salesRes = await fetch("http://localhost:8000/api/sales/all");
        const allSales = salesRes.ok ? await salesRes.json() : [];
        const yesterday = getYesterday();
        const monthStart = getMonthStart();
        // Helper: is downgrade fee, collections, or pos dues
        const isDowngradeFee = (s: any) => {
          const pc = (s.profit_center || '').toLowerCase();
          return pc === 'downgrade fee' || pc === 'downgrade fees';
        };
        const isCollections = (s: any) => {
          const pc = (s.profit_center || '').toLowerCase();
          return pc === 'collections';
        };
        const isPosDues = (s: any) => {
          const pc = (s.profit_center || '').toLowerCase();
          return pc === 'pos dues';
        };
        // Today
        const collectionsTodaySales = allSales.filter((s: any) => (isCollections(s) || isDowngradeFee(s) || isPosDues(s)) && s.latest_payment_date === yesterday);
        // MTD
        const collectionsMTDSales = allSales.filter((s: any) => (isCollections(s) || isDowngradeFee(s) || isPosDues(s)) && s.latest_payment_date >= monthStart);
        setCollectionsSalesToday(collectionsTodaySales);
        setCollectionsSalesMTD(collectionsMTDSales);
        const downgradeToday = allSales.filter((s: any) => isDowngradeFee(s) && s.latest_payment_date === yesterday).reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
        const downgradeMTD = allSales.filter((s: any) => isDowngradeFee(s) && s.latest_payment_date >= monthStart).reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
        setCollectionsToday((data.today ?? 0) + downgradeToday);
        setCollectionsMTD((data.mtd ?? 0) + downgradeMTD);
        // --- PIF Renewals sales ---
        const isPifRenewal = (s: any) => {
          const pc = (s.profit_center || '').toLowerCase();
          return pc === 'pif renewal' || pc === 'pif renewals';
        };
        const pifRenewalsTodaySales = allSales.filter((s: any) => isPifRenewal(s) && s.latest_payment_date === yesterday);
        const pifRenewalsMTDSales = allSales.filter((s: any) => isPifRenewal(s) && s.latest_payment_date >= monthStart);
        setPifRenewalsSalesToday(pifRenewalsTodaySales);
        setPifRenewalsSalesMTD(pifRenewalsMTDSales);
      } catch (err) {
        setCollectionsToday(null);
        setCollectionsMTD(null);
        setCollectionsSalesToday([]);
        setCollectionsSalesMTD([]);
      } finally {
        setLoading(false);
      }
    }
    fetchCollections();
    async function fetchPifRenewals() {
      try {
        const res = await fetch("http://localhost:8000/api/sales/pif-renewals-dues");
        if (!res.ok) throw new Error("Failed to fetch PIF Renewals dues");
        const data = await res.json();
        setPifRenewalsToday(data.today);
        setPifRenewalsMTD(data.mtd);
      } catch (err) {
        setPifRenewalsToday(null);
        setPifRenewalsMTD(null);
      }
    }
    fetchPifRenewals();
  }, []);

  useEffect(() => {
    async function fetchQuotas() {
      setLoadingQuotas(true);
      try {
        const res = await fetch("http://localhost:8000/api/kpi/pt-quotas");
        if (!res.ok) throw new Error("Failed to fetch quotas");
        const data = await res.json();
        setQuotas(data);
      } catch (err) {
        setQuotas(null);
      } finally {
        setLoadingQuotas(false);
      }
    }
    fetchQuotas();
  }, []);

  const formatNumber = (n: number | null) =>
    n === null ? "--" : n.toLocaleString();
  const formatPercent = (n: number | null, quota: number | null) => {
    if (n === null || !quota || quota === 0) return "--";
    return Math.round((n / quota) * 100) + "%";
  };

  // Collections projections and percent
  const collectionsQuota = quotas?.collections_quota ?? null;
  const collectionsProj = daysElapsed > 0 && collectionsMTD !== null ? (collectionsMTD / daysElapsed) * daysInMonth : 0;
  const collectionsPercent = collectionsQuota && collectionsQuota !== 0 ? Math.round((collectionsProj / collectionsQuota) * 100) + "%" : "--";

  // PIF Renewals (dynamic MTD)
  const pifRenewalsQuota = quotas?.pif_renewals_quota ?? null;
  const pifRenewalsProj = daysElapsed > 0 && pifRenewalsMTD !== null ? (pifRenewalsMTD / daysElapsed) * daysInMonth : 0;
  const pifRenewalsPercent = pifRenewalsQuota && pifRenewalsQuota !== 0 ? Math.round((pifRenewalsProj / pifRenewalsQuota) * 100) + "%" : "--";

  // ABC Dues dynamic quota, proj, percent
  const abcDuesMTD = 126636; // Static for now
  const abcDuesQuota = quotas?.abc_dues_quota ?? null;
  const abcDuesProj = daysElapsed > 0 ? (abcDuesMTD / daysElapsed) * daysInMonth : 0;
  const abcDuesPercent = abcDuesQuota && abcDuesQuota !== 0 ? Math.round((abcDuesProj / abcDuesQuota) * 100) + "%" : "--";

  // --- Total Dues calculations ---
  const totalDuesToday = (0) + (collectionsToday ?? 0) + (pifRenewalsToday ?? 0); // ABC Dues Today is 0 for now
  const totalDuesMTD = (abcDuesMTD ?? 0) + (collectionsMTD ?? 0) + (pifRenewalsMTD ?? 0);
  const totalDuesQuota = (abcDuesQuota ?? 0) + (collectionsQuota ?? 0) + (pifRenewalsQuota ?? 0);
  const totalDuesProj = (abcDuesProj ?? 0) + (collectionsProj ?? 0) + (pifRenewalsProj ?? 0);
  const totalDuesPercent = totalDuesQuota !== 0 ? Math.round((totalDuesProj / totalDuesQuota) * 100) + "%" : "--";

  // --- Coordinator Bonus calculations ---
  const coordinatorBonusToday = (collectionsToday ?? 0) + (pifRenewalsToday ?? 0);
  const coordinatorBonusMTD = (collectionsMTD ?? 0) + (pifRenewalsMTD ?? 0);
  const coordinatorBonusQuota = quotas?.coordinator_bonus_quota ?? 0;
  const coordinatorBonusProj = (collectionsProj ?? 0) + (pifRenewalsProj ?? 0);
  const coordinatorBonusPercent = coordinatorBonusQuota !== 0 ? Math.round((coordinatorBonusProj / coordinatorBonusQuota) * 100) + "%" : "--";

  return (
    <div id="cc-section" className="border border-gray-300">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border border-gray-300 p-1 text-left" style={{ width: "75%", backgroundColor: "#00b050" }}>
              CC - Madeline
            </th>
            <th className="border border-gray-300 p-1 text-center font-bold" style={{ width: "25%" }}>
              100%
            </th>
          </tr>
        </thead>
      </table>
      <div id="dues-table" className="table-responsive">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 p-1 text-left">Dues</th>
              <th className="border border-gray-300 p-1 text-center">Today</th>
              <th className="border border-gray-300 p-1 text-center">MTD</th>
              <th className="border border-gray-300 p-1 text-center">Quota</th>
              <th className="border border-gray-300 p-1 text-center">Proj</th>
              <th className="border border-gray-300 p-1 text-center">% Quota</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-1">ABC Dues</td>
              <td className="border border-gray-300 p-1 text-center"></td>
              <td className="border border-gray-300 p-1 text-center">{formatNumber(abcDuesMTD)}</td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">{loadingQuotas ? "..." : formatNumber(abcDuesQuota)}</td>
              <td className="border border-gray-300 p-1 text-center">{formatNumber(abcDuesProj)}</td>
              <td className="border border-gray-300 p-1 text-center">{loadingQuotas ? "..." : abcDuesPercent}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-1">Collections</td>
              <td className="border border-gray-300 p-1 text-center cursor-pointer hover:bg-green-100" onClick={() => setShowCollectionsPopup('today')} title="Click to view details">{loading ? "..." : formatNumber(collectionsToday)}</td>
              <td className="border border-gray-300 p-1 text-center cursor-pointer hover:bg-green-100" onClick={() => setShowCollectionsPopup('mtd')} title="Click to view details">{loading ? "..." : formatNumber(collectionsMTD)}</td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">{loadingQuotas ? "..." : formatNumber(collectionsQuota)}</td>
              <td className="border border-gray-300 p-1 text-center">{loadingQuotas ? "..." : formatNumber(collectionsProj)}</td>
              <td className="border border-gray-300 p-1 text-center">{loadingQuotas ? "..." : collectionsPercent}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-1">PIF Renewals</td>
              <td className="border border-gray-300 p-1 text-center cursor-pointer hover:bg-green-100" onClick={() => setShowPifRenewalsPopup('today')} title="Click to view details">{loading ? "..." : formatNumber(pifRenewalsToday)}</td>
              <td className="border border-gray-300 p-1 text-center cursor-pointer hover:bg-green-100" onClick={() => setShowPifRenewalsPopup('mtd')} title="Click to view details">{loading ? "..." : formatNumber(pifRenewalsMTD)}</td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">{loadingQuotas ? "..." : formatNumber(pifRenewalsQuota)}</td>
              <td className="border border-gray-300 p-1 text-center">{loadingQuotas ? "..." : formatNumber(pifRenewalsProj)}</td>
              <td className="border border-gray-300 p-1 text-center">{loadingQuotas ? "..." : pifRenewalsPercent}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-1 font-bold">Total Dues</td>
              <td className="border border-gray-300 p-1 text-center font-bold">{loading || loadingQuotas ? "..." : formatNumber(totalDuesToday)}</td>
              <td className="border border-gray-300 p-1 text-center font-bold">{loading || loadingQuotas ? "..." : formatNumber(totalDuesMTD)}</td>
              <td className="border border-gray-300 p-1 text-center font-bold bg-gray-300">{loadingQuotas ? "..." : formatNumber(totalDuesQuota)}</td>
              <td className="border border-gray-300 p-1 text-center font-bold">{loading || loadingQuotas ? "..." : formatNumber(totalDuesProj)}</td>
              <td className="border border-gray-300 p-1 text-center font-bold">{loading || loadingQuotas ? "..." : totalDuesPercent}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-1">Coordinator Bonus</td>
              <td className="border border-gray-300 p-1 text-center">{loading || loadingQuotas ? "..." : formatNumber(coordinatorBonusToday)}</td>
              <td className="border border-gray-300 p-1 text-center">{loading || loadingQuotas ? "..." : formatNumber(coordinatorBonusMTD)}</td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">{loadingQuotas ? "..." : formatNumber(coordinatorBonusQuota)}</td>
              <td className="border border-gray-300 p-1 text-center">{loading || loadingQuotas ? "..." : formatNumber(coordinatorBonusProj)}</td>
              <td className="border border-gray-300 p-1 text-center">{loading || loadingQuotas ? "..." : coordinatorBonusPercent}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* Popup for Collections Sales */}
      {showCollectionsPopup && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowCollectionsPopup(null)}>
          <div className="bg-white p-4 rounded shadow-lg max-h-[80vh] overflow-auto w-[95%] max-w-2xl relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-600 hover:text-black" onClick={() => setShowCollectionsPopup(null)}>
              ❌
            </button>
            <h2 className="font-bold mb-2">
              Collections Sales Details ({showCollectionsPopup === 'today' ? 'Today' : 'MTD'})
            </h2>
            <table className="w-full text-sm mb-2 border-collapse">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Sale ID</th>
                  <th className="border px-2 py-1">Profit Center</th>
                  <th className="border px-2 py-1 text-right">Amount</th>
                  <th className="border px-2 py-1">Date</th>
                </tr>
              </thead>
              <tbody>
                {(showCollectionsPopup === 'today' ? collectionsSalesToday : collectionsSalesMTD).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="border px-2 py-1 text-center text-gray-500">
                      No sales found
                    </td>
                  </tr>
                ) : (
                  (showCollectionsPopup === 'today' ? collectionsSalesToday : collectionsSalesMTD)
                    .slice()
                    .sort((a, b) => b.latest_payment_date.localeCompare(a.latest_payment_date))
                    .map((sale: any) => (
                      <tr key={sale.sale_id}>
                        <td className="border px-2 py-1">{sale.sale_id}</td>
                        <td className="border px-2 py-1">{sale.profit_center}</td>
                        <td className="border px-2 py-1 text-right">{formatNumber(sale.total_amount)}</td>
                        <td className="border px-2 py-1">{sale.latest_payment_date}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Popup for PIF Renewals Sales */}
      {showPifRenewalsPopup && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowPifRenewalsPopup(null)}>
          <div className="bg-white p-4 rounded shadow-lg max-h-[80vh] overflow-auto w-[95%] max-w-2xl relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-600 hover:text-black" onClick={() => setShowPifRenewalsPopup(null)}>
              ❌
            </button>
            <h2 className="font-bold mb-2">
              PIF Renewals Sales Details ({showPifRenewalsPopup === 'today' ? 'Today' : 'MTD'})
            </h2>
            <table className="w-full text-sm mb-2 border-collapse">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Sale ID</th>
                  <th className="border px-2 py-1">Profit Center</th>
                  <th className="border px-2 py-1 text-right">Amount</th>
                  <th className="border px-2 py-1">Date</th>
                </tr>
              </thead>
              <tbody>
                {(showPifRenewalsPopup === 'today' ? pifRenewalsSalesToday : pifRenewalsSalesMTD).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="border px-2 py-1 text-center text-gray-500">
                      No sales found
                    </td>
                  </tr>
                ) : (
                  (showPifRenewalsPopup === 'today' ? pifRenewalsSalesToday : pifRenewalsSalesMTD)
                    .slice()
                    .sort((a, b) => b.latest_payment_date.localeCompare(a.latest_payment_date))
                    .map((sale: any) => (
                      <tr key={sale.sale_id}>
                        <td className="border px-2 py-1">{sale.sale_id}</td>
                        <td className="border px-2 py-1">{sale.profit_center}</td>
                        <td className="border px-2 py-1 text-right">{formatNumber(sale.total_amount)}</td>
                        <td className="border px-2 py-1">{sale.latest_payment_date}</td>
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
