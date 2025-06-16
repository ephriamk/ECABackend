export default function HeaderSection() {
  return (
    <div id="report-header" className="mb-4 border border-gray-300">
      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <td className="border border-gray-300 p-2 text-center font-bold text-xl" style={{ width: "50%" }}>
              Columbia City - Stock Report
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
                  <tr>
                    <td className="border border-gray-300 p-1 text-center">Report Date:</td>
                    <td className="border border-gray-300 p-1 text-center">2/1/2025</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
