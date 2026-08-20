import React, { useState } from 'react';
import { MarineWaterServiceHandler } from '../../services/MarineWaterService';
import { MarineBuoyNodeReading, CleanupDroneDispatchRecord, MarineFilterOptions } from '../../services/MarineWaterModel';
import { MarineBuoyCardTile } from '../../components/marine/MarineBuoyCardTile';
import { CleanupDroneDispatchList } from '../../components/marine/CleanupDroneDispatchList';
import { Waves, Droplets, Search, Filter, PlusCircle, Navigation, ShieldAlert, X, CheckCircle2 } from 'lucide-react';

export default function CoastalMarineWaterDashboard() {
  const [buoys, setBuoys] = useState<MarineBuoyNodeReading[]>(() =>
    MarineWaterServiceHandler.fetchBuoyNodes()
  );
  const [dispatches, setDispatches] = useState<CleanupDroneDispatchRecord[]>(() =>
    MarineWaterServiceHandler.fetchCleanupDroneDispatches()
  );

  const [filters, setFilters] = useState<MarineFilterOptions>({
    waterCategory: 'All',
    bathingSafetyStatus: 'All',
    searchQuery: '',
  });

  const [selectedBuoy, setSelectedBuoy] = useState<MarineBuoyNodeReading | null>(null);
  const [droneType, setDroneType] = useState<'Surface Skimmer' | 'Deep Sample Autonomous Submersible' | 'Oil Dispersant Spray Unit'>('Surface Skimmer');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Form State
  const [newZone, setNewZone] = useState<string>('Goa Baga Coastal Beach');
  const [newCategory, setNewCategory] = useState<'Port Estuary' | 'Coral Reef Sanctuary' | 'Public Bathing Beach' | 'Offshore Shipping Lane'>('Public Bathing Beach');
  const [newBuoyId, setNewBuoyId] = useState<string>('BUOY-GOA-02');
  const [newDo, setNewDo] = useState<number>(6.5);
  const [newPh, setNewPh] = useState<number>(8.0);
  const [newPlastics, setNewPlastics] = useState<number>(14.2);
  const [newMetals, setNewMetals] = useState<number>(5.5);
  const [newOil, setNewOil] = useState<boolean>(false);

  const applyFilterChanges = (updated: Partial<MarineFilterOptions>) => {
    const next = { ...filters, ...updated };
    setFilters(next);
    setBuoys(MarineWaterServiceHandler.fetchBuoyNodes(next));
  };

  const handleDroneDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuoy) return;

    MarineWaterServiceHandler.dispatchAutonomousCleanupFleet(
      selectedBuoy.buoyNodeId,
      droneType
    );
    setDispatches(MarineWaterServiceHandler.fetchCleanupDroneDispatches());
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setSelectedBuoy(null);
    }, 1800);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    MarineWaterServiceHandler.registerNewBuoyNode({
      coastalZoneName: newZone,
      waterCategory: newCategory,
      buoyNodeId: newBuoyId,
      dissolvedOxygenMgL: newDo,
      phLevel: newPh,
      microplasticsPpm: newPlastics,
      heavyMetalIndexPpb: newMetals,
      oilSlickDetected: newOil,
      turbidityNtu: 5.2,
      lastSampledTimestamp: 'Just now',
    });

    setBuoys(MarineWaterServiceHandler.fetchBuoyNodes(filters));
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-cyan-500/20 backdrop-blur-md border border-cyan-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-cyan-200">
              <Waves className="w-4 h-4 text-cyan-300" />
              Coastal & Marine Ecosystem Water Quality Telemetry
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Coastal & Marine Water Quality Telemetry Suite
            </h1>
            <p className="text-cyan-200 text-base sm:text-lg leading-relaxed">
              Track dissolved oxygen (DO), microplastics PPM, heavy metal indicators, oil slicks, bathing safety levels, and deploy autonomous skimmer drones.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-cyan-50 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-5 h-5 text-cyan-600" />
                Register Marine Buoy Sensor Node
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
              placeholder="Search by coastal zone or buoy ID (e.g. Marina Bay, BUOY-JNPT)..."
              value={filters.searchQuery}
              onChange={(e) => applyFilterChanges({ searchQuery: e.target.value })}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-sm text-gray-900"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={filters.waterCategory}
              onChange={(e) => applyFilterChanges({ waterCategory: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 font-medium bg-white"
            >
              <option value="All">All Water Categories</option>
              <option value="Public Bathing Beach">Public Bathing Beach</option>
              <option value="Port Estuary">Port Estuary</option>
              <option value="Coral Reef Sanctuary">Coral Reef Sanctuary</option>
            </select>
          </div>
        </div>

        {/* Marine Buoys Grid */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
            <Droplets className="w-6 h-6 text-cyan-600" />
            Monitored Marine Buoys ({buoys.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {buoys.map((b) => (
              <MarineBuoyCardTile key={b.id} buoy={b} onSelect={(selected) => setSelectedBuoy(selected)} />
            ))}
          </div>
        </div>

        {/* Drone Dispatches List */}
        <CleanupDroneDispatchList dispatches={dispatches} />

        {/* Drone Dispatch Modal */}
        {selectedBuoy && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
              <button
                onClick={() => setSelectedBuoy(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              {isSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                  <h3 className="text-2xl font-bold text-gray-900">Marine Drone Dispatched!</h3>
                  <p className="text-sm text-gray-600">
                    {droneType} mission launched for {selectedBuoy.coastalZoneName}.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleDroneDispatchSubmit} className="space-y-4 text-xs">
                  <div>
                    <h3 className="font-bold text-gray-900 text-xl">{selectedBuoy.coastalZoneName}</h3>
                    <p className="text-xs text-cyan-700 font-semibold mt-0.5">
                      Buoy: {selectedBuoy.buoyNodeId} | Bathing Status: {selectedBuoy.bathingSafetyStatus}
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Select Drone Mission Type</label>
                    <select
                      value={droneType}
                      onChange={(e) => setDroneType(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
                    >
                      <option value="Surface Skimmer">Surface Skimmer (Plastic Removal)</option>
                      <option value="Oil Dispersant Spray Unit">Oil Dispersant Spray Unit</option>
                      <option value="Deep Sample Autonomous Submersible">Deep Sample Autonomous Submersible</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                  >
                    Launch Autonomous Marine Mission
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Register Buoy Modal */}
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
                <h3 className="text-2xl font-bold text-gray-900">Register Marine Buoy Node</h3>
                <p className="text-xs text-gray-500">Configure water quality sensors and buoy identifiers.</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Coastal Zone Name</label>
                  <input
                    type="text"
                    required
                    value={newZone}
                    onChange={(e) => setNewZone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Water Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                    >
                      <option value="Public Bathing Beach">Public Bathing Beach</option>
                      <option value="Port Estuary">Port Estuary</option>
                      <option value="Coral Reef Sanctuary">Coral Reef Sanctuary</option>
                      <option value="Offshore Shipping Lane">Offshore Shipping Lane</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Buoy ID</label>
                    <input
                      type="text"
                      required
                      value={newBuoyId}
                      onChange={(e) => setNewBuoyId(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Dissolved O2</label>
                    <input
                      type="number"
                      required
                      step="0.1"
                      value={newDo}
                      onChange={(e) => setNewDo(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Microplastics</label>
                    <input
                      type="number"
                      required
                      value={newPlastics}
                      onChange={(e) => setNewPlastics(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Metals (PPB)</label>
                    <input
                      type="number"
                      required
                      value={newMetals}
                      onChange={(e) => setNewMetals(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                >
                  Register Buoy Node
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
