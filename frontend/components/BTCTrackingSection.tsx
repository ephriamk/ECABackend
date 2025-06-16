export default function BTCTrackingSection() {
  return (
    <div>
      <div className="border-b-2 border-black bg-green-500 p-1 text-center font-bold">BTC Tracking</div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border border-black p-1 text-center" colSpan={2}>
              Units
            </th>
            <th className="border border-black p-1 text-center" colSpan={2}>
              Money
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-1" colSpan={2}>
              BTC without PT
            </td>
            <td className="border border-black p-1 text-right" colSpan={2}>
              $2,277
            </td>
          </tr>
          <tr>
            <td className="border border-black p-1">0</td>
            <td className="border border-black p-1">68</td>
            <td className="border border-black p-1">$0</td>
            <td className="border border-black p-1 text-right">$12,255</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-bold">0</td>
            <td className="border border-black p-1 font-bold">91</td>
            <td className="border border-black p-1 font-bold">$0</td>
            <td className="border border-black p-1 text-right font-bold">$14,532</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
