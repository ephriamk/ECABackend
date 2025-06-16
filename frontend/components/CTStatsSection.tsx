export default function CTStatsSection() {
  return (
    <div id="ct-stats-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
      <div id="ct-beg-members">
        <div className="border-b-2 border-black p-1 font-bold" style={{ backgroundColor: "#bfbfbf" }}>
          CT Beg Members #
        </div>
        <div className="border border-black p-1 text-right font-bold">440</div>
      </div>
      <div id="ct-dues">
        <div className="border-b-2 border-black p-1 font-bold" style={{ backgroundColor: "#bfbfbf" }}>
          CT Dues
        </div>
        <div className="border border-black p-1 text-right font-bold">($39,804)</div>
      </div>
      <div id="ct-cancel-dwgrd-num">
        <div className="border-b-2 border-black p-1 font-bold" style={{ backgroundColor: "#bfbfbf" }}>
          CT Cancel & Dwgrd #
        </div>
        <div className="border border-black p-1 text-right font-bold">(25)</div>
      </div>
      <div id="ct-num-attrition">
        <div className="border-b-2 border-black p-1 font-bold" style={{ backgroundColor: "#bfbfbf" }}>
          CT # Attrition
        </div>
        <div className="border border-black p-1 text-right font-bold">-5.7%</div>
      </div>
      <div id="ct-cancel-dwngrd-eft">
        <div className="border-b-2 border-black p-1 font-bold" style={{ backgroundColor: "#bfbfbf" }}>
          CT Cancel & Dwngrd EFT
        </div>
        <div className="border border-black p-1 text-right font-bold">($3,290)</div>
      </div>
      <div id="ct-eft-attrition">
        <div className="border-b-2 border-black p-1 font-bold" style={{ backgroundColor: "#bfbfbf" }}>
          CT EFT Attrition
        </div>
        <div className="border border-black p-1 text-right font-bold">-8.3%</div>
      </div>
    </div>
  )
}
