/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Minus, School, DollarSign, Locate, Filter, LogIn, LogOut, Check, MapPin, Loader2, X, ChevronDown, GraduationCap } from 'lucide-react';
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
  onCloseMobile?: () => void;
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
  onCloseMobile,
}: SearchPanelProps) {
  
  const [localSearchQuery, setLocalSearchQuery] = React.useState(filters.searchQuery);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [uniSearchQuery, setUniSearchQuery] = React.useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Đồng bộ hóa localSearchQuery khi bộ lọc bên ngoài thay đổi (ví dụ: nhấn nút "Đặt lại bộ lọc")
  React.useEffect(() => {
    setLocalSearchQuery(filters.searchQuery);
  }, [filters.searchQuery]);

  // Đóng dropdown khi click bên ngoài
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Tự động focus vào ô tìm kiếm khi mở dropdown
  React.useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isDropdownOpen]);

  const removeAccents = (str: string) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  };

  const filteredUnis = React.useMemo(() => {
    if (!uniSearchQuery.trim()) return universities;
    const cleanQuery = removeAccents(uniSearchQuery.toLowerCase().trim());
    return [...universities].sort((a, b) => {
      const cleanNameA = removeAccents(a.name.toLowerCase());
      const cleanShortA = removeAccents(a.shortName.toLowerCase());
      const cleanNameB = removeAccents(b.name.toLowerCase());
      const cleanShortB = removeAccents(b.shortName.toLowerCase());

      const aMatchShort = cleanShortA.startsWith(cleanQuery);
      const bMatchShort = cleanShortB.startsWith(cleanQuery);
      if (aMatchShort && !bMatchShort) return -1;
      if (!aMatchShort && bMatchShort) return 1;

      const aIncludesShort = cleanShortA.includes(cleanQuery);
      const bIncludesShort = cleanShortB.includes(cleanQuery);
      if (aIncludesShort && !bIncludesShort) return -1;
      if (!aIncludesShort && bIncludesShort) return 1;

      const aMatchName = cleanNameA.includes(cleanQuery);
      const bMatchName = cleanNameB.includes(cleanQuery);
      if (aMatchName && !bMatchName) return -1;
      if (!aMatchName && bMatchName) return 1;

      return 0;
    }).filter(uni => {
      const cleanName = removeAccents(uni.name.toLowerCase());
      const cleanShortName = removeAccents(uni.shortName.toLowerCase());
      return cleanName.includes(cleanQuery) || cleanShortName.includes(cleanQuery);
    });
  }, [universities, uniSearchQuery]);

  const handleUniversitySelect = (uniId: string) => {
    onFiltersChange({
      ...filters,
      universityId: uniId,
    });
    setIsDropdownOpen(false);
    setUniSearchQuery('');
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
    <div className="flex flex-col gap-5 w-full md:w-[350px] bg-white rounded-2xl shadow-xl border border-slate-100 p-5 pointer-events-auto max-h-[calc(100vh-140px)] sm:max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
      {/* Header App */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
        <div>
          <h2 className="text-base font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            UniStay <span className="text-indigo-600">Hà Nội</span>
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Tìm phòng sinh viên</p>
        </div>

        {/* Quick locate badge or room count and Mobile Close Button */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
            {filteredRoomsCount} Phòng
          </span>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Đóng bộ lọc"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Search Input Box */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Tìm theo từ khóa</label>
        <div className="flex gap-1.5">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={14} />
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
              className="w-full pl-8 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl transition-all duration-300 focus:ring-4 focus:ring-indigo-100/50 font-medium"
            />
          </div>
          <button
            type="button"
            onClick={triggerSearch}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200 transition-all duration-300 cursor-pointer flex items-center justify-center shrink-0"
          >
            Tìm
          </button>
        </div>
      </div>

      {/* University Center Selector */}
      <div className="space-y-2" ref={dropdownRef}>
        <label className="block text-xs font-bold text-slate-400 uppercase">Điểm trung tâm quét bán kính</label>
        <div className="relative">
          {/* Main Selector Button */}
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-3 text-sm font-bold focus:border-indigo-500 focus:bg-white outline-none cursor-pointer text-slate-700 transition-all duration-300 focus:ring-4 focus:ring-indigo-100/50 flex items-center justify-between shadow-sm"
          >
            <span className="flex items-center gap-2 truncate">
              {filters.universityId === 'custom_pin' ? (
                <>🎯 Ghim điểm tùy ý (Kéo thả ghim)</>
              ) : filters.universityId === 'other' ? (
                <>📍 Khác (Nhập địa chỉ tự do)</>
              ) : selectedUni ? (
                <>🎓 {selectedUni.name} ({selectedUni.shortName})</>
              ) : (
                <>Chọn điểm trung tâm...</>
              )}
            </span>
            <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-indigo-500' : ''}`} />
          </button>

          {/* Dropdown Popover */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[1002] flex flex-col overflow-hidden max-h-[350px]"
              >
                {/* Search Input inside Dropdown */}
                <div className="p-2.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2 sticky top-0">
                  <Search size={14} className="text-slate-400 shrink-0 ml-1" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={uniSearchQuery}
                    onChange={(e) => setUniSearchQuery(e.target.value)}
                    placeholder="Tìm nhanh (ví dụ: NEU, FTU, Kinh tế...)"
                    className="w-full bg-transparent text-xs font-bold border-none outline-none text-slate-700 placeholder-slate-400"
                  />
                  {uniSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setUniSearchQuery('')}
                      className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Options List */}
                <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 max-h-[250px] scrollbar-thin scrollbar-thumb-slate-200">
                  {/* Universities list */}
                  {filteredUnis.length > 0 ? (
                    filteredUnis.map((uni) => {
                      const isSelected = filters.universityId === uni.id;
                      return (
                        <button
                          key={uni.id}
                          type="button"
                          onClick={() => handleUniversitySelect(uni.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                            isSelected 
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                              : 'text-slate-700 hover:bg-indigo-50/70 hover:text-indigo-600'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <GraduationCap size={14} className={isSelected ? 'text-white' : 'text-slate-400'} />
                            <span className="truncate text-left">{uni.name} ({uni.shortName})</span>
                          </span>
                          {isSelected && <Check size={14} className="text-white shrink-0 ml-2" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs italic">
                      Không tìm thấy trường nào khớp...
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t border-slate-150 my-1"></div>

                  {/* Custom Pin option */}
                  <button
                    type="button"
                    onClick={() => handleUniversitySelect('custom_pin')}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      filters.universityId === 'custom_pin'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                        : 'text-slate-700 hover:bg-indigo-50/70 hover:text-indigo-600'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-xs">🎯</span>
                      <span>Ghim điểm tùy ý (Kéo thả ghim)</span>
                    </span>
                    {filters.universityId === 'custom_pin' && <Check size={14} className="text-white shrink-0 ml-2" />}
                  </button>

                  {/* Custom Address option */}
                  <button
                    type="button"
                    onClick={() => handleUniversitySelect('other')}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      filters.universityId === 'other'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                        : 'text-slate-700 hover:bg-indigo-50/70 hover:text-indigo-600'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-xs">📍</span>
                      <span>Khác (Nhập địa chỉ tự do)</span>
                    </span>
                    {filters.universityId === 'other' && <Check size={14} className="text-white shrink-0 ml-2" />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {filters.universityId === 'custom_pin' && (
            <motion.p 
              key="custom_pin"
              initial={{ height: 0, opacity: 0, scale: 0.95 }}
              animate={{ height: 'auto', opacity: 1, scale: 1 }}
              exit={{ height: 0, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="text-[10px] text-indigo-600 font-bold leading-tight pl-1 flex items-start gap-1 bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100/60 overflow-hidden"
            >
              <span className="shrink-0 text-xs">💡</span>
              <span>Kéo thả biểu tượng mục tiêu 🎯 trên bản đồ để tự do thay đổi vùng quét phòng trọ!</span>
            </motion.p>
          )}

          {filters.universityId !== 'other' && filters.universityId !== 'custom_pin' && selectedUni && (
            <motion.p 
              key="uni_address"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[10px] text-slate-500 italic leading-tight pl-1.5 flex items-start gap-1"
            >
              <span className="shrink-0 text-[11px]">📍</span>
              <span>{selectedUni.address}</span>
            </motion.p>
          )}

          {/* Custom Address Input Panel for 'Other' option */}
          {filters.universityId === 'other' && (
            <motion.div 
              key="custom_address"
              initial={{ height: 0, opacity: 0, scale: 0.95 }}
              animate={{ height: 'auto', opacity: 1, scale: 1 }}
              exit={{ height: 0, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="p-3 bg-indigo-50/40 border border-indigo-100/50 rounded-xl space-y-2 overflow-hidden"
            >
              <label className="block text-[10px] font-extrabold text-indigo-900/60 uppercase tracking-wider">Nhập địa chỉ của bạn</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={customAddress}
                  onChange={(e) => onCustomAddressChange(e.target.value)}
                  placeholder="Ví dụ: 259 Trần Đại Nghĩa"
                  className="flex-1 px-3 py-2.5 text-xs bg-white border border-indigo-100 focus:border-indigo-500 focus:outline-none rounded-lg font-bold transition-all duration-300 focus:ring-4 focus:ring-indigo-100/50 shadow-inner"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onGeocodeCustomAddress();
                    }
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  disabled={isGeocoding || !customAddress.trim()}
                  onClick={onGeocodeCustomAddress}
                  className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center cursor-pointer transition-all duration-300 active:scale-95 disabled:opacity-40"
                  title="Định vị địa chỉ này"
                >
                  {isGeocoding ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <MapPin size={13} className="animate-pulse" />
                  )}
                </motion.button>
              </div>
              {geocodeError && (
                <p className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded border border-rose-100">{geocodeError}</p>
              )}
              {!geocodeError && !isGeocoding && (
                <p className="text-[9px] text-slate-400 italic">Hệ thống sử dụng bản đồ OSM để tìm tọa độ miễn phí.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Radius Controls */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Bán kính quét (m)</label>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleRadiusChange(-200)}
            disabled={filters.radius <= 200}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-xl flex items-center justify-center font-bold text-lg transition-all duration-300 cursor-pointer"
          >
            -
          </motion.button>
          
          <div className="flex-1 bg-indigo-50/40 border border-indigo-100 rounded-xl px-4 py-2.5 text-center font-bold text-indigo-700 font-mono tracking-tight shadow-sm">
            {filters.radius >= 1000 ? `${(filters.radius / 1000).toFixed(1)} km` : `${filters.radius}m`}
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleRadiusChange(200)}
            disabled={filters.radius >= 5000}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-xl flex items-center justify-center font-bold text-lg transition-all duration-300 cursor-pointer"
          >
            +
          </motion.button>
        </div>
      </div>

      {/* Price Range Filter */}
      <div>
        <div className="flex justify-between mb-2">
          <label className="text-xs font-bold text-slate-400 uppercase">Khoảng giá (VNĐ)</label>
          <span className="text-xs font-extrabold text-indigo-600 font-mono">
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
              className="w-full px-3 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl focus:outline-none text-center transition-all duration-300 focus:ring-4 focus:ring-indigo-100/50"
            />
          </div>
          <span className="text-slate-400 self-center text-xs">~</span>
          <div className="flex-1 relative">
            <input
              type="number"
              value={filters.maxPrice}
              onChange={(e) => handlePriceChange('maxPrice', Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="Max"
              className="w-full px-3 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl focus:outline-none text-center transition-all duration-300 focus:ring-4 focus:ring-indigo-100/50"
            />
          </div>
        </div>

        {/* Quick filter chips */}
        <div className="flex flex-wrap gap-1.5">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onFiltersChange({ ...filters, minPrice: 0, maxPrice: 3000000 })}
            className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-2 rounded-xl transition-all duration-300 cursor-pointer ${
              filters.minPrice === 0 && filters.maxPrice === 3000000
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Dưới 3Tr
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onFiltersChange({ ...filters, minPrice: 3000000, maxPrice: 6000000 })}
            className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-2 rounded-xl transition-all duration-300 cursor-pointer ${
              filters.minPrice === 3000000 && filters.maxPrice === 6000000
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            3Tr - 6Tr
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onFiltersChange({ ...filters, minPrice: 6000000, maxPrice: 15000000 })}
            className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-2 rounded-xl transition-all duration-300 cursor-pointer ${
              filters.minPrice === 6000000 && filters.maxPrice === 15000000
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            6Tr - 15Tr
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onFiltersChange({ ...filters, minPrice: 15000000, maxPrice: 100000000 })}
            className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-2 rounded-xl transition-all duration-300 cursor-pointer ${
              filters.minPrice === 15000000 && filters.maxPrice === 100000000
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Trên 15Tr
          </motion.button>
        </div>
      </div>

      {/* Locate Button & Reset Controls */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onLocateUser}
          className="flex items-center justify-center gap-1.5 text-xs font-extrabold text-indigo-600 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-3 rounded-xl transition-all duration-300 cursor-pointer hover:shadow-sm"
        >
          <Locate size={13} className="animate-pulse" />
          Vị trí của tôi
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
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
        </motion.button>
      </div>

      {/* Mobile & Desktop Apply/Collapse Button */}
      {onCloseMobile && (
        <button
          type="button"
          onClick={onCloseMobile}
          className="w-full mt-1 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-extrabold rounded-xl shadow-lg shadow-indigo-100/50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Check size={14} />
          Xác nhận bộ lọc & Xem bản đồ
        </button>
      )}
    </div>
  );
}
