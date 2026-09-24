import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Crosshair,
  ShieldCheck,
  Building,
  Home,
  Briefcase,
  Navigation,
  Compass,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

const LOCATION_TYPES = [
  { value: 'OFFICE', label: 'Office Premises', icon: Building, color: 'brand' },
  { value: 'WFH', label: 'Work From Home (WFH)', icon: Home, color: 'blue' },
  { value: 'CLIENT_SITE', label: 'Client Site', icon: Briefcase, color: 'purple' },
  { value: 'FIELD_SITE', label: 'Field Site', icon: Compass, color: 'amber' },
  { value: 'OTHER', label: 'Other Location', icon: MapPin, color: 'slate' },
];

export const Locations = () => {
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetLoc, setDeleteTargetLoc] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Assigned Employees Drawer / Modal state
  const [isAssignedModalOpen, setIsAssignedModalOpen] = useState(false);
  const [selectedLocationForEmployees, setSelectedLocationForEmployees] = useState(null);
  const [assignedEmployeesList, setAssignedEmployeesList] = useState([]);
  const [isLoadingAssigned, setIsLoadingAssigned] = useState(false);

  // Form State
  const initialForm = {
    locationName: '',
    locationType: 'OFFICE',
    address: '',
    latitude: '',
    longitude: '',
    allowedRadiusMeters: 100,
    minimumGpsAccuracyMeters: 50,
    description: '',
    status: 'ACTIVE',
  };
  const [formData, setFormData] = useState(initialForm);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Browser Geolocation Capture State
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsCaptureInfo, setGpsCaptureInfo] = useState(null);

  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/locations');
      if (res.data.success) {
        setLocations(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load locations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // Browser "Capture Current Location" action
  const handleCaptureCurrentGps = () => {
    if (!navigator.geolocation) {
      setFormError('Geolocation is not supported by your browser.');
      return;
    }

    setIsCapturingGps(true);
    setFormError(null);
    setGpsCaptureInfo(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const acc = Math.round(pos.coords.accuracy || 10);

        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        setGpsCaptureInfo(`Coordinates captured successfully (GPS accuracy: ±${acc}m).`);
        setIsCapturingGps(false);
      },
      (err) => {
        setIsCapturingGps(false);
        console.warn('GPS capture error:', err);
        let msg = 'Failed to capture GPS position.';
        if (err.code === 1) msg = 'Location permission denied. Please allow location access in your browser settings.';
        if (err.code === 2) msg = 'Location position unavailable. Please check device GPS.';
        if (err.code === 3) msg = 'Location request timed out. Please try again.';
        setFormError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Add Location Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await api.post('/locations', formData);
      if (res.data.success) {
        setIsAddModalOpen(false);
        setFormData(initialForm);
        setGpsCaptureInfo(null);
        fetchLocations();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create location.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleEditOpen = (loc) => {
    setCurrentLocation(loc);
    setFormData({
      locationName: loc.locationName,
      locationType: loc.locationType || 'OFFICE',
      address: loc.address,
      latitude: loc.latitude,
      longitude: loc.longitude,
      allowedRadiusMeters: loc.allowedRadiusMeters || 100,
      minimumGpsAccuracyMeters: loc.minimumGpsAccuracyMeters || 50,
      description: loc.description || '',
      status: loc.status || 'ACTIVE',
    });
    setFormError(null);
    setGpsCaptureInfo(null);
    setIsEditModalOpen(true);
  };

  // Edit Location Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!currentLocation) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await api.put(`/locations/${currentLocation._id}`, formData);
      if (res.data.success) {
        setIsEditModalOpen(false);
        setCurrentLocation(null);
        setGpsCaptureInfo(null);
        fetchLocations();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update location.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active / Inactive
  const handleToggleStatus = async (loc) => {
    try {
      await api.patch(`/locations/${loc._id}/toggle-status`);
      fetchLocations();
    } catch (err) {
      console.error('Failed to toggle location status:', err);
    }
  };

  // Open Delete Confirmation
  const handleOpenDelete = (loc) => {
    setDeleteTargetLoc(loc);
    setFormError(null);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTargetLoc) return;
    setIsDeleting(true);
    setFormError(null);

    try {
      const res = await api.delete(`/locations/${deleteTargetLoc._id}`);
      if (res.data.success) {
        setIsDeleteModalOpen(false);
        setDeleteTargetLoc(null);
        fetchLocations();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to delete location.');
    } finally {
      setIsDeleting(false);
    }
  };

  // View Assigned Employees
  const handleViewAssignedEmployees = async (loc) => {
    setSelectedLocationForEmployees(loc);
    setIsAssignedModalOpen(true);
    setIsLoadingAssigned(true);

    try {
      const res = await api.get(`/locations/${loc._id}/assigned-employees`);
      if (res.data.success) {
        setAssignedEmployeesList(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch assigned employees:', err);
    } finally {
      setIsLoadingAssigned(false);
    }
  };

  // Filtered Locations
  const filteredLocations = locations.filter((loc) => {
    const matchesSearch =
      !search ||
      loc.locationName.toLowerCase().includes(search.toLowerCase()) ||
      loc.address.toLowerCase().includes(search.toLowerCase());

    const matchesType = !typeFilter || loc.locationType === typeFilter;
    const matchesStatus = !statusFilter || loc.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Location & Geofence Master
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure approved company offices, client sites, WFH locations, and GPS fence boundaries.
          </p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            setFormData(initialForm);
            setFormError(null);
            setGpsCaptureInfo(null);
            setIsAddModalOpen(true);
          }}
          className="self-start sm:self-auto shadow-sm"
        >
          Add New Location
        </Button>
      </div>

      {/* Main Table Card */}
      <Card className="border-slate-200 overflow-hidden shadow-card">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by location name or address..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Location Types</option>
              {LOCATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {/* Locations Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
              <span className="text-xs font-medium">Loading geofence locations...</span>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={MapPin}
                title="No geofence locations found"
                description="No location records match your search criteria. Add your first location to get started."
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Location Name</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Address & Center</th>
                  <th className="py-3 px-3">Allowed Radius</th>
                  <th className="py-3 px-3">Min GPS Accuracy</th>
                  <th className="py-3 px-3">Assigned Staff</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLocations.map((loc) => {
                  const typeObj = LOCATION_TYPES.find((t) => t.value === loc.locationType) || LOCATION_TYPES[0];
                  const Icon = typeObj.icon;

                  return (
                    <tr key={loc._id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Location Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{loc.locationName}</div>
                            {loc.description && (
                              <div className="text-[11px] text-slate-400 truncate max-w-xs">
                                {loc.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {loc.locationType}
                        </span>
                      </td>

                      {/* Address & Coordinates */}
                      <td className="py-3 px-3 text-slate-600 max-w-xs">
                        <div className="truncate font-medium text-slate-800">{loc.address}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>
                            {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                          </span>
                          <a
                            href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-600 hover:underline flex items-center gap-0.5 ml-1"
                            title="Preview on map"
                          >
                            <span>Map</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </td>

                      {/* Allowed Radius */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                          {loc.allowedRadiusMeters} m
                        </span>
                      </td>

                      {/* Min GPS Accuracy */}
                      <td className="py-3 px-3 font-mono text-slate-600">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                          ±{loc.minimumGpsAccuracyMeters || 50} m
                        </span>
                      </td>

                      {/* Assigned Employees */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleViewAssignedEmployees(loc)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                          title="Click to view assigned employees"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{loc.assignedEmployeesCount || 0} Assigned</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            loc.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              loc.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {loc.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditOpen(loc)}
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Location & Radius"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleViewAssignedEmployees(loc)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Assigned Employees"
                          >
                            <Users className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(loc)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              loc.status === 'ACTIVE'
                                ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={loc.status === 'ACTIVE' ? 'Deactivate Location' : 'Activate Location'}
                          >
                            {loc.status === 'ACTIVE' ? (
                              <XCircle className="w-3.5 h-3.5" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDelete(loc)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Location"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Add / Create Location Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Geofence Location"
        subtitle="Specify central coordinates, allowed radius in meters, and GPS precision threshold."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {formError}
            </div>
          )}

          {gpsCaptureInfo && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-2 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{gpsCaptureInfo}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Location Name *
              </label>
              <input
                type="text"
                required
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                placeholder="e.g. Lucknow Head Office or Client Hotel ABC"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Location Type *
              </label>
              <select
                required
                value={formData.locationType}
                onChange={(e) => setFormData({ ...formData, locationType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {LOCATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Status *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Address / Premise Description *
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Hazratganj, Lucknow, UP"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* GPS Capture Action Card */}
            <div className="sm:col-span-2 p-3 bg-brand-50/70 border border-brand-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-brand-900 flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4 text-brand-600" />
                  <span>Automatic GPS Coordinate Capture</span>
                </div>
                <p className="text-[11px] text-brand-700 mt-0.5">
                  Use your device's live browser location to automatically record precise center coordinates.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={Crosshair}
                isLoading={isCapturingGps}
                onClick={handleCaptureCurrentGps}
                className="bg-white border-brand-300 text-brand-700 hover:bg-brand-100 font-bold shrink-0"
              >
                {isCapturingGps ? 'Querying GPS...' : 'Capture Current Location'}
              </Button>
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Latitude (Center Point) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                placeholder="26.846700"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Longitude (Center Point) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                placeholder="80.946200"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Allowed Radius (Meters) *
              </label>
              <input
                type="number"
                min="10"
                required
                value={formData.allowedRadiusMeters}
                onChange={(e) => setFormData({ ...formData, allowedRadiusMeters: e.target.value })}
                placeholder="100"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Office: ~100m, WFH: ~150m, Field: ~300-500m
              </span>
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Minimum GPS Accuracy (Meters) *
              </label>
              <input
                type="number"
                min="5"
                required
                value={formData.minimumGpsAccuracyMeters}
                onChange={(e) => setFormData({ ...formData, minimumGpsAccuracyMeters: e.target.value })}
                placeholder="50"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Blocks attendance if device GPS accuracy exceeds this threshold.
              </span>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Notes / Additional Details
              </label>
              <textarea
                rows="2"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional notes regarding this facility or site perimeter..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create Location Master
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Location Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit ${currentLocation?.locationName}`}
        subtitle="Update perimeter boundary coordinates, radius, or accuracy requirements."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {formError}
            </div>
          )}

          {gpsCaptureInfo && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-2 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{gpsCaptureInfo}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Location Name *
              </label>
              <input
                type="text"
                required
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Location Type *
              </label>
              <select
                required
                value={formData.locationType}
                onChange={(e) => setFormData({ ...formData, locationType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {LOCATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Status *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Address / Premise Description *
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* GPS Capture Action Card */}
            <div className="sm:col-span-2 p-3 bg-brand-50/70 border border-brand-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-brand-900 flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4 text-brand-600" />
                  <span>Update GPS Coordinates</span>
                </div>
                <p className="text-[11px] text-brand-700 mt-0.5">
                  Re-fetch current device location or edit latitude/longitude values below.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={Crosshair}
                isLoading={isCapturingGps}
                onClick={handleCaptureCurrentGps}
                className="bg-white border-brand-300 text-brand-700 hover:bg-brand-100 font-bold shrink-0"
              >
                {isCapturingGps ? 'Querying GPS...' : 'Capture Current Location'}
              </Button>
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Latitude (Center Point) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Longitude (Center Point) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Allowed Radius (Meters) *
              </label>
              <input
                type="number"
                min="10"
                required
                value={formData.allowedRadiusMeters}
                onChange={(e) => setFormData({ ...formData, allowedRadiusMeters: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Minimum GPS Accuracy (Meters) *
              </label>
              <input
                type="number"
                min="5"
                required
                value={formData.minimumGpsAccuracyMeters}
                onChange={(e) => setFormData({ ...formData, minimumGpsAccuracyMeters: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Notes / Additional Details
              </label>
              <textarea
                rows="2"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assigned Employees Inspection Modal */}
      <Modal
        isOpen={isAssignedModalOpen}
        onClose={() => setIsAssignedModalOpen(false)}
        title={`Staff Assigned to ${selectedLocationForEmployees?.locationName || 'Location'}`}
        subtitle={`Location Type: ${selectedLocationForEmployees?.locationType} • Allowed Radius: ${selectedLocationForEmployees?.allowedRadiusMeters}m`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-xs">
          {isLoadingAssigned ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-brand-600 mb-2" />
              <span>Fetching assigned staff members...</span>
            </div>
          ) : assignedEmployeesList.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={Users}
                title="No employees assigned yet"
                description="Go to Employee Master to assign this location to team members."
              />
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Validity</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignedEmployeesList.map((asg) => {
                    const emp = asg.employeeId;
                    const isPermanent = !asg.validFrom && !asg.validTill;

                    return (
                      <tr key={asg._id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{emp?.fullName || 'N/A'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {emp?.employeeId} • {emp?.designation || 'Staff'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{emp?.department || '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                          {isPermanent ? (
                            <span className="text-emerald-700 font-semibold">Permanent</span>
                          ) : (
                            <span>
                              {asg.validFrom ? formatDate(asg.validFrom) : 'Open'} to{' '}
                              {asg.validTill ? formatDate(asg.validTill) : 'Open'}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              asg.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {asg.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <Button variant="secondary" onClick={() => setIsAssignedModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Location Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        title="Delete Location Master"
        subtitle="Verify safety before permanently removing this location."
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              {formError}
            </div>
          )}

          <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-900">
                Are you sure you want to permanently delete this location?
              </p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Location <strong className="text-slate-900">{deleteTargetLoc?.locationName}</strong> will be removed. If employees are currently assigned to this location or if past attendance events reference it, deletion will be blocked to maintain data integrity.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              disabled={isDeleting}
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="button"
              isLoading={isDeleting}
              onClick={handleConfirmDelete}
            >
              Yes, Delete Location
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Locations;
