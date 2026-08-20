import React, { useState } from 'react';
import { MicroclimateServiceHandler } from '../../services/MicroclimateService';
import { MicroclimateZoneReading, HeatMitigationIntervention, MicroclimateFilterOptions } from '../../services/MicroclimateModel';
import { MicroclimateZoneCardTile } from '../../components/microclimate/MicroclimateZoneCardTile';
import { HeatMitigationList } from '../../components/microclimate/HeatMitigationList';
import { Sun, Thermometer, Search, Filter, PlusCircle, Trees, ShieldAlert, X, CheckCircle2 } from 'lucide-react';

export default function UrbanMicroclimateDashboard() {
  const [zones, setZones] = useState<MicroclimateZoneReading[]>(() =>
    MicroclimateServiceHandler.fetchZones()
  );
  const [interventions, setInterventions] = useState<HeatMitigationIntervention[]>(() =>
    MicroclimateServiceHandler.fetchInterventions()
  );

  const [filters, setFilters] = useState<MicroclimateFilterOptions>({
    urbanType: 'All',
    heatRiskLevel: 'All',
    searchQuery: '',
  });

  const [selectedZone, setSelectedZone] = useState<MicroclimateZoneReading | null>(null);
  const [costUsd, setCostUsd] = useState<number>(85000);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Form State
  const [newZoneName, setNewZoneName] = useState<string>('Southside Transit Terminal Hub');
  const [newUrbanType, setNewUrbanType] = useState<'Dense Commercial Core' | 'High-Density Residential' | 'Industrial Park' | 'Suburban Green Belt'>('Dense Commercial Core');
  const [newAmbient, setNewAmbient] = useState<number>(37.0);
  const [newSurface, setNewSurface] = useState<number>(46.5);
  const [newHumidity, setNewHumidity] = useState<number>(40);
  const [newCanopy, setNewCanopy] = useState<number>(10);
  const [newAlbedo, setNewAlbedo] = useState<number>(0.18);

  const applyFilterChanges = (updated: Partial<MicroclimateFilterOptions>) => {
    const next = { ...filters, ...updated };
    setFilters(next);
    setZones(MicroclimateServiceHandler.fetchZones(next));
  };

  const handleScheduleMitigation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZone) return;

    MicroclimateServiceHandler.scheduleMitigationProject(
      selectedZone.id,
      selectedZone.recommendedIntervention,
      costUsd
    );
    setInterventions(MicroclimateServiceHandler.fetchInterventions());
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setSelectedZone(null);
    }, 1800);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    MicroclimateServiceHandler.registerNewZone({
      zoneName: newZoneName,
      urbanType: newUrbanType,
      ambientTempCelsius: newAmbient,
      surfaceTempCelsius: newSurface,
      humidityPercentage: newHumidity,
      greenCanopyCoverPercentage: newCanopy,
      albedoReflectanceIndex: newAlbedo,
      recommendedIntervention: 'Cool Roof Retrofit',
    });

    setZones(MicroclimateServiceHandler.fetchZones(filters));
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-orange-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-amber-500/20 backdrop-blur-md border border-amber-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-amber-200">
              <Sun className="w-4 h-4 text-amber-300" />
              Urban Heat Island & Microclimate Telemetry Radar
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Urban Microclimate & Heat Island Mitigation Telemetry Suite
            </h1>
            <p className="text-amber-200 text-base sm:text-lg leading-relaxed">
              Track surface temperatures, urban heat island intensity deltas (+°C), albedo reflectance indices, and deploy cool-roof and urban canopy interventions.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-amber-50 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-5 h-5 text-amber-600" />
                Register Microclimate Telemetry Zone
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search zones by name or urban type (e.g. Commercial Core, Industrial)..."
              value={filters.searchQuery}
              onChange={(e) => applyFilterChanges({ searchQuery: e.target.value })}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm text-gray-900"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={filters.urbanType}
              onChange={(e) => applyFilterChanges({ urbanType: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 font-medium bg-white"
            >
              <option value="All">All Urban Densities</option>
              <option value="Dense Commercial Core">Dense Commercial Core</option>
              <option value="High-Density Residential">High-Density Residential</option>
              <option value="Industrial Park">Industrial Park</option>
            </select>
          </div>
        </div>

        {/* Microclimate Zones Grid */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
            <Thermometer className="w-6 h-6 text-amber-600" />
            Monitored Microclimate Zones ({zones.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {zones.map((z) => (
              <MicroclimateZoneCardTile key={z.id} zone={z} onSelect={(selected) => setSelectedZone(selected)} />
            ))}
          </div>
        </div>

        {/* Interventions List */}
        <HeatMitigationList interventions={interventions} />

        {/* Schedule Mitigation Modal */}
        {selectedZone && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
              <button
                onClick={() => setSelectedZone(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              {isSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                  <h3 className="text-2xl font-bold text-gray-900">Heat Mitigation Scheduled!</h3>
                  <p className="text-sm text-gray-600">
                    Project for {selectedZone.zoneName} approved with a budget of ${costUsd.toLocaleString()}.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleScheduleMitigation} className="space-y-4 text-xs">
                  <div>
                    <h3 className="font-bold text-gray-900 text-xl">{selectedZone.zoneName}</h3>
                    <p className="text-xs text-amber-600 font-semibold mt-0.5">
                      Intervention: {selectedZone.recommendedIntervention} (+{selectedZone.heatIslandIntensityDeltaC}°C Delta)
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Project Budget Allocation ($ USD)</label>
                    <input
                      type="number"
                      required
                      min={10000}
                      value={costUsd}
                      onChange={(e) => setCostUsd(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                  >
                    Schedule & Approve Intervention Project
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Register Zone Modal */}
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
                <h3 className="text-2xl font-bold text-gray-900">Register Microclimate Zone</h3>
                <p className="text-xs text-gray-500">Configure urban density and surface temperature sensors.</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Zone Name</label>
                  <input
                    type="text"
                    required
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Urban Type</label>
                    <select
                      value={newUrbanType}
                      onChange={(e) => setNewUrbanType(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                    >
                      <option value="Dense Commercial Core">Dense Commercial Core</option>
                      <option value="High-Density Residential">High-Density Residential</option>
                      <option value="Industrial Park">Industrial Park</option>
                      <option value="Suburban Green Belt">Suburban Green Belt</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Ambient Temp (°C)</label>
                    <input
                      type="number"
                      required
                      value={newAmbient}
                      onChange={(e) => setNewAmbient(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Surface Temp (°C)</label>
                    <input
                      type="number"
                      required
                      value={newSurface}
                      onChange={(e) => setNewSurface(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Canopy %</label>
                    <input
                      type="number"
                      required
                      value={newCanopy}
                      onChange={(e) => setNewCanopy(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Albedo Index</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={newAlbedo}
                      onChange={(e) => setNewAlbedo(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                >
                  Register Microclimate Zone
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
