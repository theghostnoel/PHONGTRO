/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import MapComponent from './components/MapComponent';
import SearchPanel from './components/SearchPanel';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import RoomDetailModal from './components/RoomDetailModal';
import { Room, University, SearchFilters } from './types';
import { getDistance } from './data/rooms';
import { ShieldAlert, Info, MapPin, Filter } from 'lucide-react';
import {
  seedFirestoreIfNeeded,
  subscribeRooms,
  subscribeUniversities,
  addRoomToFirebase,
  updateRoomInFirebase,
  deleteRoomFromFirebase,
  addUniversityToFirebase
} from './lib/firebase';

export default function App() {
  // Trạng thái dữ liệu phòng trọ và trường Đại học tải động từ Server
  const [rooms, setRooms] = useState<Room[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  
  // Trạng thái bộ lọc tìm kiếm
  const [filters, setFilters] = useState<SearchFilters>({
    universityId: 'neu',
    radius: 1000, // mặc định quét bán kính 1km
    minPrice: 0,
    maxPrice: 100000000, // mặc định tối đa 100 triệu để không bỏ sót các phòng giá cao
    searchQuery: '',
  });

  // Điểm tâm quét bán kính (mặc định là NEU)
  const [scanCenter, setScanCenter] = useState<[number, number]>([21.0016, 105.8428]);

  // Trạng thái cho địa chỉ tùy chọn ("Khác")
  const [customAddress, setCustomAddress] = useState<string>('');
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [geocodeError, setGeocodeError] = useState<string>('');

  // Trạng thái xác thực Admin
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('hanoi_admin_logged_in') === 'true';
  });
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);

  // Trạng thái lựa chọn bản đồ (giản lược) và xem chi tiết (modal)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [detailedRoom, setDetailedRoom] = useState<Room | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([21.0016, 105.8428]); // Mặc định là NEU
  const [mapZoom, setMapZoom] = useState<number>(15);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 640;
    }
    return true;
  });

  // Hàm tải dữ liệu đồng bộ từ server API (Làm dự phòng nếu Firestore không khả dụng)
  const fetchAllData = useCallback(async () => {
    try {
      const [roomsRes, unisRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/universities')
      ]);
      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        setRooms(roomsData);
      }
      if (unisRes.ok) {
        const unisData = await unisRes.json();
        setUniversities(unisData);
      }
    } catch (err) {
      console.error('Lỗi khi tải đồng bộ dữ liệu dự phòng:', err);
    }
  }, []);

  // Thiết lập đồng bộ hóa thời gian thực trực tiếp từ Firebase Firestore
  useEffect(() => {
    let unsubscribeRooms = () => {};
    let unsubscribeUnis = () => {};

    // Seeding dữ liệu Firestore nếu rỗng, sau đó lắng nghe cập nhật real-time
    seedFirestoreIfNeeded().then(() => {
      unsubscribeRooms = subscribeRooms((firebaseRooms) => {
        if (firebaseRooms) {
          setRooms(firebaseRooms);
        }
      });

      unsubscribeUnis = subscribeUniversities((firebaseUnis) => {
        if (firebaseUnis) {
          setUniversities(firebaseUnis);
        }
      });
    }).catch((err) => {
      console.error("Lỗi khởi chạy Firebase, sử dụng API dự phòng:", err);
      // Fallback sang API nếu Firebase bị lỗi
      fetchAllData();
    });

    return () => {
      unsubscribeRooms();
      unsubscribeUnis();
    };
  }, [fetchAllData]);

  // Đồng bộ hóa trạng thái phòng đang chọn/xem chi tiết khi danh sách phòng trọ được cập nhật thời gian thực từ Firestore
  useEffect(() => {
    if (selectedRoom) {
      const updated = rooms.find(r => r.id === selectedRoom.id);
      if (updated) {
        if (JSON.stringify(updated) !== JSON.stringify(selectedRoom)) {
          setSelectedRoom(updated);
        }
      }
    }
    if (detailedRoom) {
      const updated = rooms.find(r => r.id === detailedRoom.id);
      if (updated) {
        if (JSON.stringify(updated) !== JSON.stringify(detailedRoom)) {
          setDetailedRoom(updated);
        }
      }
    }
  }, [rooms, selectedRoom, detailedRoom]);

  // Xử lý khi bộ lọc thay đổi
  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    
    // Khi đổi điểm trung tâm
    if (newFilters.universityId !== filters.universityId) {
      if (newFilters.universityId === 'other') {
        // Chuyển sang chế độ nhập địa chỉ tự do
        setGeocodeError('');
      } else if (newFilters.universityId === 'custom_pin') {
        // Chuyển sang chế độ ghim điểm tùy ý, đóng popup cũ
        setSelectedRoom(null);
      } else {
        const selectedUni = universities.find(u => u.id === newFilters.universityId);
        if (selectedUni) {
          setScanCenter([selectedUni.lat, selectedUni.lng]);
          setMapCenter([selectedUni.lat, selectedUni.lng]);
          setMapZoom(15);
          setSelectedRoom(null); // Đóng popup cũ
        }
      }
    }
  };

  // Định vị tìm tọa độ tự do qua OpenStreetMap Nominatim API cho tuỳ chọn "Khác"
  const handleGeocodeCustomAddress = async () => {
    if (!customAddress.trim()) return;
    setIsGeocoding(true);
    setGeocodeError('');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(customAddress + ', Hà Nội')}&format=json&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setScanCenter([lat, lon]);
        setMapCenter([lat, lon]);
        setMapZoom(16);
        setSelectedRoom(null);
      } else {
        setGeocodeError('Không tìm thấy địa chỉ này trên bản đồ. Vui lòng kiểm tra lại!');
      }
    } catch (err) {
      setGeocodeError('Không thể kết nối máy chủ địa lý. Thử lại sau!');
    } finally {
      setIsGeocoding(false);
    }
  };

  // Định vị người dùng thông qua Geolocation API thực tế
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ định vị GPS!');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setScanCenter([latitude, longitude]);
        setMapCenter([latitude, longitude]);
        setMapZoom(16);
        setSelectedRoom(null);
        alert('Đã định vị thành công vị trí hiện tại của bạn trên bản đồ Hà Nội!');
      },
      (error) => {
        console.error('Lỗi định vị:', error);
        alert('Không thể truy cập GPS của bạn. Vui lòng cho phép quyền truy cập vị trí và thử lại.');
      },
      { enableHighAccuracy: true }
    );
  };

  // Xử lý Đăng nhập/Đăng xuất Admin
  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    localStorage.setItem('hanoi_admin_logged_in', 'true');
    setIsAdminDashboardOpen(true); // Tự động mở bảng quản trị khi đăng nhập thành công
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem('hanoi_admin_logged_in');
    setIsAdminDashboardOpen(false);
  };

  // Các chức năng CRUD dành cho Admin đồng bộ trực tiếp tới Server và Firebase Firestore
  const handleAddRoom = async (newRoom: Room): Promise<{ success: boolean; message?: string }> => {
    try {
      if (!newRoom.id) {
        newRoom.id = 'LT' + Math.floor(10000000 + Math.random() * 90000000);
      }

      // 1. Lưu lên Firebase Firestore (Đám mây đồng bộ)
      await addRoomToFirebase(newRoom);

      // 2. Gửi dự phòng lên Express API (nếu đang chạy)
      fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoom),
      }).catch((err) => console.warn('Lỗi lưu dự phòng local API:', err));

      // Định vị và chọn phòng trọ mới thêm ngay lập tức để nhìn thấy ngay trên bản đồ!
      setSelectedRoom(newRoom);
      setMapCenter([newRoom.lat, newRoom.lng]);
      setMapZoom(17);

      return { success: true };
    } catch (err) {
      console.error('Lỗi đăng phòng:', err);
      return { success: false, message: 'Lỗi đồng bộ dữ liệu đám mây Firebase!' };
    }
  };

  const handleUpdateRoom = async (updatedRoom: Room, oldId?: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const targetId = oldId || updatedRoom.id;

      // 1. Nếu có đổi ID mới, xóa ID cũ trên Firebase
      if (oldId && oldId !== updatedRoom.id) {
        await deleteRoomFromFirebase(oldId);
      }

      // 2. Lưu lên Firebase Firestore
      await updateRoomInFirebase(updatedRoom);

      // 3. Gửi dự phòng lên Express API (nếu đang chạy)
      fetch(`/api/rooms/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRoom),
      }).catch((err) => console.warn('Lỗi cập nhật dự phòng local API:', err));

      // Định vị và cập nhật phòng được chọn để luôn thấy trên bản đồ
      setSelectedRoom(updatedRoom);
      setMapCenter([updatedRoom.lat, updatedRoom.lng]);
      setMapZoom(17);
      if (detailedRoom?.id === targetId || detailedRoom?.id === updatedRoom.id) {
        setDetailedRoom(updatedRoom);
      }
      return { success: true };
    } catch (err) {
      console.error('Lỗi cập nhật phòng:', err);
      return { success: false, message: 'Lỗi đồng bộ dữ liệu đám mây Firebase!' };
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      // 1. Xóa trên Firebase Firestore
      await deleteRoomFromFirebase(roomId);

      // 2. Đồng bộ dự phòng local API (nếu có)
      fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
      }).catch((err) => console.warn('Lỗi xóa dự phòng local API:', err));

      if (selectedRoom?.id === roomId) {
        setSelectedRoom(null);
      }
      if (detailedRoom?.id === roomId) {
        setDetailedRoom(null);
      }
    } catch (err) {
      console.error('Lỗi xóa phòng:', err);
    }
  };

  const handleAddUniversity = async (newUni: University): Promise<{ success: boolean; message?: string }> => {
    try {
      if (!newUni.id) {
        newUni.id = 'uni_' + Date.now();
      }

      // 1. Thêm lên Firebase
      await addUniversityToFirebase(newUni);

      // 2. Đồng bộ dự phòng local API
      fetch('/api/universities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUni),
      }).catch((err) => console.warn('Lỗi thêm trường dự phòng local API:', err));

      return { success: true };
    } catch (err: any) {
      console.error('Lỗi thêm trường:', err);
      return { success: false, message: err?.message || 'Lỗi kết nối hoặc đồng bộ dữ liệu đám mây Firebase!' };
    }
  };

  // Hỗ trợ chọn phòng từ danh sách để định vị trên bản đồ
  const handleSelectRoomOnMap = (room: Room) => {
    setSelectedRoom(room);
    setMapCenter([room.lat, room.lng]);
    setMapZoom(17);
  };

  // Logic lọc phòng trọ sinh viên thực tế dựa trên điểm tâm quét dải bán kính
  const filteredRooms = rooms.filter(room => {
    // Nếu đây là phòng đang được chọn định vị, luôn cho phép hiển thị
    if (selectedRoom && room.id === selectedRoom.id) {
      return true;
    }

    // Nếu người dùng tích cực tìm kiếm từ khóa, ưu tiên tuyệt đối cho việc khớp từ khóa (không giới hạn giá, không giới hạn bán kính quét)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase().trim();
      const matchTitle = room.title.toLowerCase().includes(query);
      const matchAddress = room.address.toLowerCase().includes(query);
      const matchId = room.id.toLowerCase().includes(query);
      return matchTitle || matchAddress || matchId;
    }

    // Nếu không tìm theo từ khóa, áp dụng bộ lọc khoảng giá và bán kính điểm quét thông thường
    const roomMin = room.price;
    const roomMax = room.priceMax || room.price;
    if (roomMax < filters.minPrice || roomMin > filters.maxPrice) {
      return false;
    }

    const distance = getDistance(scanCenter[0], scanCenter[1], room.lat, room.lng);
    if (distance > filters.radius) {
      return false;
    }

    return true;
  });

  // Khi người dùng gõ từ khóa tìm kiếm, tự động di chuyển bản đồ đến phòng trọ khớp đầu tiên
  useEffect(() => {
    if (filters.searchQuery && rooms.length > 0) {
      const query = filters.searchQuery.toLowerCase().trim();
      const firstMatched = rooms.find(room => {
        const matchTitle = room.title.toLowerCase().includes(query);
        const matchAddress = room.address.toLowerCase().includes(query);
        const matchId = room.id.toLowerCase().includes(query);
        return matchTitle || matchAddress || matchId;
      });

      if (firstMatched) {
        setMapCenter([firstMatched.lat, firstMatched.lng]);
        setMapZoom(16);
      }
    }
  }, [filters.searchQuery, rooms]);

  // Hỗ trợ tự động mở phòng qua query param URL (cho tính năng chia sẻ thực tế)
  useEffect(() => {
    if (rooms.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const roomIdParam = params.get('room');
    if (roomIdParam) {
      const foundRoom = rooms.find(r => r.id === roomIdParam);
      if (foundRoom) {
        // Tự động nhảy đến vị trí phòng được chia sẻ
        handleSelectRoomOnMap(foundRoom);
        // Reset query param để tránh bị lặp lại khi tương tác khác
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [rooms]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f8fafc] font-sans overflow-hidden" id="main-app">
      {/* 1. HEADER NAVIGATION (Sleek Theme) */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <span className="text-xl font-extrabold text-slate-800 tracking-tight">UniStay <span className="text-indigo-600">Hà Nội</span></span>
            <span className="hidden md:inline-block ml-3 px-2 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded-md font-semibold tracking-wide uppercase">Bản đồ sinh viên</span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {isAdminLoggedIn ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAdminDashboardOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors rounded-xl shadow-md text-sm font-bold cursor-pointer"
              >
                Dashboard CRUD
              </button>
              <button
                onClick={handleAdminLogout}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdminLoginOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors shadow-sm text-sm font-semibold cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Đăng nhập Admin
            </button>
          )}
        </div>
      </header>

      {/* 2. MAIN MAP & FLOATING OVERLAYS CONTROLLER */}
      <main className="flex-1 relative overflow-hidden">
        {/* Fullscreen Map inside the flex box container */}
        <div className="absolute inset-0 w-full h-full z-0" id="map-fullscreen-container">
          <MapComponent
            rooms={rooms}
            filteredRooms={filteredRooms}
            filters={filters}
            onRoomSelect={setSelectedRoom}
            selectedRoom={selectedRoom}
            mapCenter={mapCenter}
            mapZoom={mapZoom}
            onViewDetail={setDetailedRoom}
            universities={universities}
            scanCenter={scanCenter}
            onScanCenterChange={setScanCenter}
            isFilterOpen={isFilterOpen}
          />
        </div>

        {/* Floating Controls Overlay (Sleek Theme) */}
        <div 
          className={`absolute top-4 sm:top-6 left-4 sm:left-6 z-[1000] w-[calc(100%-2rem)] sm:w-auto max-w-md pointer-events-none flex flex-col gap-4 transition-all duration-300 ${
            isFilterOpen 
              ? 'translate-y-0 opacity-100 pointer-events-auto' 
              : '-translate-y-full opacity-0 pointer-events-none'
          }`}
          id="control-panels-overlay"
        >
          {/* User Filter SearchPanel */}
          <SearchPanel
            filters={filters}
            onFiltersChange={handleFiltersChange}
            isAdminLoggedIn={isAdminLoggedIn}
            onOpenAdminModal={() => setIsAdminLoginOpen(true)}
            onAdminLogout={handleAdminLogout}
            filteredRoomsCount={filteredRooms.length}
            onLocateUser={handleLocateUser}
            universities={universities}
            customAddress={customAddress}
            onCustomAddressChange={setCustomAddress}
            isGeocoding={isGeocoding}
            onGeocodeCustomAddress={handleGeocodeCustomAddress}
            geocodeError={geocodeError}
            onCloseMobile={() => setIsFilterOpen(false)}
          />

          {/* Connected Admin Mini Badge */}
          {isAdminLoggedIn && (
            <div 
              className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 pointer-events-auto flex items-center justify-between"
              id="admin-status-bar"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-slate-200">Bảng điều khiển trực tuyến</span>
              </div>
              <span className="text-[10px] bg-indigo-500 text-white font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider">
                AD-9932
              </span>
            </div>
          )}
        </div>

        {/* Filter Toggle Button */}
        {!isFilterOpen && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto animate-fade-in-up">
            <button
              onClick={() => setIsFilterOpen(true)}
              className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600/95 backdrop-blur-md hover:bg-indigo-600 active:scale-95 text-white text-xs font-extrabold rounded-full shadow-2xl border border-indigo-400/30 shadow-indigo-500/30 transition-all duration-300 cursor-pointer whitespace-nowrap hover:scale-105 hover:shadow-indigo-500/40 pulse-glow"
            >
              <Filter size={14} className="animate-bounce" />
              Mở bộ lọc & Tìm kiếm ({filteredRooms.length})
            </button>
          </div>
        )}
      </main>

      {/* 3. BOTTOM BRANDING/FOOTER OVERLAY */}
      <footer className="h-10 bg-slate-900 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex gap-4 text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
          <span>© 2026 UniStay VN</span>
          <span className="hidden md:inline">Chính sách bảo mật</span>
          <span className="hidden md:inline">Hỗ trợ kỹ thuật</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Hệ thống sẵn sàng</span>
        </div>
      </footer>

      {/* 4. MODAL DETACHED FORMS */}
      <AdminLogin
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      <AdminDashboard
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        rooms={rooms}
        onAddRoom={handleAddRoom}
        onUpdateRoom={handleUpdateRoom}
        onDeleteRoom={handleDeleteRoom}
        onSelectRoomOnMap={handleSelectRoomOnMap}
        universities={universities}
        onAddUniversity={handleAddUniversity}
      />

      <RoomDetailModal
        room={detailedRoom}
        isOpen={detailedRoom !== null}
        onClose={() => setDetailedRoom(null)}
        isAdminLoggedIn={isAdminLoggedIn}
      />
    </div>
  );
}

