"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, RefreshCw, Save, TrendingUp, Target, Calendar } from "lucide-react";

export default function KPIEditor() {
  const [kpiGoals, setKpiGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingIndividual, setSavingIndividual] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });

  // Mapping of database metric names to display names
  const metricDisplayNames = {
    guests: "Guests",
    qualified_guests: "Qualified Guests",
    deals: "Deals",
    first_workouts: "1st Workouts",
    five_star_reviews: "5-Star Reviews",
    reprograms: "Reprograms",
    new_pt_units: "New PT Units",
    closing_percentage: "Closing %",
    first_workout_show_percentage: "1W Show %",
    five_star_review_percentage: "5-Star Review %",
    average_eft: "Average EFT",
    pt_quota_new: "PT Quota (New)",
    pt_quota_renew: "PT Quota (Renew)",
    nbpromo_quota_gm: "NB/Promo Quota (GM)",
    nbpromo_quota_agm: "NB/Promo Quota (AGM)",
    fept_quota_gm: "Front End PT Quota (GM)",
    fept_quota_agm: "Front End PT Quota (AGM)",
    pt_quota_new_fd: "PT Quota New (FD)",
    pt_quota_renew_fd: "PT Quota Renew (FD)",
    pt_quota_new_wfd: "PT Quota New (WFD)",
    pt_quota_renew_wfd: "PT Quota Renew (WFD)",
    neweft_quota_gm: "New EFT Quota (GM)",
    neweft_quota_agm: "New EFT Quota (AGM)",
    collections_quota: "Collections Quota",
    pif_renewals_quota: "PIF Renewals Quota",
    abc_dues_quota: "ABC Dues Quota",
    coordinator_bonus_quota: "Coordinator Bonus Quota",
  };

  // Categorize metrics for better organization
  const getMetricCategory = (metricName) => {
    if (metricName.includes("percentage")) return "Performance Metrics";
    if (metricName.includes("quota")) return "Quotas";
    if (["guests", "qualified_guests", "deals", "first_workouts", "five_star_reviews", "reprograms", "new_pt_units"].includes(metricName)) return "Core Metrics";
    if (metricName === "average_eft") return "Financial";
    return "Other";
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Performance Metrics": return "📊";
      case "Quotas": return "🎯";
      case "Core Metrics": return "📈";
      case "Financial": return "💰";
      default: return "📌";
    }
  };

  useEffect(() => {
    fetchKPIGoals();
  }, []);

  const fetchKPIGoals = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/kpi/goals");
      if (!response.ok) throw new Error("Failed to fetch KPI goals");
      
      const data = await response.json();
      setKpiGoals(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching KPI goals:", error);
      setMessage({ type: "error", text: "Failed to load KPI goals" });
      setLoading(false);
    }
  };

  const handleGoalChange = (index, newValue) => {
    const updatedGoals = [...kpiGoals];
    updatedGoals[index] = {
      ...updatedGoals[index],
      goal_value: parseFloat(newValue) || 0
    };
    setKpiGoals(updatedGoals);
  };

  const saveIndividualGoal = async (goal, index) => {
    setSavingIndividual({ ...savingIndividual, [index]: true });
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/kpi/goals/${goal.metric_name}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ goal_value: goal.goal_value }),
      });

      if (!response.ok) throw new Error("Failed to save KPI goal");
      
      setMessage({ type: "success", text: `${metricDisplayNames[goal.metric_name]} goal updated successfully!` });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      console.error("Error saving KPI goal:", error);
      setMessage({ type: "error", text: `Failed to save ${metricDisplayNames[goal.metric_name]} goal` });
    } finally {
      setSavingIndividual({ ...savingIndividual, [index]: false });
    }
  };

  const saveAllGoals = async () => {
    setSaving(true);
    try {
      const updateData = kpiGoals.map(goal => ({
        metric_name: goal.metric_name,
        goal_value: goal.goal_value
      }));

      const response = await fetch("http://127.0.0.1:8000/api/kpi/goals/bulk-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) throw new Error("Failed to save KPI goals");
      
      setMessage({ type: "success", text: "All KPI goals updated successfully!" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      
      // Refresh data
      await fetchKPIGoals();
    } catch (error) {
      console.error("Error saving KPI goals:", error);
      setMessage({ type: "error", text: "Failed to save KPI goals" });
    } finally {
      setSaving(false);
    }
  };

  // Group goals by category
  const groupedGoals = kpiGoals.reduce((acc, goal, index) => {
    const category = getMetricCategory(goal.metric_name);
    if (!acc[category]) acc[category] = [];
    acc[category].push({ ...goal, originalIndex: index });
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-xl text-gray-700">Loading KPI goals...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl">
                <Target className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">KPI Goal Management</h1>
                <p className="text-gray-600 mt-1">Set and manage your performance targets</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchKPIGoals}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 shadow-sm hover:shadow"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reset Changes</span>
              </button>
              <button
                onClick={saveAllGoals}
                disabled={saving}
                className={`flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl ${
                  saving ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <Save className="h-4 w-4" />
                <span>{saving ? "Saving..." : "Save All Goals"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Alert Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl flex items-center space-x-3 shadow-lg transform transition-all duration-500 ${
            message.type === "success" 
              ? "bg-green-50 border border-green-200" 
              : "bg-red-50 border border-red-200"
          }`}>
            {message.type === "success" ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={message.type === "success" ? "text-green-800" : "text-red-800"}>
              {message.text}
            </span>
          </div>
        )}

        {/* KPI Categories */}
        <div className="space-y-6">
          {Object.entries(groupedGoals).map(([category, goals]) => (
            <div key={category} className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
                  <span className="text-2xl">{getCategoryIcon(category)}</span>
                  <span>{category}</span>
                  <span className="text-sm font-normal text-gray-500 ml-2">({goals.length} metrics)</span>
                </h2>
              </div>
              
              <div className="divide-y divide-gray-100">
                {goals.map((goal) => (
                  <div key={goal.id} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                      <div className="md:col-span-1">
                        <h3 className="font-medium text-gray-900 text-lg">
                          {metricDisplayNames[goal.metric_name] || goal.metric_name}
                        </h3>
                      </div>
                      
                      <div className="md:col-span-1">
                        <label className="text-sm text-gray-500 mb-1 block">Target Value</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={goal.goal_value}
                            onChange={(e) => handleGoalChange(goal.originalIndex, e.target.value)}
                            className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            step={goal.metric_name.includes("percentage") ? "0.1" : "1"}
                          />
                          <span className="absolute right-3 top-2.5 text-gray-500">
                            {goal.metric_name.includes("percentage") && "%"}
                            {goal.metric_name === "average_eft" && "$"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="md:col-span-1">
                        <label className="text-sm text-gray-500 mb-1 block">Last Updated</label>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(goal.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="md:col-span-1 flex justify-end">
                        <button
                          onClick={() => saveIndividualGoal(goal, goal.originalIndex)}
                          disabled={savingIndividual[goal.originalIndex]}
                          className={`flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all duration-200 ${
                            savingIndividual[goal.originalIndex] ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <Save className="h-4 w-4" />
                          <span>{savingIndividual[goal.originalIndex] ? "Saving..." : "Save"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">{kpiGoals.length}</div>
              <div className="text-gray-600 mt-1">Total KPIs</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">{Object.keys(groupedGoals).length}</div>
              <div className="text-gray-600 mt-1">Categories</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-indigo-600">
                {new Date().toLocaleDateString()}
              </div>
              <div className="text-gray-600 mt-1">Today's Date</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}