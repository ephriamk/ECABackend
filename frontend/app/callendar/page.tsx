import React from "react";
import ClientCalendar from "@/components/ClientCalendar";

export default function CallendarPage() {
  return (
    <div className="min-h-screen bg-white p-4 font-sans text-xs">
      <div className="mx-auto max-w-[1200px]">
        <h1 className="mb-4 text-2xl font-bold text-center">Callendar</h1>
        <div className="bg-gray-100 p-4 rounded shadow">
          <ClientCalendar />
        </div>
      </div>
    </div>
  );
} 