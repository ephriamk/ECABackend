import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PageNavigationProps {
  currentPage: "home" | "stats" | "stats2"
}

export default function PageNavigation({ currentPage }: PageNavigationProps) {
  return (
    <div className="mt-8 mb-4 flex justify-center items-center gap-4">
      <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
        {(currentPage === "stats" || currentPage === "stats2") && (
          <Link href="/" className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 transition-colors">
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span>Stock Report</span>
          </Link>
        )}

        {currentPage === "home" && (
          <Link href="/stats" className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 transition-colors">
            <span>Production Stats</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        )}
      </div>

      <div className="flex gap-2">
        <Link
          href="/"
          className={`w-8 h-8 flex items-center justify-center rounded-full border ${
            currentPage === "home"
              ? "bg-blue-500 text-white border-blue-500"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
          }`}
        >
          1
        </Link>
        <Link
          href="/stats"
          className={`w-8 h-8 flex items-center justify-center rounded-full border ${
            currentPage === "stats"
              ? "bg-blue-500 text-white border-blue-500"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
          }`}
        >
          2
        </Link>
        <Link
          href="/stats2"
          className={`w-8 h-8 flex items-center justify-center rounded-full border ${
            currentPage === "stats2"
              ? "bg-blue-500 text-white border-blue-500"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
          }`}
        >
          3
        </Link>
      </div>
    </div>
  )
}
