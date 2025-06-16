export default function CtRpTable() {
  return (
    <div id="ct-rp-table" className="mb-4 border border-gray-300">
      <div className="table-responsive">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 p-1 text-center" colSpan={2} style={{ backgroundColor: "#00b050" }}>
                CT RP
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-1 text-center">Today</td>
              <td className="border border-gray-300 p-1 text-center">MTD</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-1 text-center"></td>
              <td className="border border-gray-300 p-1 text-center">12</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
