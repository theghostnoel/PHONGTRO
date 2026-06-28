/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search, Plus, Minus, School, DollarSign, Locate, Filter, LogIn, LogOut, Check, MapPin, Loader2 } from 'lucide-react';
import { University, SearchFilters } from '../types';

interface SearchPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  isAdminLoggedIn: boolean;
  onOpenAdminModal: () => void;
  onAdminLogout: () => void;
  filteredRoomsCount: number;
  onLocateUser: () => void;
  universities: University[];
  customAddress: string;
  onCustomAddressChange: (address: string) => void;
  isGeocoding: boolean;
  onGeocodeCustomAddress: () => void;
  geocodeError: string;
}

export default function SearchPanel({
  filters,
  onFiltersChange,
  isAdminLoggedIn,
  onOpenAdminModal,
  onAdminLogout,
  filteredRoomsCount,
  onLocateUser,
  universities,
  customAddress,
  onCustomAddressChange,
  isGeocoding,
  onGeocodeCustomAddress,
  geocodeError,
}: SearchPanelProps) {
  
  const [localSearchQuery, setLocalSearchQuery] = React.useState(filters.searchQuery);

  // Đồng bộ hóa localSearchQuery khi bộ lọc bên ngoài thay đổi (ví dụ: nhấn nút "Đặt lại bộ lọc")
  React.useEffect(() => {
    setLocalSearchQuery(filters.searchQuery);
  }, [filters.searchQuery]);

  const handleUniversityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      universityId: e.target.value,
    });
  };

  const handleRadiusChange = (amount: number) => {
    const newRadius = Math.max(200, Math.min(5000, filters.radius + amount));
    onFiltersChange({
      ...filters,
      radius: newRadius,
    });
  };

  const handlePriceChange = (field: 'minPrice' | 'maxPrice', value: number) => {
    onFiltersChange({
      ...filters,
      [field]: value,
    });
  };

  const triggerSearch = () => {
    onFiltersChange({
      ...filters,
      searchQuery: localSearchQuery,
    });
  };

  const selectedUni = universities.find(u => u.id === filters.universityId);

  return (
    <div className="flex flex-col gap-5 w-full md:w-[320px] bg-white rounded-2xl shadow-xl border border-slate-100 p-5 pointer-events-auto">
      {/* Header App */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            UniStay <span className="text-indigo-600">Hà Nội</span>
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Tìm phòng sinh viên</p>
        </div>

        {/* Quick locate badge or room count */}
        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
          {filteredRoomsCount} Phòng
        </span>
      </div>

      {/* Search Input Box */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Tìm theo từ khóa</label>
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  triggerSearch();
                }
              }}
              placeholder="Nhập tên ngõ, đường..."
              className="w-full pl-8 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl transition-all"
            />
          </div>
          <button
            type="button"
            onClick={triggerSearch}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-extrabold rounded-xl shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all cursor-pointer flex items-center justify-center shrink-0"
          >
            Tìm
          </button>
        </div>
      </div>

      {/* University Center Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-400 uppercase">Điểm trung tâm quét bán kính</label>
        <div className="relative">
          <select
            value={filters.universityId}
            onChange={handleUniversityChange}
            className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none cursor-pointer text-slate-700"
          >
            {universities.map((uni) => (
              <option key={uni.id} value={uni.id}>
                🎓 {uni.name} ({uni.shortName})
              </option>
            ))}
            <option value="custom_pin">🎯 Ghim điểm tùy ý (Kéo thả ghim)</option>
            <option value="other">📍 Khác (Nhập địa chỉ tự do)</option>
          </select>
          <div className="absolute right-3 top-3.5 text-slate-400 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>

        {filters.universityId === 'custom_pin' && (
          <p className="text-[10px] text-indigo-600 font-bold leading-tight pl-1 flex items-start gap-1 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/60 animate-fade-in">
            <span className="shrink-0 text-xs">💡</span>
            <span>Kéo thả biểu tượng mục tiêu 🎯 trên bản đồ để tự do thay đổi vùng quét phòng trọ!</span>
          </p>
        )}

        {filters.universityId !== 'other' && filters.universityId !== 'custom_pin' && selectedUni && (
          <p className="text-[10px] text-slate-500 italic leading-tight pl-1 flex items-start gap-1">
            <span className="shrink-0">📍</span>
            <span>{selectedUni.address}</span>
          </p>
        )}

        {/* Custom Address Input Panel for 'Other' option */}
        {filters.universityId === 'other' && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fade-in">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Nhập địa chỉ của bạn</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customAddress}
                onChange={(e) => onCustomAddressChange(e.target.value)}
                placeholder="Ví dụ: 259 Trần Đại Nghĩa"
                className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-lg font-semibold"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onGeocodeCustomAddress();
                  }
                }}
              />
              <button
                type="button"
                disabled={isGeocoding || !customAddress.trim()}
                onClick={onGeocodeCustomAddress}
                className="px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center cursor-pointer transition-colors disabled:opacity-50"
                title="Định vị địa chỉ này"
              >
                {isGeocoding ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <MapPin size={13} />
                )}
              </button>
            </div>
            {geocodeError && (
              <p className="text-[10px] text-rose-600 font-bold">{geocodeError}</p>
            )}
            {!geocodeError && !isGeocoding && (
              <p className="text-[9px] text-slate-400 italic">Hệ thống sử dụng bản đồ OSM để tìm tọa độ miễn phí.</p>
            )}
          </div>
        )}
      </div>

      {/* Radius Controls */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Bán kính quét (m)</label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleRadiusChange(-200)}
            disabled={filters.radius <= 200}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg flex items-center justify-center font-bold text-lg transition-colors cursor-pointer"
          >
            -
          </button>
          
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-center font-bold text-slate-700">
            {filters.radius >= 1000 ? `${(filters.radius / 1000).toFixed(1)} km` : `${filters.radius}m`}
          </div>

          <button
            onClick={() => handleRadiusChange(200)}
            disabled={filters.radius >= 5000}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg flex items-center justify-center font-bold text-lg transition-colors cursor-pointer"
          >
            +
          </button>
        </div>
      </div>

      {/* Price Range Filter */}
      <div>
        <div className="flex justify-between mb-2">
          <label className="text-xs font-bold text-slate-400 uppercase">Khoảng giá (VNĐ)</label>
          <span className="text-xs font-bold text-indigo-600">
            {filters.minPrice === 0 && filters.maxPrice === 100000000 
              ? "Tất cả" 
              : `${(filters.minPrice/1000000).toFixed(0)}Tr - ${(filters.maxPrice/1000000).toFixed(0)}Tr`}
          </span>
        </div>
        
        {/* Sleek range sliders or min/max quick boxes */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <input
              type="number"
              value={filters.minPrice}
              onChange={(e) => handlePriceChange('minPrice', Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="Min"
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl focus:outline-none text-center"
            />
          </div>
          <span className="text-slate-400 self-center text-xs">~</span>
          <div className="flex-1 relative">
            <input
              type="number"
              value={filters.maxPrice}
              onChange={(e) => handlePriceChange('maxPrice', Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="Max"
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl focus:outline-none text-center"
            />
          </div>
        </div>

        {/* Quick filter chips */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onFiltersChange({ ...filters, minPrice: 0, maxPrice: 3000000 })}
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              filters.minPrice === 0 && filters.maxPrice === 3000000
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Dưới 3Tr
          </button>
          <button
            onClick={() => onFiltersChange({ ...filters, minPrice: 3000000, maxPrice: 6000000 })}
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              filters.minPrice === 3000000 && filters.maxPrice === 6000000
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            3Tr - 6Tr
          </button>
          <button
            onClick={() => onFiltersChange({ ...filters, minPrice: 6000000, maxPrice: 15000000 })}
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              filters.minPrice === 6000000 && filters.maxPrice === 15000000
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            6Tr - 15Tr
          </button>
          <button
            onClick={() => onFiltersChange({ ...filters, minPrice: 15000000, maxPrice: 100000000 })}
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              filters.minPrice === 15000000 && filters.maxPrice === 100000000
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Trên 15Tr
          </button>
        </div>
      </div>

      {/* Locate Button & Reset Controls */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
        <button
          onClick={onLocateUser}
          className="flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2.5 rounded-xl transition-all cursor-pointer"
        >
          <Locate size={13} />
          Vị trí của tôi
        </button>

        <button
          onClick={() => onFiltersChange({
            universityId: 'neu',
            radius: 1000,
            minPrice: 0,
            maxPrice: 100000000,
            searchQuery: '',
          })}
          className="text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 px-3 py-2.5 rounded-xl transition-all cursor-pointer border border-slate-200/60"
        >
          Đặt lại bộ lọc
        </button>
      </div>
    </div>
  );
}
