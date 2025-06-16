import HeaderSection from "@/components/HeaderSection"
import TopSection from "@/components/TopSection"
import MiddleSection from "@/components/MiddleSection"
import AttritionSection from "@/components/AttritionSection"
import CTStatsSection from "@/components/CTStatsSection"
import MembershipSection from "@/components/MembershipSection"
import PTUnitsSection from "@/components/PTUnitsSection"
import PageNavigation from "@/components/PageNavigation"

export default function StockReport() {
  return (
    <div className="min-h-screen bg-white p-2 sm:p-4 font-sans text-xs">
      <div className="mx-auto max-w-[1200px]">
        {/* Header and Top Section */}
        <div id="header-section">
          <HeaderSection />
        </div>

        <div id="top-section">
          <TopSection />
        </div>

        {/* Middle Section */}
        <div id="middle-section">
          <MiddleSection />
        </div>

        {/* Bottom Section - Keep the existing components */}
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-12">
            {/* Membership Sections */}
            <div id="membership-section" className="overflow-x-auto">
              <MembershipSection />
            </div>

            {/* Bottom Section */}
            <div id="pt-units-section" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-12 gap-1">
              {/* PT Units */}
              {/* <div id="pt-units" className="lg:col-span-4 lg:col-start-5">
                <PTUnitsSection type="pt" />
              </div> */}
            </div>

            {/* Attrition Section */}
            <div id="attrition-section" className="table-responsive">
              <AttritionSection />
            </div>

            {/* CT Stats Section */}
            <div id="ct-stats-section" className="overflow-x-auto">
              <CTStatsSection />
            </div>

            <div id="page-navigation">
              <PageNavigation currentPage="home" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
