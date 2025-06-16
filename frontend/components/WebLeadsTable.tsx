export default function WebLeadsTable() {
  return (
    <div id="web-leads-table" className="mb-4 border border-gray-300">
      <div className="table-responsive">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 p-1 text-left" style={{ backgroundColor: "#00b050" }}>
                Web Leads & TIs
              </th>
              <th className="border border-gray-300 p-1 text-center" style={{ backgroundColor: "#00b050" }}>
                Today
              </th>
              <th className="border border-gray-300 p-1 text-center" style={{ backgroundColor: "#00b050" }}>
                MTD
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-1">Web Leads</td>
              <td className="border border-gray-300 p-1 text-center">8</td>
              <td className="border border-gray-300 p-1 text-center">472</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-1">Web Lead Shows</td>
              <td className="border border-gray-300 p-1 text-center">11</td>
              <td className="border border-gray-300 p-1 text-center">210</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-1 font-bold">Web Leads Show %</td>
              <td className="border border-gray-300 p-1 text-center font-bold">138%</td>
              <td className="border border-gray-300 p-1 text-center font-bold">44%</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-1">TI</td>
              <td className="border border-gray-300 p-1 text-center"></td>
              <td className="border border-gray-300 p-1 text-center">29</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-1">TI Shows</td>
              <td className="border border-gray-300 p-1 text-center"></td>
              <td className="border border-gray-300 p-1 text-center">13</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-1 font-bold">TI Show %</td>
              <td className="border border-gray-300 p-1 text-center font-bold">0%</td>
              <td className="border border-gray-300 p-1 text-center font-bold">45%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
