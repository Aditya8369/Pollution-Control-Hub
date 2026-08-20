import React, { useState } from 'react';
import { LandfillMethaneServiceHandler } from '../../services/LandfillMethaneService';
import { LandfillSectorReading, BiogasRecoveryDispatchRecord, LandfillFilterOptions } from '../../services/LandfillMethaneModel';
import { LandfillSectorCardTile } from '../../components/landfill/LandfillSectorCardTile';
import { BiogasRecoveryDispatchList } from '../../components/landfill/BiogasRecoveryDispatchList';
import { Flame, Activity, Search, Filter, PlusCircle, Biohazard, ShieldAlert, X, CheckCircle2 } from 'lucide-react';

export default function MunicipalLandfillMethaneDashboard() {
  const [sectors, setSectors] = useState<LandfillSectorReading[]>(() =>
    LandfillMethaneServiceHandler.fetchLandfillSectors()
  );
  const [dispatches, setDispatches] = useState<BiogasRecoveryDispatchRecord[]>(() =>
    LandfillMethaneServiceHandler.fetchBiogasRecoveryDispatches()
  );

  const [filters, setFilters] = useState<LandfillFilterOptions>({
    wasteCategory: 'All',
    hazardLevel: 'All',
    searchQuery: '',
  });

  const [selectedSector, setSelectedSector] = useState<LandfillSectorReading | null>(null);
  const [actionType, setActionType] = useState<'Cap & Flare Ignition' | 'Leachate Extraction Pump' | 'Bio-Cover Application' | 'Methane Extraction Vacuum'>('Methane Extraction Vacuum');
  const [units, setUnits] = useState<number>(3);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Form State
  const [newSite, setNewSite] = useState<string>('Bandhwari Municipal Landfill');
  const [newWasteCat, setNewWasteCat] = useState<'Organic Municipal Waste' | 'Mixed Construction Debris' | 'Industrial Sludge' | 'Segregated E-Waste'>('Organic Municipal Waste');
  const [newSectorId, setNewSectorId] = useState<string>('SEC-BND-SOUTH');
  const [newCh4, setNewCh4] = useState<number>(950);
  const [newTemp, setNewTemp] = useState<number>(52.0);
  const [newPh, setNewPh] = useState<number>(5.0);
  const [newStatus, setNewStatus] = useState<'Active Capture Engine' | 'Venting Flaring' | 'Uncontrolled Leakage'>('Uncontrolled Leakage');

  const applyFilterChanges = (updated: Partial<LandfillFilterOptions>) => {
    const next = { ...filters, ...updated };
    setFilters(next);
    setSectors(LandfillMethaneServiceHandler.fetchLandfillSectors(next));
  };

  const handleTreatmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSector) return;

    LandfillMethaneServiceHandler.dispatchLandfillTreatment(
      selectedSector.sectorZoneId,
      actionType,
      units
    );
    setDispatches(LandfillMethaneServiceHandler.fetchBiogasRecoveryDispatches());
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setSelectedSector(null);
    }, 1800);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    LandfillMethaneServiceHandler.registerNewLandfillSector({
      landfillSiteName: newSite,
      wasteTypeCategory: newWasteCat,
      sectorZoneId: newSectorId,
      methaneCh4Ppm: newCh4,
      surfaceTempCelsius: newTemp,
      leachatePercolationPh: newPh,
      biogasRecoveryStatus: newStatus,
      lastSurveyedTimestamp: 'Just now',
    });

    setSectors(LandfillMethaneServiceHandler.fetchLandfillSectors(filters));
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-green-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-200">
              <Biohazard className="w-4 h-4 text-emerald-300" />
              Municipal Solid Waste & Landfill Methane (CH4) Telemetry Radar
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Municipal Waste & Landfill Methane Telemetry Suite
            </h1>
            <p className="text-emerald-200 text-base sm:text-lg leading-relaxed">
              Monitor landfill methane gas (CH4) PPM flux, subsurface fire risks, leachate pH percolation, and deploy automated biogas recovery extraction units.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-emerald-50 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-5 h-5 text-emerald-600" />
                Register Landfill Sector Sensor Node
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
              placeholder="Search by landfill site name or sector ID (e.g. Ghazipur, SEC-GZ-NORTH)..."
              value={filters.searchQuery}
              onChange={(e) => applyFilterChanges({ searchQuery: e.target.value })}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm text-gray-900"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={filters.wasteCategory}
              onChange={(e) => applyFilterChanges({ wasteCategory: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 font-medium bg-white"
            >
              <option value="All">All Waste Categories</option>
              <option value="Organic Municipal Waste">Organic Municipal Waste</option>
              <option value="Mixed Construction Debris">Mixed Construction Debris</option>
              <option value="Industrial Sludge">Industrial Sludge</option>
            </select>
          </div>
        </div>

        {/* Landfill Sectors Grid */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
            <Flame className="w-6 h-6 text-emerald-600" />
            Monitored Landfill Sectors ({sectors.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sectors.map((s) => (
              <LandfillSectorCardTile key={s.id} sector={s} onSelect={(selected) => setSelectedSector(selected)} />
            ))}
          </div>
        </div>

        {/* Biogas Dispatches List */}
        <BiogasRecoveryDispatchList dispatches={dispatches} />

        {/* Treatment Modal */}
        {selectedSector && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
              <button
                onClick={() => setSelectedSector(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              {isSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                  <h3 className="text-2xl font-bold text-gray-900">Treatment Unit Dispatched!</h3>
                  <p className="text-sm text-gray-600">
                    {units} units of {actionType} deployed to {selectedSector.landfillSiteName}.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleTreatmentSubmit} className="space-y-4 text-xs">
                  <div>
                    <h3 className="font-bold text-gray-900 text-xl">{selectedSector.landfillSiteName}</h3>
                    <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                      Sector: {selectedSector.sectorZoneId} | CH4 Methane: {selectedSector.methaneCh4Ppm} PPM
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Treatment Action</label>
                      <select
                        value={actionType}
                        onChange={(e) => setActionType(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
                      >
                        <option value="Methane Extraction Vacuum">Methane Extraction Vacuum</option>
                        <option value="Cap & Flare Ignition">Cap & Flare Ignition</option>
                        <option value="Leachate Extraction Pump">Leachate Extraction Pump</option>
                        <option value="Bio-Cover Application">Bio-Cover Application</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Equipment Units</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={units}
                        onChange={(e) => setUnits(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                  >
                    Deploy Landfill Treatment Fleet
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Register Modal */}
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
                <h3 className="text-2xl font-bold text-gray-900">Register Landfill Sector</h3>
                <p className="text-xs text-gray-500">Configure methane gas sensors and leachate monitoring.</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Landfill Site Name</label>
                  <input
                    type="text"
                    required
                    value={newSite}
                    onChange={(e) => setNewSite(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Waste Category</label>
                    <select
                      value={newWasteCat}
                      onChange={(e) => setNewWasteCat(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                    >
                      <option value="Organic Municipal Waste">Organic Municipal Waste</option>
                      <option value="Mixed Construction Debris">Mixed Construction Debris</option>
                      <option value="Industrial Sludge">Industrial Sludge</option>
                      <option value="Segregated E-Waste">Segregated E-Waste</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Sector Zone ID</label>
                    <input
                      type="text"
                      required
                      value={newSectorId}
                      onChange={(e) => setNewSectorId(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Methane (PPM)</label>
                    <input
                      type="number"
                      required
                      value={newCh4}
                      onChange={(e) => setNewCh4(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Surface Temp (°C)</label>
                    <input
                      type="number"
                      required
                      value={newTemp}
                      onChange={(e) => setNewTemp(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Leachate pH</label>
                    <input
                      type="number"
                      required
                      step="0.1"
                      value={newPh}
                      onChange={(e) => setNewPh(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                >
                  Register Landfill Sector Node
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
