import ProductionResults1v2 from "@/components/ProductionResults1v2"
import ProductionResults2v2 from "@/components/ProductionResults2v2"
import PersonalTrainingV2 from "@/components/PersonalTrainingV2"
import PageNavigation from "@/components/PageNavigation"

export default function Stats2Page() {
  return (
    <div className="min-h-screen bg-white p-4 font-sans text-xs">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-4 border border-gray-300">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2 text-center font-bold text-xl" style={{ width: "50%" }}>
                  Individual Production & PT Stats (API v2)
                </td>
                <td className="p-0" style={{ width: "50%" }}>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 p-1 text-center" style={{ width: "50%" }}>
                          Business Date:
                        </td>
                        <td className="border border-gray-300 p-1 text-center" style={{ width: "50%" }}>
                          1/31/2025
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <ProductionResults1v2 />
        <ProductionResults2v2 />
        <PersonalTrainingV2 />

        <PageNavigation currentPage="stats2" />
      </div>
    </div>
  )
} 