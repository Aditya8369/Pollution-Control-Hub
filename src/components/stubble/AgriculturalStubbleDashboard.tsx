import React, { useState } from 'react';
import { AgriculturalStubbleServiceHandler } from '../../services/AgriculturalStubbleService';
import { ThermalFireSpotReading, BioDecomposerDispatchRecord, StubbleFilterOptions } from '../../services/AgriculturalStubbleModel';
import { StubbleFireSpotCardTile } from '../../components/stubble/StubbleFireSpotCardTile';
import { BioDecomposerDispatchList } from '../../components/stubble/BioDecomposerDispatchList';
import { Flame, Satellite, Search, Filter, PlusCircle, Sprout, Wind, X, CheckCircle2 } from 'lucide-react';

export default function AgriculturalStubbleDashboard() {
  const [spots, setSpots] = useState<ThermalFireSpotReading[]>(() =>
    AgriculturalStubbleServiceHandler.fetchFireSpots()
  );
  const [dispatches, setDispatches] = useState<BioDecomposerDispatchRecord[]>(() =>
    AgriculturalStubbleServiceHandler.fetchDecomposerDispatches()
  );

  const [filters, setFilters] = useState<StubbleFilterOptions>({
    cropType: 'All',
    incidentSeverity: 'All',
    searchQuery: '',
  });

  const [selectedSpot, setSelectedSpot] = useState<ThermalFireSpotReading | null>(null);
  const [unitsCount, setUnitsCount] = useState<number>(8);
  const [incentiveUsd, setIncentiveUsd] = useState<number>(3200);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Form State
  const [newDistrict, setNewDistrict] = useState<string>('Ludhiana Agrarian Zone');
  const [newState, setNewState] = useState<string>('Punjab Agrarian Belt');
  const [newCrop, setNewCrop] = useState<'Paddy Rice' | 'Wheat Stubble' | 'Sugarcane Trash' | 'Cotton Residue'>('Paddy Rice');
  const [newFireCount, setNewFireCount] = useState<number>(65);
  const [newAcres, setNewAcres] = useState<number>(420);
  const [newPlume, setNewPlume] = useState<'North-West ➔ South-East' | 'West ➔ East' | 'South-West ➔ North-East'>('North-West ➔ South-East');
  const [newPm25, setNewPm25] = useState<number>(110);
  const [newSource, setNewSource] = useState<'MODIS / VIIRS' | 'Sentinel-3 SLSTR' | 'INSAT-3DR Thermal'>('MODIS / VIIRS');

  const applyFilterChanges = (updated: Partial<StubbleFilterOptions>) => {
    const next = { ...filters, ...updated };
    setFilters(next);
    setSpots(AgriculturalStubbleServiceHandler.fetchFireSpots(next));
  };

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpot) return;

    AgriculturalStubbleServiceHandler.dispatchBioDecomposerMachines(
      selectedSpot.id,
      unitsCount,
      incentiveUsd
    );
    setDispatches(AgriculturalStubbleServiceHandler.fetchDecomposerDispatches());
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setSelectedSpot(null);
    }, 1800);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    AgriculturalStubbleServiceHandler.registerThermalFireSpot({
      districtName: newDistrict,
      stateRegion: newState,
      cropType: newCrop,
      fireSpotCount: newFireCount,
      estimatedAcresAffected: newAcres,
      plumeDirectionVector: newPlume,
      pm25SpikeContribution: newPm25,
      satelliteSource: newSource,
      lastDetectedTimestamp: 'Just now',
    });

    setSpots(AgriculturalStubbleServiceHandler.fetchFireSpots(filters));
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-orange-950 via-slate-900 to-amber-950 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-orange-500/20 backdrop-blur-md border border-orange-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-orange-200">
              <Satellite className="w-4 h-4 text-orange-300" />
              Satellite Crop Residue Fire Spot & Stubble Smoke Trajectory Radar
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Agricultural Crop Residue Burning Telemetry Suite
            </h1>
            <p className="text-orange-200 text-base sm:text-lg leading-relaxed">
              Track satellite thermal anomaly fire spots (MODIS/Sentinel), smoke plume direction vectors, regional PM2.5 spike contributions, and dispatch bio-decomposer fleets.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-orange-50 transition-all flex items-center gap-2 text-sm"
              >
                <PlusCircle className="w-5 h-5 text-orange-600" />
                Register Thermal Fire Spot Anomaly
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
              placeholder="Search by district name or state region (e.g. Sangrur, Punjab)..."
              value={filters.searchQuery}
              onChange={(e) => applyFilterChanges({ searchQuery: e.target.value })}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm text-gray-900"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={filters.cropType}
              onChange={(e) => applyFilterChanges({ cropType: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 font-medium bg-white"
            >
              <option value="All">All Crop Types</option>
              <option value="Paddy Rice">Paddy Rice</option>
              <option value="Wheat Stubble">Wheat Stubble</option>
              <option value="Sugarcane Trash">Sugarcane Trash</option>
            </select>
          </div>
        </div>

        {/* Thermal Spots Grid */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-600" />
            Satellite Thermal Fire Spots ({spots.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spots.map((s) => (
              <StubbleFireSpotCardTile key={s.id} spot={s} onSelect={(selected) => setSelectedSpot(selected)} />
            ))}
          </div>
        </div>

        {/* Bio Decomposer Dispatches List */}
        <BioDecomposerDispatchList dispatches={dispatches} />

        {/* Dispatch Modal */}
        {selectedSpot && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
              <button
                onClick={() => setSelectedSpot(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              {isSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                  <h3 className="text-2xl font-bold text-gray-900">Decomposer Machinery Dispatched!</h3>
                  <p className="text-sm text-gray-600">
                    {unitsCount} units allocated to {selectedSpot.districtName} with ${incentiveUsd.toLocaleString()} subsidy.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleDispatchSubmit} className="space-y-4 text-xs">
                  <div>
                    <h3 className="font-bold text-gray-900 text-xl">{selectedSpot.districtName} Fire Cluster</h3>
                    <p className="text-xs text-orange-600 font-semibold mt-0.5">
                      Crop: {selectedSpot.cropType} | Active Fire Spots: {selectedSpot.fireSpotCount}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Decomposer Machines Count</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={unitsCount}
                        onChange={(e) => setUnitsCount(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Farmer Subsidy Incentive ($)</label>
                      <input
                        type="number"
                        required
                        min={500}
                        value={incentiveUsd}
                        onChange={(e) => setIncentiveUsd(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                  >
                    Dispatch Decomposer Fleet & Release Subsidy
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
                <h3 className="text-2xl font-bold text-gray-900">Register Satellite Thermal Fire Spot</h3>
                <p className="text-xs text-gray-500">Configure fire spot counts and plume trajectory telemetry.</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">District Name</label>
                  <input
                    type="text"
                    required
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Crop Type</label>
                    <select
                      value={newCrop}
                      onChange={(e) => setNewCrop(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                    >
                      <option value="Paddy Rice">Paddy Rice</option>
                      <option value="Wheat Stubble">Wheat Stubble</option>
                      <option value="Sugarcane Trash">Sugarcane Trash</option>
                      <option value="Cotton Residue">Cotton Residue</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">State / Region</label>
                    <input
                      type="text"
                      required
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Fire Spots</label>
                    <input
                      type="number"
                      required
                      value={newFireCount}
                      onChange={(e) => setNewFireCount(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Acres</label>
                    <input
                      type="number"
                      required
                      value={newAcres}
                      onChange={(e) => setNewAcres(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">PM2.5 Spike</label>
                    <input
                      type="number"
                      required
                      value={newPm25}
                      onChange={(e) => setNewPm25(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm"
                >
                  Register Satellite Fire Spot Node
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
