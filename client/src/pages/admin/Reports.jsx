import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import api from '../../api/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import {
  FileBarChart,
  Download,
  Printer,
  Calendar,
  Filter,
  FileSpreadsheet,
  FileText,
  Clock,
  Coffee,
  AlertTriangle,
  Flame,
  Loader2,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export const Reports = () => {
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'monthly' | 'late' | 'breaks' | 'overtime' | 'missing-punch' | 'location'
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [targetMonth, setTargetMonth] = useState(() => new Date().getMonth() + 1);
  const [targetYear, setTargetYear] = useState(() => new Date().getFullYear());
  const [department, setDepartment] = useState('');

  const tabs = [
    { id: 'daily', label: 'Daily Attendance', icon: Calendar },
    { id: 'monthly', label: 'Monthly Summary', icon: FileBarChart },
    { id: 'location', label: 'GPS Location Audit', icon: MapPin },
    { id: 'late', label: 'Late Coming', icon: Clock },
    { id: 'breaks', label: 'Break Details', icon: Coffee },
    { id: 'overtime', label: 'Overtime Hours', icon: Flame },
    { id: 'missing-punch', label: 'Missing Punches', icon: AlertTriangle },
  ];

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      let endpoint = `/reports/${activeTab}`;
      const params = new URLSearchParams();

      if (activeTab === 'daily') {
        params.append('date', targetDate);
      } else if (activeTab === 'monthly') {
        params.append('month', targetMonth);
        params.append('year', targetYear);
      } else {
        // Date range
        params.append('startDate', targetDate);
        params.append('endDate', targetDate);
      }

      if (department) params.append('department', department);

      const res = await api.get(`${endpoint}?${params.toString()}`);
      if (res.data.success) {
        setReportData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, targetDate, targetMonth, targetYear, department]);

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (!reportData || reportData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab.toUpperCase());
    XLSX.writeFile(workbook, `HRMS_${activeTab.toUpperCase()}_REPORT_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!reportData || reportData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `HRMS_${activeTab.toUpperCase()}_REPORT.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Attendance Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate and export daily, monthly, late arrival, break, and overtime audit sheets.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={reportData.length === 0}
            icon={FileText}
          >
            Export CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportExcel}
            disabled={reportData.length === 0}
            icon={FileSpreadsheet}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Export Excel (.xlsx)
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            icon={Printer}
          >
            Print
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 gap-1 no-print">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-brand-600 text-brand-600 bg-brand-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter toolbar */}
      <Card className="p-4 border-slate-200 no-print">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {activeTab === 'monthly' ? (
            <>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Month
                </label>
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(Number(e.target.value))}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2026, m - 1, 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Year
                </label>
                <select
                  value={targetYear}
                  onChange={(e) => setTargetYear(Number(e.target.value))}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                Report Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
              Department Filter
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Engineering"
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="self-end">
            <Button variant="secondary" size="sm" onClick={fetchReport}>
              Apply Filter
            </Button>
          </div>
        </div>
      </Card>

      {/* Report Data Table Display */}
      <Card className="border-slate-200 overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
              <span className="text-xs font-medium">Generating report data...</span>
            </div>
          ) : reportData.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={FileBarChart}
                title="No report rows generated"
                description="There are no entries for the requested filter selection."
              />
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                  {Object.keys(reportData[0]).map((colKey) => (
                    <th key={colKey} className="py-3 px-3 capitalize">
                      {colKey.replace(/([A-Z])/g, ' $1').trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/60 transition-colors">
                    {Object.entries(row).map(([k, val], cIdx) => (
                      <td key={cIdx} className="py-3 px-3 text-slate-700">
                        {typeof val === 'string' && val.startsWith('http') ? (
                          <a
                            href={val}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-[11px] transition-colors"
                          >
                            <MapPin className="w-3 h-3 text-brand-600" />
                            <span>View on Maps</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        ) : k === 'geofenceStatus' ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              val === 'ALLOWED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : val === 'EXEMPT'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {String(val)}
                          </span>
                        ) : typeof val === 'number' ? (
                          <span className="font-mono font-semibold">
                            {k.toLowerCase().includes('lat') || k.toLowerCase().includes('long')
                              ? val.toFixed(5)
                              : val}
                          </span>
                        ) : (
                          String(val ?? '—')
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Reports;
