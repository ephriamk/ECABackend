// This is a placeholder API handler for fetching transactions. Replace with real fetch from backend when available.
import { NextResponse } from 'next/server'

export async function GET() {
  // Mocked data for development
  const transactions = [
    {
      transactionId: 'abc123',
      transactionTimestamp: '2025-06-01T12:00:00Z',
      memberId: 'member1',
      homeClub: '40059',
      employeeId: 'emp1',
      receiptNumber: '40059-1-1000',
      stationName: 'Web Service',
      return: false,
      items: [
        {
          itemId: 'item1',
          name: 'Joining Fee',
          profitCenter: 'New Business',
          unitPrice: '0.00',
          quantity: '1',
          subtotal: '0.00',
          tax: '0.00',
          payments: [
            { paymentType: 'Visa(xxxx1234)', paymentAmount: '0.00', paymentTax: '0.00', location: 'Emerald City Athletics - Columbia City' }
          ]
        }
      ]
    }
  ]
  return NextResponse.json(transactions)
} 