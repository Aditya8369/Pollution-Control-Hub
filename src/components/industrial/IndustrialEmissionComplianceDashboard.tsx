import React, { useState } from 'react';
import { IndustrialEmissionServiceHandler } from '../../services/IndustrialEmissionService';
import { IndustrialStackReading, EmissionViolationAlert, IndustrialFilterOptions } from '../../services/IndustrialEmissionModel';
import { IndustrialStackCardTile } from '../../components/industrial/IndustrialStackCardTile';
import { EmissionViolationAlertList } from '../../components/industrial/EmissionViolationAlertList';
import { Factory, ShieldAlert, Search, Filter, PlusCircle, Flame, Gauge, X, CheckCircle2 } from 'lucide-react';

export default function IndustrialEmissionComplianceDashboard() {
  const [stacks, setStacks] = useState<IndustrialStackReading[]>(() =>
    IndustrialEmissionServiceHandler.fetchStacks()
  );
  const [alerts, setAlerts] = useState<EmissionViolationAlert[]>(() =>
    IndustrialEmissionServiceHandler.fetchViolationAlerts()
  );

  const [filters, setFilters] = useState<IndustrialFilterOptions>({
    industryCategory: 'All',
    regulatoryStatus: 'All',
    searchQuery: '',
  });

  const [selectedStack, setSelectedStack] = useState<IndustrialStackReading | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Form State
  const [newFacility, setNewFacility] = useState<string>('Singrauli Super Thermal Station');
  const [newCategory, setNewCategory] = useState<'Thermal Power' | 'Petrochemical Refinery' | 'Cement Manufacturing' | 'Steel & Metallurgy'>('Thermal Power');
  const [newStackId, setNewStackId] = useState<string>('STK-BETA-02');
  const [newRegion, setNewRegion] = useState<string>('Singrauli Complex');
  const [newSo2, setNewSo2] = useState<number>(140);
  const [newNox, setNewNox] = useState<number>(210);
  const [newCo2, setNewCo2] = useState<number>(9.5);
  const [newPm, setNewPm] = useState<number>(35);
  const [newTemp, setNewTemp] = useState<number>(175);
  const [newFlow, setNewFlow] = useState<number>(510000);

  const applyFilterChanges = (updated: Partial<IndustrialFilterOptions>) => {
    const next = { ...filters, ...updated };
    setFilters(next);
    setStacks(IndustrialEmissionServiceHandler.fetchStacks(next));
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    IndustrialEmissionServiceHandler.acknowledgeViolationMitigation(alertId);
    setAlerts(IndustrialEmissionServiceHandler.fetchViolationAlerts());
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    IndustrialEmissionServiceHandler.registerNewStack({
      facilityName: newFacility,
      industryCategory: newCategory,
      stackId: newStackId,
      locationRegion: newRegion,
      so2Ppm: newSo2,
      noxPpm: newNox,
      co2Percentage: newCo2,
      pmMgM3: newPm,
      exhaustTempCelsius: newTemp,
      flowRateM3Hr: newFlow,
      lastCalibrated: 'Just now',
    });

    setStacks(IndustrialEmissionServiceHandler.fetchStacks(filters));
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-red-500/20 backdrop-blur-md border border-red-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-red-200">
              <Factory className="w-4 h-4 text-red-300" />
              Industrial Stack Telemetry & Environmental Compliance Surveillance
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Industrial Emission Compliance & Flare Stack Telemetry Suite
            </h1>
            <p className="text-slate-200 text-base sm:text-lg leading-relaxed">
              Monitor real-time flue gas emissions (SO2, NOx, CO2, PM), track compliance scorecards across manufacturing complexes, and automate regulatory violation alerts.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-slate-100 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-5 h-5 text-red-600" />
                Register Industrial Stack Sensor Node
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by facility name, stack ID, or location region..."
              value={filters.searchQuery}
              onChange={(e) => applyFilterChanges({ searchQuery: e.target.value })}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500/20 text-sm text-gray-900"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={filters.industryCategory}
              onChange={(e) => applyFilterChanges({ industryCategory: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 font-medium bg-white"
            >
              <option value="All">All Industry Categories</option>
              <option value="Thermal Power">Thermal Power</option>
              <option value="Petrochemical Refinery">Petrochemical Refinery</option>
              <option value="Cement Manufacturing">Cement Manufacturing</option>
            </select>
          </div>
        </div>

        {/* Stacks Grid */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
            <Flame className="w-6 h-6 text-red-600" />
            Monitored Industrial Flue Stacks ({stacks.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stacks.map((s) => (
              <IndustrialStackCardTile key={s.id} stack={s} onSelect={(selected) => setSelectedStack(selected)} />
            ))}
          </div>
        </div>

        {/* Violation Alerts List */}
        <EmissionViolationAlertList alerts={alerts} onAcknowledge={handleAcknowledgeAlert} />

        {/* Stack Detail Modal */}
        {selectedStack && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-4">
              <button
                onClick={() => setSelectedStack(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold text-gray-900">{selectedStack.facilityName} Flue Stack Report</h3>
              <div className="p-4 bg-gray-50 rounded-2xl space-y-2 text-xs font-mono">
                <div>Stack Node ID: <strong>{selectedStack.stackId}</strong></div>
                <div>Category: <strong>{selectedStack.industryCategory}</strong></div>
                <div>Location Region: <strong>{selectedStack.locationRegion}</strong></div>
                <div>Exhaust Temperature: <strong>{selectedStack.exhaustTempCelsius}°C</strong></div>
                <div>Volumetric Flow Rate: <strong>{selectedStack.flowRateM3Hr.toLocaleString()} m³/hr</strong></div>
                <div>Compliance Scorecard: <strong className="text-emerald-600">{selectedStack.complianceScore} / 100</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* Register Stack Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <h3 className="text-2xl font-bold text-gray-900">Register Stack Telemetry Node</h3>
                <p className="text-xs text-gray-500">Configure stack sensor thresholds and industrial category.</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Facility Name</label>
                  <input
                    type="text"
                    required
                    value={newFacility}
                    onChange={(e) => setNewFacility(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Industry Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                    >
                      <option value="Thermal Power">Thermal Power</option>
                      <option value="Petrochemical Refinery">Petrochemical Refinery</option>
                      <option value="Cement Manufacturing">Cement Manufacturing</option>
                      <option value="Steel & Metallurgy">Steel & Metallurgy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Stack ID</label>
                    <input
                      type="text"
                      required
                      value={newStackId}
                      onChange={(e) => setNewStackId(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">SO2 (PPM)</label>
                    <input
                      type="number"
                      required
                      value={newSo2}
                      onChange={(e) => setNewSo2(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">NOx (PPM)</label>
                    <input
                      type="number"
                      required
                      value={newNox}
                      onChange={(e) => setNewNox(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">PM (mg/m³)</label>
                    <input
                      type="number"
                      required
                      value={newPm}
                      onChange={(e) => setNewPm(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                >
                  Register Stack Sensor Node
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
