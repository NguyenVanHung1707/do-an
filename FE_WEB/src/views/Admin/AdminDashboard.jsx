import React, { useState, useEffect } from 'react';
import { getTrafficMetrics, getPerformanceMetrics } from '../../services/api';
import Card from '../../components/Common/Card';
import { 
  Users, 
  Activity, 
  Clock, 
  AlertCircle, 
  Server, 
  Cpu, 
  Database,
  Calendar,
  RefreshCw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import BarChart from '../../components/Charts/BarChart';

export default function AdminDashboard() {
  const [trafficPeriod, setTrafficPeriod] = useState('day');
  const [trafficData, setTrafficData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboardData = async (period = trafficPeriod, showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [traffic, perf] = await Promise.all([
        getTrafficMetrics(period),
        getPerformanceMetrics()
      ]);
      setTrafficData(traffic);
      setPerformanceData(perf);
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu thống kê hệ thống.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(trafficPeriod);
    
    // Auto refresh metrics every 15 seconds
    const interval = setInterval(() => {
      fetchDashboardData(trafficPeriod, true);
    }, 15000);

    return () => clearInterval(interval);
  }, [trafficPeriod]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <RefreshCw className="w-10 h-10 text-primary animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Đang thu thập dữ liệu hiệu năng hệ thống...</p>
      </div>
    );
  }

  if (error && !trafficData) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl max-w-2xl mx-auto my-8 flex flex-col items-center gap-4">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <div className="text-center">
          <h3 className="font-bold text-lg">Đã xảy ra lỗi tải dữ liệu</h3>
          <p className="text-sm mt-1">{error}</p>
        </div>
        <button 
          onClick={() => fetchDashboardData(trafficPeriod)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition"
        >
          Thử lại ngay
        </button>
      </div>
    );
  }

  // Parse chart data for BarChart component
  const chartData = trafficData?.chart?.map(item => ({
    label: item.label,
    value: item.value
  })) || [];

  const maxChartValue = chartData.length > 0 
    ? Math.max(...chartData.map(d => d.value)) * 1.15 
    : 100;

  return (
    <div className="space-y-6 pb-12">
      {/* Header section with real-time indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">System Analytics & Health</h1>
          <p className="text-sm text-slate-500 mt-1">Giám sát real-time lưu lượng truy cập và tài nguyên cụm container Docker</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200/50">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Real-time Active
          </div>
          
          <button 
            onClick={() => fetchDashboardData(trafficPeriod, true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 rounded-xl text-sm font-medium transition"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <span>{error} - Đang hiển thị dữ liệu lưu trong bộ nhớ đệm.</span>
        </div>
      )}

      {/* Grid: 4 Core Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Đang Online</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{performanceData?.activeUsersOnline || 0}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Số lượng thiết bị kết nối</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex items-center gap-4">
          <div className="p-3.5 bg-violet-50 text-violet-600 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Response Time</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{performanceData?.averageResponseTimeMs || 0} ms</h3>
            <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">Phản hồi trung bình ổn định</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex items-center gap-4">
          <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tỷ lệ lỗi (API)</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{performanceData?.errorRatePercent || 0}%</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Ngưỡng an toàn tuyệt đối</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hiệu suất RAM</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{performanceData?.ramUsagePercent || 0}%</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Dung lượng bộ nhớ đã cấp</p>
          </div>
        </div>
      </div>

      {/* Main Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Traffic analysis */}
        <div className="lg:col-span-7">
          <Card 
            title="Thống kê lưu lượng truy cập" 
            subtitle="Số lượt tải trang và yêu cầu xử lý từ Client"
            action={
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {['day', 'week', 'month'].map(p => (
                  <button
                    key={p}
                    onClick={() => setTrafficPeriod(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize ${
                      trafficPeriod === p 
                        ? 'bg-white text-primary shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {p === 'day' ? 'Hôm nay' : p === 'week' ? 'Tuần' : 'Tháng'}
                  </button>
                ))}
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-xs font-bold text-slate-400 uppercase">Tổng số User truy cập</span>
                <p className="text-xl font-extrabold text-slate-800 mt-1">{trafficData?.totalVisitors?.toLocaleString() || 0}</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-xs font-bold text-slate-400 uppercase">Tổng Requests</span>
                <p className="text-xl font-extrabold text-slate-800 mt-1">{trafficData?.totalRequests?.toLocaleString() || 0}</p>
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="pt-4">
                <BarChart 
                  data={chartData} 
                  yLabel="Lượt truy cập" 
                  maxVal={maxChartValue} 
                  suffix="" 
                />
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400">
                Không có dữ liệu biểu đồ
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Containers & Microservices status */}
        <div className="lg:col-span-5 space-y-6">
          <Card title="Trạng thái hệ thống" subtitle="Cụm Docker Containers trên VPS Production">
            <div className="space-y-4">
              {performanceData?.containerStatus?.map((container, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/50 transition duration-150"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-200/50 text-slate-600 rounded-lg">
                      {container.name.includes('db') ? (
                        <Database className="w-4 h-4 text-cyan-600" />
                      ) : container.name.includes('backend') ? (
                        <Server className="w-4 h-4 text-primary" />
                      ) : (
                        <Cpu className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 font-mono">{container.name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] text-slate-400">CPU: <strong className="text-slate-600 font-semibold">{container.cpu}</strong></span>
                        <span className="text-[10px] text-slate-400">RAM: <strong className="text-slate-600 font-semibold">{container.ram}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {container.status}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
