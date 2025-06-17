'use client';
import React, { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'

interface Payment {
  paymentType: string
  paymentAmount: string
  paymentTax: string
  location: string
}

interface Item {
  itemId: string
  name: string
  profitCenter: string
  unitPrice: string
  quantity: string
  subtotal: string
  tax: string
  payments: Payment[]
}

interface Transaction {
  transactionId: string
  transactionTimestamp: string
  memberId: string
  memberName?: string
  homeClub: string
  employeeId: string
  receiptNumber: string
  stationName: string
  return: boolean
  items: Item[]
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [monthFilter, setMonthFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('')

  useEffect(() => {
    let url = 'http://localhost:8000/api/transactions';
    if (dateFilter) {
      url += `?date=${dateFilter}`;
    }
    fetch(url)
      .then(res => res.json())
      .then(setTransactions)
  }, [dateFilter])

  // Get unique months from transactions
  const months = Array.from(new Set(transactions.map(tx => tx.transactionTimestamp.slice(0, 7))));
  months.sort().reverse();

  // Filter transactions by selected month
  const filteredTransactions = monthFilter === 'all'
    ? transactions
    : transactions.filter(tx => tx.transactionTimestamp.startsWith(monthFilter));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">API Transactions</h1>
      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="dateFilter" className="font-medium">Filter by Day:</label>
          <input
            id="dateFilter"
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="monthFilter" className="font-medium">Filter by Month:</label>
          <select
            id="monthFilter"
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="all">All</option>
            {months.map(month => (
              <option key={month} value={month}>
                {format(parseISO(month + '-01'), 'MMMM yyyy')}
              </option>
            ))}
          </select>
        </div>
      </div>
      <table className="w-full border text-xs">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Transaction ID</th>
            <th className="border p-2">Timestamp</th>
            <th className="border p-2">Member ID</th>
            <th className="border p-2">Member Name</th>
            <th className="border p-2">Club</th>
            <th className="border p-2">Employee</th>
            <th className="border p-2">Receipt</th>
            <th className="border p-2">Station</th>
            <th className="border p-2">Return</th>
            <th className="border p-2">Details</th>
          </tr>
        </thead>
        <tbody>
          {filteredTransactions.map(tx => (
            <React.Fragment key={tx.transactionId}>
              <tr className="hover:bg-gray-50">
                <td className="border p-2">{tx.transactionId}</td>
                <td className="border p-2">{format(parseISO(tx.transactionTimestamp), 'yyyy-MM-dd HH:mm')}</td>
                <td className="border p-2">{tx.memberId}</td>
                <td className="border p-2">{tx.memberName}</td>
                <td className="border p-2">{tx.homeClub}</td>
                <td className="border p-2">{tx.employeeId}</td>
                <td className="border p-2">{tx.receiptNumber}</td>
                <td className="border p-2">{tx.stationName}</td>
                <td className="border p-2">{tx.return ? 'Yes' : 'No'}</td>
                <td className="border p-2 text-center">
                  <button
                    className="text-blue-600 underline"
                    onClick={() => setExpanded(expanded === tx.transactionId ? null : tx.transactionId)}
                  >
                    {expanded === tx.transactionId ? 'Hide' : 'View'}
                  </button>
                </td>
              </tr>
              {expanded === tx.transactionId && (
                <tr>
                  <td colSpan={9} className="border p-2 bg-gray-50">
                    <div>
                      <h2 className="font-semibold mb-2">Items</h2>
                      <table className="w-full border mb-2">
                        <thead>
                          <tr className="bg-gray-200">
                            <th className="border p-1">Item ID</th>
                            <th className="border p-1">Name</th>
                            <th className="border p-1">Profit Center</th>
                            <th className="border p-1">Unit Price</th>
                            <th className="border p-1">Quantity</th>
                            <th className="border p-1">Subtotal</th>
                            <th className="border p-1">Tax</th>
                            <th className="border p-1">Total</th>
                            <th className="border p-1">Payments</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            let items: Item[] = [];
                            if (Array.isArray(tx.items)) {
                              items = tx.items as Item[];
                            } else if (tx.items && typeof tx.items === 'object' && Array.isArray((tx.items as any).item)) {
                              items = (tx.items as any).item as Item[];
                            }
                            return items.map((item: Item) => (
                              <tr key={item.itemId}>
                                <td className="border p-1">{item.itemId}</td>
                                <td className="border p-1">{item.name}</td>
                                <td className="border p-1">{item.profitCenter}</td>
                                <td className="border p-1">{item.unitPrice}</td>
                                <td className="border p-1">{item.quantity}</td>
                                <td className="border p-1">{item.subtotal}</td>
                                <td className="border p-1">{item.tax}</td>
                                <td className="border p-1">{(Number(item.subtotal) + Number(item.tax)).toFixed(2)}</td>
                                <td className="border p-1">
                                  <ul>
                                    {item.payments?.map((p: Payment, i: number) => (
                                      <li key={i}>
                                        {p.paymentType} - ${p.paymentAmount} (Tax: ${p.paymentTax}) @ {p.location}
                                      </li>
                                    ))}
                                  </ul>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                      {/* Transaction total */}
                      <div className="text-right font-bold mt-2">
                        Transaction Total: {(() => {
                          let items: Item[] = [];
                          if (Array.isArray(tx.items)) {
                            items = tx.items as Item[];
                          } else if (tx.items && typeof tx.items === 'object' && Array.isArray((tx.items as any).item)) {
                            items = (tx.items as any).item as Item[];
                          }
                          const total = items.reduce((sum, item) => sum + Number(item.subtotal) + Number(item.tax), 0);
                          return total.toFixed(2);
                        })()}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
} 