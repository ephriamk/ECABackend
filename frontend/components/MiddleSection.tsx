"use client";

import { useEffect, useState } from "react";
import AdvertisingSection from "./AdvertisingSection";
import GuestTrafficTable from "./GuestTrafficTable";
import WebLeadsTable from "./WebLeadsTable";
import GuestRatioTable from "./GuestRatioTable";
import CtRpTable from "./CtRpTable";
import ClubTotalsTable from "./ClubTotalsTable";
import CoachesTable from "./CoachesTable";
import CcDuesSection from "./CcDuesSection";
import PostDatesSection from "./PostDatesSection";

type CombinedPromoData = {
  nb_mtd: number | null;
  nb_yesterday: number | null;
  promo_mtd: number | null;
  promo_yesterday: number | null;
};

export default function MiddleSection() {
  const [promoData, setPromoData] = useState<CombinedPromoData>({
    nb_mtd: null,
    nb_yesterday: null,
    promo_mtd: null,
    promo_yesterday: null,
  });

  const fetchPromoData = async () => {
    try {
      const [nbRes, promoRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sales/nb-promo`).then((r) => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sales/promo-only`).then((r) => r.json()),
      ]);

      console.log("✅ NB:", nbRes);
      console.log("✅ Promo:", promoRes);

      setPromoData({
        nb_mtd: nbRes.mtd ?? 0,
        nb_yesterday: nbRes.nb_yesterday ?? 0,
        promo_mtd: promoRes.mtd ?? 0,
        promo_yesterday: promoRes.promo_yesterday ?? 0,
      });
    } catch (err) {
      console.error("❌ Error fetching promo data:", err);
    }
  };

  useEffect(() => {
    fetchPromoData();
  }, []);

  const formatCurrency = (value: number | null) =>
    typeof value === "number" ? value.toLocaleString() : "--";

  return (
    <div className="mb-4 border border-gray-300 p-2">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4">
        {/* Left Column */}
        <div className="lg:col-span-4">
          <AdvertisingSection />
          <GuestTrafficTable />
          <WebLeadsTable />
          <GuestRatioTable />
          <CtRpTable />
        </div>

        {/* Right Column */}
        <div className="lg:col-span-8">
          <ClubTotalsTable
            promoData={promoData}
            formatCurrency={formatCurrency}
          />
          <CoachesTable />
          <div
            id="cc-dues-section"
            className="mb-4 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4"
          >
            <div className="md:col-span-9">
              <CcDuesSection />
            </div>
            <div className="md:col-span-3">
              <PostDatesSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
