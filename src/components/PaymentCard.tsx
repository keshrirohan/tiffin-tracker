"use client";

import { IPayment } from "@/types";
import { formatDateShort, formatCurrency } from "@/lib/utils";

interface PaymentCardProps { payment: IPayment; onEdit: (payment: IPayment) => void; onDelete: (id: string) => void; }

export default function PaymentCard({ payment, onEdit, onDelete }: PaymentCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xl font-bold text-green-700 dark:text-green-400">{formatCurrency(payment.amount)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{formatDateShort(payment.date)}</p>
          {payment.note && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 italic">&quot;{payment.note}&quot;</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => onEdit(payment)}
            className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors" aria-label="Edit">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={() => onDelete(payment._id)}
            className="p-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors" aria-label="Delete">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
