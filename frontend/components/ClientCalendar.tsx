"use client";

import React from "react";
import dynamic from "next/dynamic";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

const FullCalendar = dynamic(() => import("@fullcalendar/react").then((mod) => mod.default as any), { ssr: false });

export default function ClientCalendar() {
  // Example events (replace with your own or fetch from API)
  const [events, setEvents] = React.useState([
    { title: "Sample Event", date: "2024-06-01" }
  ]);

  // Example: fetch events from API (optional)
  // React.useEffect(() => {
  //   fetch("/api/events")
  //     .then(res => res.json())
  //     .then(data => setEvents(data));
  // }, []);

  // Handlers (optional)
  const handleDateClick = (arg: any) => {
    alert(`Date clicked: ${arg.dateStr}`);
  };

  const handleEventClick = (arg: any) => {
    alert(`Event: ${arg.event.title}`);
  };

  // Custom event content (optional)
  function renderEventContent(eventInfo: any) {
    return (
      <>
        <b>{eventInfo.timeText}</b> <i>{eventInfo.event.title}</i>
      </>
    );
  }

  const CalendarComponent = FullCalendar as React.ComponentType<any>;

  return (
    <CalendarComponent
      plugins={[dayGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      events={events}
      dateClick={handleDateClick}
      eventClick={handleEventClick}
      eventContent={renderEventContent}
      height="auto"
    />
  );
} 