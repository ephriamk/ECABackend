interface PTUnitsSectionProps {
  type: "membership" | "pt" | "salty"
  onlinePercent?: string
  accessPercent?: string
  amenitiesPercent?: string
  championsPercent?: string
  feNewPTToday?: number
  feNewPTMTD?: number
  beNewPTToday?: number
  beNewPTMTD?: number
  beRenewPTToday?: number
  beRenewPTMTD?: number
  ptUnitsTotalToday?: number
  ptUnitsTotalMTD?: number
}

export default function PTUnitsSection({ type, onlinePercent, accessPercent, amenitiesPercent, championsPercent, feNewPTToday, feNewPTMTD, beNewPTToday, beNewPTMTD, beRenewPTToday, beRenewPTMTD, ptUnitsTotalToday, ptUnitsTotalMTD }: PTUnitsSectionProps) {
  if (type === "membership") {
    return (
      <div id="membership-mix-section">
        <div className="border-b-2 border-black p-1 text-center font-bold" style={{ backgroundColor: "#92d050" }}>
          Membership Mix
        </div>
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="border border-black p-1">Online</td>
              <td className="border border-black p-1 text-right">{onlinePercent ?? '-'}</td>
            </tr>
            <tr>
              <td className="border border-black p-1">Access</td>
              <td className="border border-black p-1 text-right">{accessPercent ?? '-'}</td>
            </tr>
            <tr>
              <td className="border border-black p-1">Amenities Plus</td>
              <td className="border border-black p-1 text-right">{amenitiesPercent ?? '-'}</td>
            </tr>
            <tr>
              <td className="border border-black p-1">Champions Training</td>
              <td className="border border-black p-1 text-right">{championsPercent ?? '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  if (type === "salty") {
    return (
      <div id="salty-promo-section">
        <div className="border-b-2 border-black p-1 text-center font-bold" style={{ backgroundColor: "#92d050" }}>
          SALTY Promo
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-black p-1 text-left">Today</th>
              <th className="border border-black p-1 text-center">MTD</th>
              <th className="border border-black p-1 text-center">APRIL</th>
              <th className="border border-black p-1 text-center">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1">Member Referrals</td>
              <td className="border border-black p-1 text-center">-</td>
              <td className="border border-black p-1 text-center">10</td>
              <td className="border border-black p-1 text-center">27</td>
              <td className="border border-black p-1 text-center">37</td>
            </tr>
            <tr>
              <td className="border border-black p-1">Staff GP Returns</td>
              <td className="border border-black p-1 text-center">2</td>
              <td className="border border-black p-1 text-center">39</td>
              <td className="border border-black p-1 text-center">76</td>
              <td className="border border-black p-1 text-center">115</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div id="pt-units-section">
      <div className="border-b-2 border-black p-1 text-center font-bold" style={{ backgroundColor: "#92d050" }}>
        PT Units
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border border-black p-1 text-left" colSpan={2}></th>
            <th className="border border-black p-1 text-center">Today</th>
            <th className="border border-black p-1 text-center">MTD</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-1" colSpan={2}>
              Front End New PT
            </td>
            <td className="border border-black p-1 text-center">{feNewPTToday ?? '-'}</td>
            <td className="border border-black p-1 text-center">{feNewPTMTD ?? '-'}</td>
          </tr>
          <tr>
            <td className="border border-black p-1" colSpan={2}>
              Backend New PT
            </td>
            <td className="border border-black p-1 text-center">{beNewPTToday ?? '-'}</td>
            <td className="border border-black p-1 text-center">{beNewPTMTD ?? '-'}</td>
          </tr>
          <tr>
            <td className="border border-black p-1" colSpan={2}>
              Backend Renew PT
            </td>
            <td className="border border-black p-1 text-center">{beRenewPTToday ?? '-'}</td>
            <td className="border border-black p-1 text-center">{beRenewPTMTD ?? '-'}</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-bold" colSpan={2}>
              Total
            </td>
            <td className="border border-black p-1 text-center font-bold">{ptUnitsTotalToday ?? '-'}</td>
            <td className="border border-black p-1 text-center font-bold">{ptUnitsTotalMTD ?? '-'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
