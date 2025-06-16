"use client";

import { useEffect, useState } from "react";
import ClubKPISection from "./ClubKPISection"; // Adjust the import path as needed
import React from "react";

export default function TopSection() {
  const [totalCashMTD, setTotalCashMTD] = useState(0);
  const [projectedCash, setProjectedCash] = useState(0);
  const [loading, setLoading] = useState(true);

  // Attrition Data State
  const [ctCanceled, setCtCanceled] = useState({ units: 0, draftSum: 0 });
  const [ctCanceledDetails, setCtCanceledDetails] = useState<any[]>([]);
  const [showCtCanceledModal, setShowCtCanceledModal] = useState(false);
  const [loadingAttrition, setLoadingAttrition] = useState(true);

  // CT Expired
  const [ctExpired, setCtExpired] = useState({ units: 0, draftSum: 0 });
  const [ctExpiredDetails, setCtExpiredDetails] = useState<any[]>([]);
  const [showCtExpiredModal, setShowCtExpiredModal] = useState(false);

  // CT RFC
  const [ctRFC, setCtRFC] = useState({ units: 0, draftSum: 0 });
  const [ctRFCDetails, setCtRFCDetails] = useState<any[]>([]);
  const [showCtRFCModal, setShowCtRFCModal] = useState(false);

  // All Other Canceled
  const [otherCanceled, setOtherCanceled] = useState({ units: 0, draftSum: 0 });
  const [otherCanceledDetails, setOtherCanceledDetails] = useState<any[]>([]);
  const [showOtherCanceledModal, setShowOtherCanceledModal] = useState(false);
  // All Other Expired
  const [otherExpired, setOtherExpired] = useState({ units: 0, draftSum: 0 });
  const [otherExpiredDetails, setOtherExpiredDetails] = useState<any[]>([]);
  const [showOtherExpiredModal, setShowOtherExpiredModal] = useState(false);

  // All Other RFC
  const [otherRFC, setOtherRFC] = useState({ units: 0, draftSum: 0 });
  const [otherRFCDetails, setOtherRFCDetails] = useState<any[]>([]);
  const [showOtherRFCModal, setShowOtherRFCModal] = useState(false);

  // Use environment variable or fallback to production URL
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://ecabackend-3.onrender.com";

  useEffect(() => {
    // Fetch basic stats (optional logging)
    fetch(`${API_BASE}/api/sales/stats`)
      .then((res) => res.json())
      .then((data) => {
        console.log("✅ Backend data received:", data);
      })
      .catch((error) => {
        console.error("❌ Failed to fetch data from backend:", error);
      });

    // Fetch ABC MTD & projected cash data
    fetchABCSections();

    // Fetch CT Canceled summary and details
    fetchAttrition();
  }, []);

  const fetchABCSections = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sales/abc-sections`);
      if (!response.ok) throw new Error("Failed to fetch ABC sections data");

      const data = await response.json();
      console.log("✅ ABC sections data received:", data);
      setTotalCashMTD(data.total_abc_mtd);

      // Use same value for projection, can be adjusted later
      setProjectedCash(data.total_abc_mtd);

      setLoading(false);
    } catch (error) {
      console.error("❌ Failed to fetch ABC sections data:", error);
      setLoading(false);
    }
  };

  const fetchAttrition = async () => {
    setLoadingAttrition(true);
    try {
      // Summary
      const summaryRes = await fetch(`${API_BASE}/champions_club_cancelled_summary`);
      const summary = await summaryRes.json();
      setCtCanceled({ units: summary.count || 0, draftSum: summary.draft_sum || 0 });
      // Details
      const detailsRes = await fetch(`${API_BASE}/champions_club_cancelled_details`);
      const details = await detailsRes.json();
      setCtCanceledDetails(details.details || []);

      // CT Expired
      const expiredSummaryRes = await fetch(`${API_BASE}/champions_club_expired_summary`);
      const expiredSummary = await expiredSummaryRes.json();
      setCtExpired({ units: expiredSummary.count || 0, draftSum: expiredSummary.draft_sum || 0 });
      const expiredDetailsRes = await fetch(`${API_BASE}/champions_club_expired_details`);
      const expiredDetails = await expiredDetailsRes.json();
      setCtExpiredDetails(expiredDetails.details || []);

      // CT RFC
      const rfcSummaryRes = await fetch(`${API_BASE}/champions_club_rfc_summary`);
      const rfcSummary = await rfcSummaryRes.json();
      setCtRFC({ units: rfcSummary.count || 0, draftSum: rfcSummary.draft_sum || 0 });
      const rfcDetailsRes = await fetch(`${API_BASE}/champions_club_rfc_details`);
      const rfcDetails = await rfcDetailsRes.json();
      setCtRFCDetails(rfcDetails.details || []);

      // All Other Canceled
      const otherCanceledSummaryRes = await fetch(`${API_BASE}/all_other_canceled_summary`);
      const otherCanceledSummary = await otherCanceledSummaryRes.json();
      setOtherCanceled({ units: otherCanceledSummary.count || 0, draftSum: otherCanceledSummary.draft_sum || 0 });
      const otherCanceledDetailsRes = await fetch(`${API_BASE}/all_other_canceled_details`);
      const otherCanceledDetails = await otherCanceledDetailsRes.json();
      setOtherCanceledDetails(otherCanceledDetails.details || []);

      // All Other Expired
      const otherExpiredSummaryRes = await fetch(`${API_BASE}/all_other_expired_summary`);
      const otherExpiredSummary = await otherExpiredSummaryRes.json();
      setOtherExpired({ units: otherExpiredSummary.count || 0, draftSum: otherExpiredSummary.draft_sum || 0 });
      const otherExpiredDetailsRes = await fetch(`${API_BASE}/all_other_expired_details`);
      const otherExpiredDetails = await otherExpiredDetailsRes.json();
      setOtherExpiredDetails(otherExpiredDetails.details || []);

      // All Other RFC
      const otherRFCSummaryRes = await fetch(`${API_BASE}/all_other_rfc_summary`);
      const otherRFCSummary = await otherRFCSummaryRes.json();
      setOtherRFC({ units: otherRFCSummary.count || 0, draftSum: otherRFCSummary.draft_sum || 0 });
      const otherRFCDetailsRes = await fetch(`${API_BASE}/all_other_rfc_details`);
      const otherRFCDetails = await otherRFCDetailsRes.json();
      setOtherRFCDetails(otherRFCDetails.details || []);
    } catch (e) {
      setCtCanceled({ units: 0, draftSum: 0 });
      setCtCanceledDetails([]);
      setCtExpired({ units: 0, draftSum: 0 });
      setCtExpiredDetails([]);
      setCtRFC({ units: 0, draftSum: 0 });
      setCtRFCDetails([]);
      setOtherCanceled({ units: 0, draftSum: 0 });
      setOtherCanceledDetails([]);
      setOtherExpired({ units: 0, draftSum: 0 });
      setOtherExpiredDetails([]);
      setOtherRFC({ units: 0, draftSum: 0 });
      setOtherRFCDetails([]);
    }
    setLoadingAttrition(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Modal for CT Canceled details
  const CtCanceledModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded shadow-lg p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">CT Canceled Details</h2>
          <button onClick={() => setShowCtCanceledModal(false)} className="text-gray-500 hover:text-black">✕</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr>
                <th className="border p-2 text-left">Member Name</th>
                <th className="border p-2 text-left">Agreement #</th>
                <th className="border p-2 text-left">Status Reason</th>
                <th className="border p-2 text-left">Draft</th>
              </tr>
            </thead>
            <tbody>
              {ctCanceledDetails.length === 0 ? (
                <tr><td colSpan={4} className="text-center p-2">No details found.</td></tr>
              ) : (
                ctCanceledDetails.map((row, i) => (
                  <tr key={i}>
                    <td className="border p-2">{row.member_name}</td>
                    <td className="border p-2">{row.agreement_number}</td>
                    <td className="border p-2">{row.status_reason}</td>
                    <td className="border p-2">{formatCurrency(row.draft || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Modal for CT Expired details
  const CtExpiredModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded shadow-lg p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">CT Expired Details</h2>
          <button onClick={() => setShowCtExpiredModal(false)} className="text-gray-500 hover:text-black">✕</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr>
                <th className="border p-2 text-left">Member Name</th>
                <th className="border p-2 text-left">Agreement #</th>
                <th className="border p-2 text-left">Status Reason</th>
                <th className="border p-2 text-left">Draft</th>
              </tr>
            </thead>
            <tbody>
              {ctExpiredDetails.length === 0 ? (
                <tr><td colSpan={4} className="text-center p-2">No details found.</td></tr>
              ) : (
                ctExpiredDetails.map((row, i) => (
                  <tr key={i}>
                    <td className="border p-2">{row.member_name}</td>
                    <td className="border p-2">{row.agreement_number}</td>
                    <td className="border p-2">{row.status_reason}</td>
                    <td className="border p-2">{formatCurrency(row.draft || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Modal for CT RFC details
  const CtRFCModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded shadow-lg p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">CT RFC Details</h2>
          <button onClick={() => setShowCtRFCModal(false)} className="text-gray-500 hover:text-black">✕</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr>
                <th className="border p-2 text-left">Member Name</th>
                <th className="border p-2 text-left">Agreement #</th>
                <th className="border p-2 text-left">Status Reason</th>
                <th className="border p-2 text-left">Draft</th>
              </tr>
            </thead>
            <tbody>
              {ctRFCDetails.length === 0 ? (
                <tr><td colSpan={4} className="text-center p-2">No details found.</td></tr>
              ) : (
                ctRFCDetails.map((row, i) => (
                  <tr key={i}>
                    <td className="border p-2">{row.member_name}</td>
                    <td className="border p-2">{row.agreement_number}</td>
                    <td className="border p-2">{row.status_reason}</td>
                    <td className="border p-2">{formatCurrency(row.draft || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Modal for All Other Canceled details
  const OtherCanceledModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded shadow-lg p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">All Other Canceled Details</h2>
          <button onClick={() => setShowOtherCanceledModal(false)} className="text-gray-500 hover:text-black">✕</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr>
                <th className="border p-2 text-left">Member Name</th>
                <th className="border p-2 text-left">Agreement #</th>
                <th className="border p-2 text-left">Status Reason</th>
                <th className="border p-2 text-left">Draft</th>
              </tr>
            </thead>
            <tbody>
              {otherCanceledDetails.length === 0 ? (
                <tr><td colSpan={4} className="text-center p-2">No details found.</td></tr>
              ) : (
                otherCanceledDetails.map((row, i) => (
                  <tr key={i}>
                    <td className="border p-2">{row.member_name}</td>
                    <td className="border p-2">{row.agreement_number}</td>
                    <td className="border p-2">{row.status_reason}</td>
                    <td className="border p-2">{formatCurrency(row.draft || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Modal for All Other Expired details
  const OtherExpiredModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded shadow-lg p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">All Other Expired Details</h2>
          <button onClick={() => setShowOtherExpiredModal(false)} className="text-gray-500 hover:text-black">✕</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr>
                <th className="border p-2 text-left">Member Name</th>
                <th className="border p-2 text-left">Agreement #</th>
                <th className="border p-2 text-left">Status Reason</th>
                <th className="border p-2 text-left">Draft</th>
              </tr>
            </thead>
            <tbody>
              {otherExpiredDetails.length === 0 ? (
                <tr><td colSpan={4} className="text-center p-2">No details found.</td></tr>
              ) : (
                otherExpiredDetails.map((row, i) => (
                  <tr key={i}>
                    <td className="border p-2">{row.member_name}</td>
                    <td className="border p-2">{row.agreement_number}</td>
                    <td className="border p-2">{row.status_reason}</td>
                    <td className="border p-2">{formatCurrency(row.draft || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Modal for All Other RFC details
  const OtherRFCModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded shadow-lg p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">All Other RFC Details</h2>
          <button onClick={() => setShowOtherRFCModal(false)} className="text-gray-500 hover:text-black">✕</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr>
                <th className="border p-2 text-left">Member Name</th>
                <th className="border p-2 text-left">Agreement #</th>
                <th className="border p-2 text-left">Status Reason</th>
                <th className="border p-2 text-left">Draft</th>
              </tr>
            </thead>
            <tbody>
              {otherRFCDetails.length === 0 ? (
                <tr><td colSpan={4} className="text-center p-2">No details found.</td></tr>
              ) : (
                otherRFCDetails.map((row, i) => (
                  <tr key={i}>
                    <td className="border p-2">{row.member_name}</td>
                    <td className="border p-2">{row.agreement_number}</td>
                    <td className="border p-2">{row.status_reason}</td>
                    <td className="border p-2">{formatCurrency(row.draft || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mb-4 border border-gray-300 p-2">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4">
        {/* Left Column - Cash Totals */}
        <div className="md:col-span-3">
          <div id="total-cash-mtd" className="mb-4 border border-gray-300">
            <div className="bg-gray-300 border-b border-gray-300 p-1 text-center font-bold">
              Total Cash MTD
            </div>
            <div className="p-4 text-center text-2xl font-bold">
              {loading ? "Loading..." : formatCurrency(totalCashMTD)}
            </div>
          </div>

          <div id="projected-cash" className="border border-gray-300">
            <div className="bg-gray-300 border-b border-gray-300 p-1 text-center font-bold">
              Projected Cash
            </div>
            <div className="p-4 text-center text-2xl font-bold">
              {loading ? "Loading..." : formatCurrency(projectedCash)}
            </div>
          </div>
        </div>

        {/* Middle Column - KPI Table */}
        <div className="md:col-span-5">
          <ClubKPISection />
        </div>

        {/* Right Column - Attrition Table (static for now) */}
        <div className="md:col-span-4">
          <div id="attrition-data" className="border border-gray-300">
            <div className="bg-gray-300 border-b border-gray-300 p-1 text-center font-bold">
              Attrition Data
            </div>
            <div className="table-responsive">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-1 text-left">Type</th>
                    <th className="border border-gray-300 p-1 text-center">Units</th>
                    <th className="border border-gray-300 p-1 text-center">EFT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-1">CT Canceled</td>
                    <td
                      className="border p-1 text-center cursor-pointer hover:bg-blue-100"
                      onClick={() => setShowCtCanceledModal(true)}
                    >
                      {loadingAttrition ? "..." : ctCanceled.units}
                    </td>
                    <td
                      className="border p-1 text-right cursor-pointer hover:bg-blue-100"
                      onClick={() => setShowCtCanceledModal(true)}
                    >
                      {loadingAttrition ? "..." : `(${
                        ctCanceled.draftSum ? Math.abs(Math.round(ctCanceled.draftSum)).toLocaleString() : 0
                      })`}
                    </td>
                  </tr>
                  <tr>
                    <td className="border p-1">CT Expired</td>
                    <td
                      className="border p-1 text-center cursor-pointer hover:bg-blue-100"
                      onClick={() => setShowCtExpiredModal(true)}
                    >
                      {loadingAttrition ? "..." : ctExpired.units}
                    </td>
                    <td
                      className="border p-1 text-right cursor-pointer hover:bg-blue-100"
                      onClick={() => setShowCtExpiredModal(true)}
                    >
                      {loadingAttrition ? "..." : `(${
                        ctExpired.draftSum ? Math.abs(Math.round(ctExpired.draftSum)).toLocaleString() : 0
                      })`}
                    </td>
                  </tr>
                  <tr>
                    <td className="border p-1">CT RFC</td>
                    <td
                      className="border p-1 text-center cursor-pointer hover:bg-blue-100"
                      onClick={() => setShowCtRFCModal(true)}
                    >
                      {loadingAttrition ? "..." : ctRFC.units}
                    </td>
                    <td
                      className="border p-1 text-right cursor-pointer hover:bg-blue-100"
                      onClick={() => setShowCtRFCModal(true)}
                    >
                      {loadingAttrition ? "..." : `(${
                        ctRFC.draftSum ? Math.abs(Math.round(ctRFC.draftSum)).toLocaleString() : 0
                      })`}
                    </td>
                  </tr>
                  <tr>
                    <td className="border p-1">CT Downgrades</td>
                    <td className="border p-1 text-center"></td>
                    <td className="border p-1 text-right"></td>
                  </tr>
                  <tr>
                    <td className="border p-1 font-bold italic">Total CT Attrition</td>
                    <td className="border p-1 text-center font-bold italic"></td>
                    <td className="border p-1 text-right font-bold italic"></td>
                  </tr>
                  <tr>
                    <td className="border p-1">All Other Canceled</td>
                    <td
                      className="border p-1 text-center cursor-pointer hover:bg-blue-100"
                      onClick={() => setShowOtherCanceledModal(true)}
                    >
                      {loadingAttrition ? "..." : otherCanceled.units}
                    </td>
                    <td
                      className="border p-1 text-right cursor-pointer hover:bg-blue-100"
                      onClick={() => setShowOtherCanceledModal(true)}
                    >
                      {loadingAttrition ? "..." : `(${
                        otherCanceled.draftSum ? Math.abs(Math.round(otherCanceled.draftSum)).toLocaleString() : 0
                      })`}
                    </td>
                  </tr>
                  <tr>
                    <td className="border p-1">All Other Expired</td>
                    <td
                      className="border p-1 text-center cursor-pointer hover:bg-blue-100"
                      onClick={() => setShowOtherExpiredModal(true)}
                    >
                      {loadingAttrition ? "..." : otherExpired.units}
                    </td>
                    <td
                      className="border p-1 text-right cursor-pointer hover:bg-blue-100"
                      onClick={() => setShowOtherExpiredModal(true)}
                    >
                      {loadingAttrition ? "..." : `(${
                        otherExpired.draftSum ? Math.abs(Math.round(otherExpired.draftSum)).toLocaleString() : 0
                      })`}
                    </td>
                  </tr>
                  <tr>
                    <td className="border p-1">All Other RFC</td>
                    <td
                      className="border p-1 text-center cursor-pointer hover:bg-blue-100"
                      onClick={() => setShowOtherRFCModal(true)}
                    >
                      {loadingAttrition ? "..." : otherRFC.units}
                    </td>
                    <td
                      className="border p-1 text-right cursor-pointer hover:bg-blue-100"
                      onClick={() => setShowOtherRFCModal(true)}
                    >
                      {loadingAttrition ? "..." : `(${
                        otherRFC.draftSum ? Math.abs(Math.round(otherRFC.draftSum)).toLocaleString() : 0
                      })`}
                    </td>
                  </tr>
                  <tr><td className="border p-1">All Other Downgrades</td><td className="border p-1 text-center">2</td><td className="border p-1 text-right">(25)</td></tr>
                  <tr><td className="border p-1 font-bold italic">Total All Other Attrition</td><td className="border p-1 text-center font-bold italic">148</td><td className="border p-1 text-right font-bold italic">$ (4,876)</td></tr>
                  <tr><td className="border p-1 font-bold italic">Grand Total</td><td className="border p-1 text-center font-bold italic">182</td><td className="border p-1 text-right font-bold italic">$ (8,745)</td></tr>
                  <tr><td className="border p-1">New EFT</td><td className="border p-1 text-center"></td><td className="border p-1 text-right">$ 11,245</td></tr>
                  <tr><td className="border p-1 font-bold italic">Total Gain/Loss EFT</td><td className="border p-1 text-center"></td><td className="border p-1 text-right font-bold italic">$ 2,500</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          {showCtCanceledModal && <CtCanceledModal />}
          {showCtExpiredModal && <CtExpiredModal />}
          {showCtRFCModal && <CtRFCModal />}
          {showOtherCanceledModal && <OtherCanceledModal />}
          {showOtherExpiredModal && <OtherExpiredModal />}
          {showOtherRFCModal && <OtherRFCModal />}
        </div>
      </div>
    </div>
  );
}
