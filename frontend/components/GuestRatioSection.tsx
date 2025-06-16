export default function GuestRatioSection() {
  return (
    <div className="mb-1">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-green-500 font-bold">
            <th className="border border-black p-1 text-center" colSpan={3}>
              Guest Ratio MTD
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-1 font-bold">Internal</td>
            <td className="border border-black p-1 font-bold">External</td>
            <td className="border border-black p-1"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 text-right">34%</td>
            <td className="border border-black p-1 text-right">66%</td>
            <td className="border border-black p-1"></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
