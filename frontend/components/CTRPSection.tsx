export default function CTRPSection() {
  return (
    <div className="mb-1">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-green-500 font-bold">
            <th className="border border-black p-1 text-center" colSpan={3}>
              CT RP
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-1 font-bold">Today</td>
            <td className="border border-black p-1 font-bold">MTD</td>
            <td className="border border-black p-1"></td>
          </tr>
          <tr>
            <td className="border border-black p-1"></td>
            <td className="border border-black p-1 text-right">(12)</td>
            <td className="border border-black p-1"></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
