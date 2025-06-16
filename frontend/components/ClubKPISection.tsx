"use client";

import { useState, useEffect } from "react";

// Type definitions
interface KPIGoal {
  id: number;
  metric_name: string;
  goal_value: number;
  created_at: string;
  updated_at: string;
}

interface GuestData {
  mtd: number;
  today: number;
}

interface VisitTypeCount {
  source: string;
  count: number;
}

interface GuestAPIResponse {
  visit_type_counts: VisitTypeCount[];
  today_counts: VisitTypeCount[];
  date_used: string;
}

interface KPIMetric {
  goal: number;
  today?: number;
  mtd: number;
}

interface KPIData {
  guests: KPIMetric;
  qualified_guests: KPIMetric;
  deals: KPIMetric;
  first_workouts: KPIMetric;
  five_star_reviews: KPIMetric;
  reprograms: KPIMetric;
  new_pt_units: KPIMetric;
  closing_percentage: Omit<KPIMetric, 'today'>;
  first_workout_show_percentage: Omit<KPIMetric, 'today'>;
  five_star_review_percentage: Omit<KPIMetric, 'today'>;
  average_eft: Omit<KPIMetric, 'today'>;
}

type KPIGoalsMap = Record<string, number>;

export default function ClubKPISection() {
  const [kpiGoals, setKpiGoals] = useState<KPIGoalsMap>({});
  const [guestData, setGuestData] = useState<GuestData>({ mtd: 0, today: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchAllData();
    
    // Set up polling to refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchAllData();
    }, 30000); // 30 seconds
    
    // Listen for KPI updates from the KPI Editor
    const handleKPIUpdate = () => {
      fetchAllData();
    };
    
    window.addEventListener('kpi-goals-updated', handleKPIUpdate);
    
    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('kpi-goals-updated', handleKPIUpdate);
    };
  }, []);

  const fetchAllData = async (): Promise<void> => {
    try {
      // Fetch KPI goals
      const goalsResponse = await fetch("https://ecabackend-3.onrender.com/api/kpi/goals");
      if (goalsResponse.ok) {
        const goalsData: KPIGoal[] = await goalsResponse.json();
        const goalsMap: KPIGoalsMap = {};
        goalsData.forEach(goal => {
          goalsMap[goal.metric_name] = goal.goal_value;
        });
        setKpiGoals(goalsMap);
      }

      // Fetch guest data from the visit-types endpoint
      const guestResponse = await fetch("https://ecabackend-3.onrender.com/api/guests/visit-types");
      if (guestResponse.ok) {
        const guestData: GuestAPIResponse = await guestResponse.json();
        
        // Calculate total guests for MTD
        const mtdTotal = guestData.visit_type_counts.reduce((sum, item) => sum + item.count, 0);
        
        // Calculate today's guests
        const todayTotal = guestData.today_counts.reduce((sum, item) => sum + item.count, 0);
        
        setGuestData({ mtd: mtdTotal, today: todayTotal });
      }

      setLoading(false);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching KPI data:", error);
      setLoading(false);
    }
  };

  // Calculate projections and percentages
  const calculateProjection = (mtdActual: number, goal: number): number => {
    // Simple projection based on days passed in month
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysPassed = today.getDate();
    const projection = (mtdActual / daysPassed) * daysInMonth;
    return Math.round(projection);
  };

  const calculatePercentage = (actual: number, goal: number): number => {
    if (!goal || goal === 0) return 0;
    return Math.round((actual / goal) * 100);
  };

  // Static data for now - you'll need to create endpoints for these
  const kpiData: KPIData = {
    guests: { 
      goal: kpiGoals.guests || 500, 
      today: guestData.today, 
      mtd: guestData.mtd 
    },
    qualified_guests: { 
      goal: kpiGoals.qualified_guests || 450, 
      today: 13, 
      mtd: 443 
    },
    deals: { 
      goal: kpiGoals.deals || 315, 
      today: 12, 
      mtd: 266 
    },
    first_workouts: { 
      goal: kpiGoals.first_workouts || 220, 
      today: 20, 
      mtd: 159 
    },
    five_star_reviews: { 
      goal: kpiGoals.five_star_reviews || 175, 
      today: 0, 
      mtd: 61 
    },
    reprograms: { 
      goal: kpiGoals.reprograms || 130, 
      today: 0, 
      mtd: 158 
    },
    new_pt_units: { 
      goal: kpiGoals.new_pt_units || 60, 
      today: 0, 
      mtd: 106 
    },
    closing_percentage: { 
      goal: kpiGoals.closing_percentage || 70, 
      mtd: 59 
    },
    first_workout_show_percentage: { 
      goal: kpiGoals.first_workout_show_percentage || 70, 
      mtd: 60 
    },
    five_star_review_percentage: { 
      goal: kpiGoals.five_star_review_percentage || 80, 
      mtd: 38 
    },
    average_eft: { 
      goal: kpiGoals.average_eft || 50, 
      mtd: 42 
    }
  };

  const formatValue = (value: number, isPercentage: boolean = false, isCurrency: boolean = false): string => {
    if (loading) return "-";
    if (isPercentage) return `${value}%`;
    if (isCurrency) return `$ ${value}`;
    return value.toString();
  };

  return (
    <div id="club-kpis" className="border border-gray-300">
      <div className="bg-gray-300 border-b border-gray-300 p-1 text-center font-bold flex justify-between items-center">
        <span className="flex-1">CLUB KPI&apos;s</span>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-gray-600">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button 
            onClick={fetchAllData}
            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={loading}
            title="Refresh KPI data"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>
      <div className="table-responsive">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 p-1 text-left">Metrics</th>
              <th className="border border-gray-300 p-1 text-center">Goal</th>
              <th className="border border-gray-300 p-1 text-center">Today</th>
              <th className="border border-gray-300 p-1 text-center">MTD Actual</th>
              <th className="border border-gray-300 p-1 text-center">Proj</th>
              <th className="border border-gray-300 p-1 text-center">Proj %</th>
            </tr>
          </thead>
          <tbody>
            {/* Guests */}
            <tr>
              <td className="border border-gray-300 p-1">Guests</td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">
                {formatValue(kpiData.guests.goal)}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(kpiData.guests.today!)}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(kpiData.guests.mtd)}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(calculateProjection(kpiData.guests.mtd, kpiData.guests.goal))}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(calculatePercentage(calculateProjection(kpiData.guests.mtd, kpiData.guests.goal), kpiData.guests.goal), true)}
              </td>
            </tr>

            {/* Qualified Guests */}
            <tr>
              <td className="border border-gray-300 p-1">Qualified Guests</td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">
                {formatValue(kpiData.qualified_guests.goal)}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(kpiData.qualified_guests.today!)}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(kpiData.qualified_guests.mtd)}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(calculateProjection(kpiData.qualified_guests.mtd, kpiData.qualified_guests.goal))}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(calculatePercentage(calculateProjection(kpiData.qualified_guests.mtd, kpiData.qualified_guests.goal), kpiData.qualified_guests.goal), true)}
              </td>
            </tr>

            {/* Deals */}
            <tr>
              <td className="border border-gray-300 p-1">Deals</td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">
                {formatValue(kpiData.deals.goal)}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(kpiData.deals.today!)}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(kpiData.deals.mtd)}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(calculateProjection(kpiData.deals.mtd, kpiData.deals.goal))}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(calculatePercentage(calculateProjection(kpiData.deals.mtd, kpiData.deals.goal), kpiData.deals.goal), true)}
              </td>
            </tr>

            {/* 1st Workouts */}
            <tr>
              <td className="border border-gray-300 p-1">1st Workouts</td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">
                {formatValue(kpiData.first_workouts.goal)}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(kpiData.first_workouts.today!)}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(kpiData.first_workouts.mtd)}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(calculateProjection(kpiData.first_workouts.mtd, kpiData.first_workouts.goal))}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(calculatePercentage(calculateProjection(kpiData.first_workouts.mtd, kpiData.first_workouts.goal), kpiData.first_workouts.goal), true)}
              </td>
            </tr>

            {/* 5-Star Reviews */}
            <tr>
              <td className="border border-gray-300 p-1">5-Star Reviews</td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">
                {formatValue(kpiData.five_star_reviews.goal)}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {kpiData.five_star_reviews.today ? formatValue(kpiData.five_star_reviews.today) : ""}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(kpiData.five_star_reviews.mtd)}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(calculateProjection(kpiData.five_star_reviews.mtd, kpiData.five_star_reviews.goal))}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(calculatePercentage(calculateProjection(kpiData.five_star_reviews.mtd, kpiData.five_star_reviews.goal), kpiData.five_star_reviews.goal), true)}
              </td>
            </tr>

            {/* Reprograms */}
            <tr>
              <td className="border border-gray-300 p-1">Reprograms</td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">
                {formatValue(kpiData.reprograms.goal)}
              </td>
              <td className="border border-gray-300 p-1 text-center">-</td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(kpiData.reprograms.mtd)}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(calculateProjection(kpiData.reprograms.mtd, kpiData.reprograms.goal))}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(calculatePercentage(calculateProjection(kpiData.reprograms.mtd, kpiData.reprograms.goal), kpiData.reprograms.goal), true)}
              </td>
            </tr>

            {/* New PT Units */}
            <tr>
              <td className="border border-gray-300 p-1">New PT Units</td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">
                {formatValue(kpiData.new_pt_units.goal)}
              </td>
              <td className="border border-gray-300 p-1 text-center">-</td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(kpiData.new_pt_units.mtd)}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(calculateProjection(kpiData.new_pt_units.mtd, kpiData.new_pt_units.goal))}
              </td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(calculatePercentage(calculateProjection(kpiData.new_pt_units.mtd, kpiData.new_pt_units.goal), kpiData.new_pt_units.goal), true)}
              </td>
            </tr>

            {/* Percentage Metrics */}
            <tr>
              <td className="border border-gray-300 p-1">Closing %</td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">
                {formatValue(kpiData.closing_percentage.goal, true)}
              </td>
              <td className="border border-gray-300 p-1 text-center"></td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(kpiData.closing_percentage.mtd, true)}
              </td>
              <td className="border border-gray-300 p-1 text-center bg-black"></td>
              <td className="border border-gray-300 p-1 text-center bg-black"></td>
            </tr>

            <tr>
              <td className="border border-gray-300 p-1">1W Show %</td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">
                {formatValue(kpiData.first_workout_show_percentage.goal, true)}
              </td>
              <td className="border border-gray-300 p-1 text-center"></td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(kpiData.first_workout_show_percentage.mtd, true)}
              </td>
              <td className="border border-gray-300 p-1 text-center bg-black"></td>
              <td className="border border-gray-300 p-1 text-center bg-black"></td>
            </tr>

            <tr>
              <td className="border border-gray-300 p-1">5-Star Review %</td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">
                {formatValue(kpiData.five_star_review_percentage.goal, true)}
              </td>
              <td className="border border-gray-300 p-1 text-center"></td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(kpiData.five_star_review_percentage.mtd, true)}
              </td>
              <td className="border border-gray-300 p-1 text-center bg-black"></td>
              <td className="border border-gray-300 p-1 text-center bg-black"></td>
            </tr>

            <tr>
              <td className="border border-gray-300 p-1">Average EFT</td>
              <td className="border border-gray-300 p-1 text-center bg-gray-300">
                {formatValue(kpiData.average_eft.goal, false, true)}
              </td>
              <td className="border border-gray-300 p-1 text-center"></td>
              <td className="border border-gray-300 p-1 text-center">
                {formatValue(kpiData.average_eft.mtd, false, true)}
              </td>
              <td className="border border-gray-300 p-1 text-center bg-black"></td>
              <td className="border border-gray-300 p-1 text-center bg-black"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Downgrade Fees Collected */}
      <div id="downgrade-fees" className="mt-2">
        <div className="bg-gray-300 border-b border-gray-300 p-1 text-center font-bold">
          Downgrade Fees Collected
        </div>
        <div className="table-responsive">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 p-1 text-center">Today</th>
                <th className="border border-gray-300 p-1 text-center">MTD</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-1 text-center"></td>
                <td className="border border-gray-300 p-1 text-center">$ 1,047</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}