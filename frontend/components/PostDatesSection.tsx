export default function PostDatesSection() {
  return (
    <div id="post-dates-section" className="border border-gray-300">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border border-gray-300 p-1 text-center font-bold" style={{ backgroundColor: "#00b050" }}>
              Post Dates Remain
            </th>
          </tr>
        </thead>
      </table>
      <div className="table-responsive">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="border border-gray-300 p-1">GM</td>
              <td className="border border-gray-300 p-1 text-right"></td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-1">FD</td>
              <td className="border border-gray-300 p-1 text-right"></td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-1">Total</td>
              <td className="border border-gray-300 p-1 text-right">-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
