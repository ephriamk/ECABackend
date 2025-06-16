export default function GuestRatioTable() {
  return (
    <div id="guest-ratio-mtd" className="mb-4 border border-gray-300">
      <div className="table-responsive">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 p-1 text-center" colSpan={2} style={{ backgroundColor: "#00b050" }}>
                Guest Ratio MTD
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-1 text-center">Internal</td>
              <td className="border border-gray-300 p-1 text-center">External</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-1 text-center">34%</td>
              <td className="border border-gray-300 p-1 text-center">66%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
