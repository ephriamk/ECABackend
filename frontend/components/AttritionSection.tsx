export default function AttritionSection() {
  return (
    <div id="attrition-table" className="mt-1 mb-1">
      <div className="border-b-2 border-black p-1 font-bold" style={{ backgroundColor: "#bfbfbf" }}>
        Attrition
      </div>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="border border-black p-1 text-left font-bold">Attrition</th>
            <th className="border border-black p-1 text-center font-bold">Jan</th>
            <th className="border border-black p-1 text-center font-bold">Feb</th>
            <th className="border border-black p-1 text-center font-bold">Mar</th>
            <th className="border border-black p-1 text-center font-bold">Apr</th>
            <th className="border border-black p-1 text-center font-bold">May</th>
            <th className="border border-black p-1 text-center font-bold">June</th>
            <th className="border border-black p-1 text-center font-bold">July</th>
            <th className="border border-black p-1 text-center font-bold">Aug</th>
            <th className="border border-black p-1 text-center font-bold">Sept</th>
            <th className="border border-black p-1 text-center font-bold">Oct</th>
            <th className="border border-black p-1 text-center font-bold">Nov</th>
            <th className="border border-black p-1 text-center font-bold">Dec</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-1">Dues</td>
            <td className="border border-black p-1 text-right">$142,659</td>
            <td className="border border-black p-1 text-right">$138,048</td>
            <td className="border border-black p-1 text-right">$151,201</td>
            <td className="border border-black p-1 text-right">$138,028</td>
            <td className="border border-black p-1 text-right">$145,708</td>
            <td className="border border-black p-1 text-right">$126,345</td>
            <td className="border border-black p-1 text-right">$136,915</td>
            <td className="border border-black p-1 text-right">$142,973</td>
            <td className="border border-black p-1 text-right">$138,603</td>
            <td className="border border-black p-1 text-right">$130,736</td>
            <td className="border border-black p-1 text-right">$133,130</td>
            <td className="border border-black p-1 text-right">$133,664</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-italic">Writeoff</td>
            <td className="border border-black p-1 text-right font-italic">-$6,845</td>
            <td className="border border-black p-1 text-right font-italic">-$8,623</td>
            <td className="border border-black p-1 text-right font-italic">-$8,427</td>
            <td className="border border-black p-1 text-right font-italic">-$7,625</td>
            <td className="border border-black p-1 text-right font-italic">-$9,103</td>
            <td className="border border-black p-1 text-right font-italic">-$6,477</td>
            <td className="border border-black p-1 text-right font-italic">-$8,064</td>
            <td className="border border-black p-1 text-right font-italic">-$5,020</td>
            <td className="border border-black p-1 text-right font-italic">-$8,972</td>
            <td className="border border-black p-1 text-right font-italic">-$11,626</td>
            <td className="border border-black p-1 text-right font-italic">-$12,711</td>
            <td className="border border-black p-1 text-right font-italic">-$8,165</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-bold">Attrition %</td>
            <td className="border border-black p-1 text-right font-bold">-4.80%</td>
            <td className="border border-black p-1 text-right font-bold">-6.25%</td>
            <td className="border border-black p-1 text-right font-bold">-5.57%</td>
            <td className="border border-black p-1 text-right font-bold">-5.52%</td>
            <td className="border border-black p-1 text-right font-bold">-6.25%</td>
            <td className="border border-black p-1 text-right font-bold">-5.13%</td>
            <td className="border border-black p-1 text-right font-bold">-5.89%</td>
            <td className="border border-black p-1 text-right font-bold">-3.51%</td>
            <td className="border border-black p-1 text-right font-bold">-6.47%</td>
            <td className="border border-black p-1 text-right font-bold">-8.89%</td>
            <td className="border border-black p-1 text-right font-bold">-9.55%</td>
            <td className="border border-black p-1 text-right font-bold">-6.11%</td>
          </tr>
          <tr>
            <td className="border border-black p-1">New EFT</td>
            <td className="border border-black p-1 text-right">$10,129</td>
            <td className="border border-black p-1 text-right">$7,623</td>
            <td className="border border-black p-1 text-right">$9,572</td>
            <td className="border border-black p-1 text-right">$9,482</td>
            <td className="border border-black p-1 text-right">$5,343</td>
            <td className="border border-black p-1 text-right">$4,800</td>
            <td className="border border-black p-1 text-right">$6,791</td>
            <td className="border border-black p-1 text-right">$7,135</td>
            <td className="border border-black p-1 text-right">$8,302</td>
            <td className="border border-black p-1 text-right">$8,900</td>
            <td className="border border-black p-1 text-right">$9,517</td>
            <td className="border border-black p-1 text-right">$7,385</td>
          </tr>
          <tr>
            <td className="border border-black p-1">Growth EFT</td>
            <td className="border border-black p-1 text-right">$3,284</td>
            <td className="border border-black p-1 text-right">-$1,000</td>
            <td className="border border-black p-1 text-right">$1,145</td>
            <td className="border border-black p-1 text-right">$1,857</td>
            <td className="border border-black p-1 text-right">-$3,760</td>
            <td className="border border-black p-1 text-right">-$1,677</td>
            <td className="border border-black p-1 text-right">-$1,273</td>
            <td className="border border-black p-1 text-right">$2,115</td>
            <td className="border border-black p-1 text-right">-$670</td>
            <td className="border border-black p-1 text-right">-$2,726</td>
            <td className="border border-black p-1 text-right">-$3,194</td>
            <td className="border border-black p-1 text-right">-$780</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
