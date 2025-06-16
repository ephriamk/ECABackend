export default function AttritionDataSection() {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b-2 border-black bg-gray-300 p-1.5 text-left font-bold text-sm">Attrition Data</div>

      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <td className="border border-gray-300 p-1" colSpan={2}>
              CT Canceled
            </td>
            <td className="border border-gray-300 p-1 text-right">14</td>
          </tr>
          <tr>
            <td className="border border-gray-300 p-1 text-right" colSpan={3}>
              ($1,692)
            </td>
          </tr>

          <tr>
            <td className="border border-gray-300 p-1" colSpan={2}>
              CT Expired
            </td>
            <td className="border border-gray-300 p-1 text-right">7</td>
          </tr>
          <tr>
            <td className="border border-gray-300 p-1 text-right" colSpan={3}>
              (521)
            </td>
          </tr>

          <tr>
            <td className="border border-gray-300 p-1" colSpan={2}>
              CT RFC
            </td>
            <td className="border border-gray-300 p-1 text-right">8</td>
          </tr>
          <tr>
            <td className="border border-gray-300 p-1 text-right" colSpan={3}>
              (1,008)
            </td>
          </tr>

          <tr>
            <td className="border border-gray-300 p-1" colSpan={2}>
              CT Downgrades
            </td>
            <td className="border border-gray-300 p-1 text-right">5</td>
          </tr>
          <tr>
            <td className="border border-gray-300 p-1 text-right" colSpan={3}>
              (648)
            </td>
          </tr>

          <tr>
            <td className="border border-gray-300 p-1 font-bold font-italic" colSpan={2}>
              Total CT Attrition
            </td>
            <td className="border border-gray-300 p-1 text-right font-bold font-italic">34</td>
          </tr>
          <tr>
            <td className="border border-gray-300 p-1 text-right font-bold font-italic" colSpan={3}>
              ($3,868)
            </td>
          </tr>

          <tr>
            <td className="border border-gray-300 p-1" colSpan={2}>
              All Other Canceled
            </td>
            <td className="border border-gray-300 p-1 text-right">82</td>
          </tr>
          <tr>
            <td className="border border-gray-300 p-1 text-right" colSpan={3}>
              (2,633)
            </td>
          </tr>

          <tr>
            <td className="border border-gray-300 p-1" colSpan={2}>
              All Other Expired
            </td>
            <td className="border border-gray-300 p-1 text-right">25</td>
          </tr>
          <tr>
            <td className="border border-gray-300 p-1 text-right" colSpan={3}>
              (667)
            </td>
          </tr>

          <tr>
            <td className="border border-gray-300 p-1" colSpan={2}>
              All Other RFC
            </td>
            <td className="border border-gray-300 p-1 text-right">39</td>
          </tr>
          <tr>
            <td className="border border-gray-300 p-1 text-right" colSpan={3}>
              (1,552)
            </td>
          </tr>

          <tr>
            <td className="border border-gray-300 p-1" colSpan={2}>
              All Other Downgrades
            </td>
            <td className="border border-gray-300 p-1 text-right">2</td>
          </tr>
          <tr>
            <td className="border border-gray-300 p-1 text-right" colSpan={3}>
              (25)
            </td>
          </tr>

          <tr>
            <td className="border border-gray-300 p-1 font-bold font-italic" colSpan={2}>
              Total All Other Attrition
            </td>
            <td className="border border-gray-300 p-1 text-right font-bold font-italic">148</td>
          </tr>
          <tr>
            <td className="border border-gray-300 p-1 text-right font-bold font-italic" colSpan={3}>
              ($4,876)
            </td>
          </tr>

          <tr>
            <td className="border border-gray-300 p-1 font-bold font-italic" colSpan={2}>
              Grand Total
            </td>
            <td className="border border-gray-300 p-1 text-right font-bold font-italic">182</td>
          </tr>
          <tr>
            <td className="border border-gray-300 p-1 text-right font-bold font-italic" colSpan={3}>
              ($8,745)
            </td>
          </tr>

          <tr>
            <td className="border border-gray-300 p-1" colSpan={2}>
              New EFT
            </td>
            <td className="border border-gray-300 p-1 text-right"></td>
          </tr>
          <tr>
            <td className="border border-gray-300 p-1 text-right" colSpan={3}>
              $11,245
            </td>
          </tr>

          <tr>
            <td className="border border-gray-300 p-1 font-bold font-italic" colSpan={2}>
              Total Gain/Loss EFT
            </td>
            <td className="border border-gray-300 p-1 text-right"></td>
          </tr>
          <tr>
            <td className="border border-gray-300 p-1 text-right font-bold font-italic" colSpan={3}>
              ($2,500)
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
