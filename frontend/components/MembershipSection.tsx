"use client";
import React, { useEffect, useState } from 'react';
import PTUnitsSection from './PTUnitsSection';
import { normalizeName } from './ProductionResults1';

export default function MembershipSection() {
  // State for sales and memberships
  const [sales, setSales] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [employees, setEmployees] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);

  const PT_CENTERS = [
    'PT Postdate - New',
    'PT Postdate - Renew',
    'Personal Training - NEW',
    'Personal Training - RENEW',
  ];
  const PT_NEW_CENTERS = [
    'PT Postdate - New',
    'Personal Training - NEW',
  ];
  const PT_RENEW_CENTERS = [
    'PT Postdate - Renew',
    'Personal Training - RENEW',
  ];

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('http://localhost:8000/api/sales/all').then(r => r.json()),
      fetch('http://localhost:8000/api/memberships').then(r => r.json()),
      fetch('http://localhost:8000/api/employees').then(r => r.json()),
      fetch('http://localhost:8000/api/employees/trainers').then(r => r.json()),
    ]).then(([salesData, membershipsData, empData, trainerData]) => {
      setSales(salesData);
      setMemberships(membershipsData);
      setEmployees(empData);
      setTrainers(trainerData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Helper: Build a lookup for membership_type/plan to other_names
  const membershipOtherNames: Record<string, string> = {};
  memberships.forEach(m => {
    if (m.membership_type && m.other_names) {
      membershipOtherNames[m.membership_type.trim().toLowerCase()] = m.other_names.trim();
    }
  });

  // Helper: Classify a sale as PIF or MTM based on membership_type/plan
  function classifyDeal(sale: any): 'PIF' | 'MTM' {
    // Try agreement_payment_plan, fallback to main_item, fallback to membership_type
    const plan = (sale.agreement_payment_plan || sale.main_item || sale.membership_type || '').trim().toLowerCase();
    // If plan string itself contains 'pif', treat as PIF
    if (plan.includes('pif')) return 'PIF';
    // Try to find a membership whose membership_type is a prefix of the plan string
    const match = memberships.find(m => plan.startsWith((m.membership_type || '').trim().toLowerCase()));
    if (match && match.other_names && match.other_names.toUpperCase().includes('PIF')) return 'PIF';
    // Fallback to previous lookup
    const otherNames = membershipOtherNames[plan] || '';
    if (otherNames.toUpperCase().includes('PIF')) return 'PIF';
    return 'MTM';
  }

  // Helper: Is this sale a Web/Online deal? (assigned to Web, profit_center New Business, no commission_employees)
  function isWebDeal(sale: any) {
    // Use the same logic as ProductionResults1.tsx for Web assignment
    // Web = profit_center === 'New Business' && (!commission_employees || commission_employees.trim() === '')
    return sale.profit_center === 'New Business' && (!sale.commission_employees || sale.commission_employees.trim() === '');
  }

  // Compute Today and MTD counts for Online Deals (Web)
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const todayStr = [
    yesterday.getFullYear(),
    String(yesterday.getMonth() + 1).padStart(2, '0'),
    String(yesterday.getDate()).padStart(2, '0'),
  ].join('-');

  let onlineMTM_Today = 0, onlineMTM_MTD = 0, onlinePIF_Today = 0, onlinePIF_MTD = 0;
  if (!loading) {
    sales.filter(isWebDeal).forEach(sale => {
      const type = classifyDeal(sale);
      const isToday = sale.latest_payment_date === todayStr;
      if (type === 'PIF') {
        if (isToday) onlinePIF_Today++;
        onlinePIF_MTD++;
      } else {
        if (isToday) onlineMTM_Today++;
        onlineMTM_MTD++;
      }
    });
  }
  const onlineTotal_Today = onlineMTM_Today + onlinePIF_Today;
  const onlineTotal_MTD = onlineMTM_MTD + onlinePIF_MTD;

  // Helper: Classify membership category
  function getMembershipCategory(membership_type: string | undefined): 'Access' | 'Amenities Plus' | 'Champions Training' | null {
    if (!membership_type) return null;
    const mt = membership_type.trim().toUpperCase();
    if (mt === 'ACCESS') return 'Access';
    if (mt === 'AMENITIES PLUS' || mt === 'AMENITIES') return 'Amenities Plus';
    if (mt === 'CHAMPIONS CLUB') return 'Champions Training';
    return null;
  }

  // Helper: Is this sale a category deal (not Web)
  function isCategoryDeal(sale: any, category: 'Access' | 'Amenities Plus' | 'Champions Training') {
    // Not a Web deal, must be New Business, and must match category
    return sale.profit_center === 'New Business' && (sale.commission_employees && sale.commission_employees.trim() !== '') && getMembershipCategory(sale.membership_type) === category;
  }

  // Compute Today and MTD counts for Access, Amenities Plus, Champions Training
  function computeCategoryCounts(category: 'Access' | 'Amenities Plus' | 'Champions Training') {
    let MTM_Today = 0, MTM_MTD = 0, PIF_Today = 0, PIF_MTD = 0;
    if (!loading) {
      sales.filter(sale => isCategoryDeal(sale, category)).forEach(sale => {
        const type = classifyDeal(sale);
        const isToday = sale.latest_payment_date === todayStr;
        if (type === 'PIF') {
          if (isToday) PIF_Today++;
          PIF_MTD++;
        } else {
          if (isToday) MTM_Today++;
          MTM_MTD++;
        }
      });
    }
    return {
      MTM_Today, MTM_MTD, PIF_Today, PIF_MTD,
      Total_Today: MTM_Today + PIF_Today,
      Total_MTD: MTM_MTD + PIF_MTD
    };
  }

  const accessCounts = computeCategoryCounts('Access');
  const amenitiesCounts = computeCategoryCounts('Amenities Plus');
  const championsCounts = computeCategoryCounts('Champions Training');

  // Calculate Membership Mix percentages for PTUnitsSection
  const grandTotal = onlineTotal_MTD + accessCounts.Total_MTD + amenitiesCounts.Total_MTD + championsCounts.Total_MTD;
  const percent = (count: number) => grandTotal > 0 ? Math.round((count / grandTotal) * 100) + '%' : '-';

  // Build normalized lists
  const salesTeam = employees.filter(e => !e.position || !e.position.toLowerCase().includes('trainer')).map(e => normalizeName(e.name));
  const trainerNames = trainers.map((t: any) => normalizeName(t.name));

  // Helper: is Front End PT (sales team)
  function isFrontEndPT(sale: any) {
    if (!PT_NEW_CENTERS.includes(sale.profit_center)) return false;
    if (!sale.commission_employees || sale.commission_employees.trim() === '') return false;
    const owners = sale.commission_employees.split(',').map((n: string) => normalizeName(n)).filter(Boolean);
    return owners.some((o: string) => salesTeam.includes(o));
  }
  // Helper: is Backend New PT (trainer)
  function isBackendNewPT(sale: any) {
    if (!PT_NEW_CENTERS.includes(sale.profit_center)) return false;
    if (!sale.commission_employees || sale.commission_employees.trim() === '') return false;
    const owners = sale.commission_employees.split(',').map((n: string) => normalizeName(n)).filter(Boolean);
    return owners.some((o: string) => trainerNames.includes(o));
  }
  // Helper: is Backend Renew PT (trainer)
  function isBackendRenewPT(sale: any) {
    if (!PT_RENEW_CENTERS.includes(sale.profit_center)) return false;
    if (!sale.commission_employees || sale.commission_employees.trim() === '') return false;
    const owners = sale.commission_employees.split(',').map((n: string) => normalizeName(n)).filter(Boolean);
    return owners.some((o: string) => trainerNames.includes(o));
  }

  // Calculate PT Units
  let feNewPT_Today = 0, feNewPT_MTD = 0, beNewPT_Today = 0, beNewPT_MTD = 0, beRenewPT_Today = 0, beRenewPT_MTD = 0;
  if (!loading) {
    sales.forEach(sale => {
      const isToday = sale.latest_payment_date === todayStr;
      if (isFrontEndPT(sale)) {
        if (isToday) feNewPT_Today += sale.transaction_count || 0;
        feNewPT_MTD += sale.transaction_count || 0;
      }
      if (isBackendNewPT(sale)) {
        if (isToday) beNewPT_Today += sale.transaction_count || 0;
        beNewPT_MTD += sale.transaction_count || 0;
      }
      if (isBackendRenewPT(sale)) {
        if (isToday) beRenewPT_Today += sale.transaction_count || 0;
        beRenewPT_MTD += sale.transaction_count || 0;
      }
    });
  }
  const ptUnitsTotal_Today = feNewPT_Today + beNewPT_Today + beRenewPT_Today;
  const ptUnitsTotal_MTD = feNewPT_MTD + beNewPT_MTD + beRenewPT_MTD;

  return (
    <div className="mb-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
      <div className="h-full min-h-[180px] flex flex-col justify-between">
        <PTUnitsSection
          type="membership"
          onlinePercent={percent(onlineTotal_MTD)}
          accessPercent={percent(accessCounts.Total_MTD)}
          amenitiesPercent={percent(amenitiesCounts.Total_MTD)}
          championsPercent={percent(championsCounts.Total_MTD)}
        />
      </div>
      <div id="online-deals-table" className="h-full min-h-[180px] flex flex-col justify-between">
        <div className="table-responsive h-full flex-1 flex flex-col justify-between">
          <table className="w-full border-collapse h-full flex-1">
            <thead>
              <tr className="font-bold">
                <th className="border border-black p-1 text-left" style={{ backgroundColor: "#92d050" }}>
                  Online Deals
                </th>
                <th className="border border-black p-1 text-center" style={{ backgroundColor: "#92d050" }}>
                  Today
                </th>
                <th className="border border-black p-1 text-center" style={{ backgroundColor: "#92d050" }}>
                  MTD
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1">MTM</td>
                <td className="border border-black p-1 text-center">{loading ? '-' : onlineMTM_Today}</td>
                <td className="border border-black p-1 text-center">{loading ? '-' : onlineMTM_MTD}</td>
              </tr>
              <tr>
                <td className="border border-black p-1">PIF</td>
                <td className="border border-black p-1 text-center">{loading ? '-' : onlinePIF_Today}</td>
                <td className="border border-black p-1 text-center">{loading ? '-' : onlinePIF_MTD}</td>
              </tr>
              <tr>
                <td className="border border-black p-1">Corporate</td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold">Total</td>
                <td className="border border-black p-1 text-center font-bold">{loading ? '-' : onlineTotal_Today}</td>
                <td className="border border-black p-1 text-center font-bold">{loading ? '-' : onlineTotal_MTD}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div id="access-table" className="h-full min-h-[180px] flex flex-col justify-between">
        <div className="table-responsive h-full flex-1 flex flex-col justify-between">
          <table className="w-full border-collapse h-full flex-1">
            <thead>
              <tr className="font-bold">
                <th className="border border-black p-1 text-left" style={{ backgroundColor: "#92d050" }}>
                  Access
                </th>
                <th className="border border-black p-1 text-center" style={{ backgroundColor: "#92d050" }}>
                  Today
                </th>
                <th className="border border-black p-1 text-center" style={{ backgroundColor: "#92d050" }}>
                  MTD
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1">MTM</td>
                <td className="border border-black p-1 text-center">{loading ? '-' : accessCounts.MTM_Today}</td>
                <td className="border border-black p-1 text-center">{loading ? '-' : accessCounts.MTM_MTD}</td>
              </tr>
              <tr>
                <td className="border border-black p-1">PIF</td>
                <td className="border border-black p-1 text-center">{loading ? '-' : accessCounts.PIF_Today}</td>
                <td className="border border-black p-1 text-center">{loading ? '-' : accessCounts.PIF_MTD}</td>
              </tr>
              <tr>
                <td className="border border-black p-1">Corporate</td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold">Total</td>
                <td className="border border-black p-1 text-center font-bold">{loading ? '-' : accessCounts.Total_Today}</td>
                <td className="border border-black p-1 text-center font-bold">{loading ? '-' : accessCounts.Total_MTD}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div id="amenities-plus-table" className="h-full min-h-[180px] flex flex-col justify-between">
        <div className="table-responsive h-full flex-1 flex flex-col justify-between">
          <table className="w-full border-collapse h-full flex-1">
            <thead>
              <tr className="font-bold">
                <th className="border border-black p-1 text-left" style={{ backgroundColor: "#92d050" }}>
                  Amenities Plus
                </th>
                <th className="border border-black p-1 text-center" style={{ backgroundColor: "#92d050" }}>
                  Today
                </th>
                <th className="border border-black p-1 text-center" style={{ backgroundColor: "#92d050" }}>
                  MTD
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1">MTM</td>
                <td className="border border-black p-1 text-center">{loading ? '-' : amenitiesCounts.MTM_Today}</td>
                <td className="border border-black p-1 text-center">{loading ? '-' : amenitiesCounts.MTM_MTD}</td>
              </tr>
              <tr>
                <td className="border border-black p-1">PIF</td>
                <td className="border border-black p-1 text-center">{loading ? '-' : amenitiesCounts.PIF_Today}</td>
                <td className="border border-black p-1 text-center">{loading ? '-' : amenitiesCounts.PIF_MTD}</td>
              </tr>
              <tr>
                <td className="border border-black p-1">Corporate</td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold">Total</td>
                <td className="border border-black p-1 text-center font-bold">{loading ? '-' : amenitiesCounts.Total_Today}</td>
                <td className="border border-black p-1 text-center font-bold">{loading ? '-' : amenitiesCounts.Total_MTD}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div id="champions-training-table" className="h-full min-h-[180px] flex flex-col justify-between">
        <div className="table-responsive h-full flex-1 flex flex-col justify-between">
          <table className="w-full border-collapse h-full flex-1">
            <thead>
              <tr className="font-bold">
                <th className="border border-black p-1 text-left" style={{ backgroundColor: "#92d050" }}>
                  Champions Training
                </th>
                <th className="border border-black p-1 text-center" style={{ backgroundColor: "#92d050" }}>
                  Today
                </th>
                <th className="border border-black p-1 text-center" style={{ backgroundColor: "#92d050" }}>
                  MTD
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1">MTM</td>
                <td className="border border-black p-1 text-center">{loading ? '-' : championsCounts.MTM_Today}</td>
                <td className="border border-black p-1 text-center">{loading ? '-' : championsCounts.MTM_MTD}</td>
              </tr>
              <tr>
                <td className="border border-black p-1">PIF</td>
                <td className="border border-black p-1 text-center">{loading ? '-' : championsCounts.PIF_Today}</td>
                <td className="border border-black p-1 text-center">{loading ? '-' : championsCounts.PIF_MTD}</td>
              </tr>
              <tr>
                <td className="border border-black p-1">Corporate</td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
              </tr>
              <tr>
                <td className="border border-black p-1 font-bold">Total</td>
                <td className="border border-black p-1 text-center font-bold">{loading ? '-' : championsCounts.Total_Today}</td>
                <td className="border border-black p-1 text-center font-bold">{loading ? '-' : championsCounts.Total_MTD}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="h-full min-h-[180px] flex flex-col justify-between">
        <PTUnitsSection
          type="pt"
          feNewPTToday={feNewPT_Today}
          feNewPTMTD={feNewPT_MTD}
          beNewPTToday={beNewPT_Today}
          beNewPTMTD={beNewPT_MTD}
          beRenewPTToday={beRenewPT_Today}
          beRenewPTMTD={beRenewPT_MTD}
          ptUnitsTotalToday={ptUnitsTotal_Today}
          ptUnitsTotalMTD={ptUnitsTotal_MTD}
        />
      </div>
    </div>
  )
}
