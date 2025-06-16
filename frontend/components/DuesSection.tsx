export default function DuesSection() {
  return (
    <div className="mb-1">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-green-500 font-bold">
            <th className="border border-black p-1 text-left" colSpan={2}>
              Dues
            </th>
            <th className="border border-black p-1 text-center">Today</th>
            <th className="border border-black p-1 text-center">MTD</th>
            <th className="border border-black p-1 text-center">Quota</th>
            <th className="border border-black p-1 text-center">Proj</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-1" colSpan={2}>
              ABC Dues
            </td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">(126,636)</td>
            <td className="border border-black p-1 text-right">(129,426)</td>
            <td className="border border-black p-1 text-right">(126,636)</td>
          </tr>
          <tr>
            <td className="border border-black p-1" colSpan={2}>
              Collections
            </td>
            <td className="border border-black p-1 text-right">(58)</td>
            <td className="border border-black p-1 text-right">(6,368)</td>
            <td className="border border-black p-1 text-right">(4,962)</td>
            <td className="border border-black p-1 text-right">(6,368)</td>
          </tr>
          <tr>
            <td className="border border-black p-1" colSpan={2}>
              PIF Renewals
            </td>
            <td className="border border-black p-1 text-right">(-)</td>
            <td className="border border-black p-1 text-right">(4,343)</td>
            <td className="border border-black p-1 text-right">(2,900)</td>
            <td className="border border-black p-1 text-right">(4,343)</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-bold" colSpan={2}>
              Total Dues
            </td>
            <td className="border border-black p-1 text-right font-bold">(58)</td>
            <td className="border border-black p-1 text-right font-bold">(137,348)</td>
            <td className="border border-black p-1 text-right font-bold">(137,288)</td>
            <td className="border border-black p-1 text-right font-bold">(137,348)</td>
          </tr>
          <tr>
            <td className="border border-black p-1" colSpan={2}>
              Coordinator Bonus
            </td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">(10,711)</td>
            <td className="border border-black p-1 text-right">(7,862)</td>
            <td className="border border-black p-1 text-right">(10,711)</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
