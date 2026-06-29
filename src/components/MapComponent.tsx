import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Room, University, SearchFilters } from '../types';
import { MapPin, Share2, MessageSquare, BadgeInfo } from 'lucide-react';

// Component điều khiển di chuyển bản đồ và căn góc nhìn tự động
function LeafletMapController({
  scanCenter,
  radius,
  isFilterOpen,
  selectedRoom,
  mapCenter,
  mapZoom
}: {
  scanCenter: [number, number];
  radius: number;
  isFilterOpen: boolean;
  selectedRoom: Room | null;
  mapCenter: [number, number];
  mapZoom: number;
}) {
  const map = useMap();

  // Thiết lập góc nhìn ban đầu khi bản đồ tải
  useEffect(() => {
    if (map && mapCenter) {
      map.setView(mapCenter, mapZoom);
    }
  }, [map]);

  // Tự động căn góc nhìn để hiển thị trọn vẹn vòng tròn bán kính tìm kiếm (brentwood-padding)
  useEffect(() => {
    if (map && scanCenter && !selectedRoom) {
      // Tính toán bounds tương đối bao quanh hình tròn
      // 1 vĩ độ tương đương ~111,111 mét
      const latOffset = radius / 111111;
      const lngOffset = radius / (111111 * Math.cos(scanCenter[0] * Math.PI / 180));
      
      const southWest = L.latLng(scanCenter[0] - latOffset, scanCenter[1] - lngOffset);
      const northEast = L.latLng(scanCenter[0] + latOffset, scanCenter[1] + lngOffset);
      const bounds = L.latLngBounds(southWest, northEast);

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
      // Dịch chuyển hiển thị để tránh bị bảng bộ lọc bên trái (desktop) hoặc bên dưới (mobile) đè lên
      const paddingLeft = (!isMobile && isFilterOpen) ? 380 : 40;
      const paddingTop = (isMobile && isFilterOpen) ? 180 : 40;

      map.flyToBounds(bounds, {
        animate: true,
        duration: 0.8,
        paddingTopLeft: [paddingLeft, paddingTop],
        paddingBottomRight: [40, 40],
      });
    }
  }, [map, scanCenter, radius, selectedRoom, isFilterOpen]);

  // Tự động dịch chuyển đến phòng trọ khi được chọn từ danh sách ngoài
  useEffect(() => {
    if (map && selectedRoom) {
      map.setView([selectedRoom.lat, selectedRoom.lng], 16, { animate: true });
    }
  }, [map, selectedRoom]);

  return null;
}

// Tạo icon tuỳ chỉnh cho Trường đại học trung tâm
const uniIcon = L.divIcon({
  html: `
    <div class="flex flex-col items-center" style="transform: translate(-50%, -50%);">
      <div class="w-4 h-4 bg-rose-500 rounded-full ring-4 ring-rose-100 shadow-md"></div>
    </div>
  `,
  className: 'custom-leaflet-marker',
  iconSize: [0, 0],
  iconAnchor: [0, 0]
});

// Tạo icon cho điểm ghim tuỳ ý
const customPinIcon = L.divIcon({
  html: `
    <div class="flex flex-col items-center relative cursor-grab active:cursor-grabbing" style="transform: translate(-50%, -100%);">
      <div class="absolute -top-[14px] w-8 h-8 bg-indigo-500/30 rounded-full animate-ping pointer-events-none"></div>
      <div class="w-8 h-8 bg-indigo-600 rounded-full ring-4 ring-indigo-100 shadow-lg flex items-center justify-center text-white border border-white font-bold select-none text-sm leading-none">
        🎯
      </div>
      <div class="w-2.5 h-2.5 bg-indigo-600 border-r border-b border-indigo-600 rotate-45 -mt-1 shadow-sm"></div>
    </div>
  `,
  className: 'custom-leaflet-marker',
  iconSize: [0, 0],
  iconAnchor: [0, 0]
});

// Tạo các icon tuỳ chỉnh theo mức giá (Airbnb style)
const createPriceMarkerIcon = (priceText: string, bgClass: string, caretColor: string) => {
  return L.divIcon({
    html: `
      <div class="relative flex flex-col items-center select-none" style="transform: translate(-50%, -100%); width: max-content;">
        <div class="flex items-center gap-1 font-sans text-xs rounded-xl px-2.5 py-1.5 border shadow-md transition-all duration-300 whitespace-nowrap cursor-pointer ${bgClass}">
          <span>${priceText}Tr</span>
          <span class="text-[10px] text-indigo-500 opacity-90">⌂</span>
        </div>
        <div class="w-2 h-2 -mt-1 rotate-45 border-r border-b shadow-sm ${caretColor}"></div>
      </div>
    `,
    className: 'custom-leaflet-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

interface MapComponentProps {
  rooms: Room[];
  filteredRooms: Room[];
  filters: SearchFilters;
  onRoomSelect: (room: Room | null) => void;
  selectedRoom: Room | null;
  mapCenter: [number, number];
  mapZoom: number;
  onViewDetail: (room: Room) => void;
  universities: University[];
  scanCenter: [number, number];
  onScanCenterChange: (center: [number, number]) => void;
  isFilterOpen?: boolean;
}

export default function MapComponent({
  rooms,
  filteredRooms,
  filters,
  onRoomSelect,
  selectedRoom,
  mapCenter,
  mapZoom,
  onViewDetail,
  universities,
  scanCenter,
  onScanCenterChange,
  isFilterOpen = true,
}: MapComponentProps) {
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const customPinRef = useRef<any>(null);

  const handleShare = (room: Room) => {
    const priceFormatted = room.priceMax && room.priceMax > room.price
      ? `${room.price.toLocaleString('vi-VN')} - ${room.priceMax.toLocaleString('vi-VN')}`
      : room.price.toLocaleString('vi-VN');
    const textToCopy = `📍 Phòng trọ ${room.id} - ${room.title}\n💵 Giá: ${priceFormatted} đ/tháng\n📌 Địa chỉ: ${room.address}\n📞 SĐT: ${room.phone}\nXem trên bản đồ: ${window.location.origin}/?room=${room.id}`;
    navigator.clipboard.writeText(textToCopy);
    setShareSuccess(room.id);
    setTimeout(() => setShareSuccess(null), 3000);
  };

  // Xác định trường đại học đang chọn để lấy tọa độ làm tâm điểm vẽ hình tròn
  const selectedUni = universities.find((u) => u.id === filters.universityId);

  // Lắng nghe hành vi kéo thả ghim quét tùy ý
  const customPinEventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = customPinRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          onScanCenterChange([latLng.lat, latLng.lng]);
        }
      },
    }),
    [onScanCenterChange]
  );

  return (
    <div className="w-full h-full relative" id="leaflet-map-container">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Cập nhật tâm và giới hạn quét bản đồ thông minh */}
        <LeafletMapController
          scanCenter={scanCenter}
          radius={filters.radius}
          isFilterOpen={isFilterOpen}
          selectedRoom={selectedRoom}
          mapCenter={mapCenter}
          mapZoom={mapZoom}
        />

        {/* Vòng tròn hiển thị bán kính tìm kiếm (màu Indigo đồng bộ UniStay) */}
        <Circle
          center={scanCenter}
          radius={filters.radius}
          pathOptions={{
            color: '#6366f1',
            weight: 1.5,
            opacity: 0.85,
            fillColor: '#818cf8',
            fillOpacity: 0.12,
          }}
        />

        {/* Marker đại diện cho Trường Đại học trọng tâm đã chọn */}
        {selectedUni && (
          <Marker
            position={[selectedUni.lat, selectedUni.lng]}
            icon={uniIcon}
          />
        )}

        {/* Tâm quét tự do di chuyển khi chọn ghim điểm tùy ý */}
        {filters.universityId === 'custom_pin' && (
          <Marker
            ref={customPinRef}
            position={scanCenter}
            draggable={true}
            eventHandlers={customPinEventHandlers}
            icon={customPinIcon}
          />
        )}

        {/* Danh sách các phòng trọ với mức giá Airbnb-style cao cấp */}
        {rooms.map((room) => {
          const isSelected = selectedRoom?.id === room.id;
          const isMatchingFilter = filteredRooms.some((r) => r.id === room.id);

          const minMillion = (room.price / 1000000).toLocaleString('vi-VN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
          });
          const maxMillion = room.priceMax && room.priceMax > room.price
            ? (room.priceMax / 1000000).toLocaleString('vi-VN', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 1,
              })
            : null;
          const priceText = maxMillion ? `${minMillion}-${maxMillion}` : minMillion;

          let bgClass = '';
          let caretColor = '';

          if (isSelected) {
            bgClass = 'bg-indigo-600 text-white border-2 border-white ring-4 ring-indigo-100 scale-110 shadow-xl font-extrabold';
            caretColor = 'bg-indigo-600 border-indigo-600';
          } else if (isMatchingFilter) {
            bgClass = 'bg-emerald-500 text-white border-2 border-white shadow-md hover:scale-105 hover:bg-emerald-600 font-extrabold scale-105';
            caretColor = 'bg-emerald-500 border-emerald-500';
          } else {
            bgClass = 'bg-white text-slate-800 border-2 border-slate-700 shadow-md hover:scale-105 hover:border-indigo-600 hover:text-indigo-600 font-bold scale-100';
            caretColor = 'bg-white border-slate-700';
          }

          const priceIcon = createPriceMarkerIcon(priceText, bgClass, caretColor);

          return (
            <Marker
              key={room.id}
              position={[room.lat, room.lng]}
              icon={priceIcon}
              eventHandlers={{
                click: () => onRoomSelect(room),
              }}
            >
              {isSelected && (
                <Popup
                  position={[room.lat, room.lng]}
                  onClose={() => onRoomSelect(null)}
                  maxWidth={280}
                  className="custom-leaflet-popup"
                >
                  <div className="w-[250px] bg-white rounded-2xl overflow-hidden font-sans relative text-slate-800">
                    {/* Ảnh phòng trọ */}
                    <div className="relative h-28 w-full bg-slate-100 overflow-hidden">
                      <img
                        src={room.image}
                        alt={room.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {room.gender && (
                        <span className="absolute bottom-2 left-2 px-1.5 py-0.5 text-[8px] font-bold bg-white/95 text-slate-800 rounded shadow-sm">
                          👫 {room.gender}
                        </span>
                      )}
                      {room.area && room.area > 0 && (
                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[8px] font-extrabold bg-indigo-600 text-white rounded shadow-sm">
                          {room.area} m²
                        </span>
                      )}
                    </div>

                    {/* Chi tiết nội dung */}
                    <div className="p-3 space-y-2 text-left">
                      <div>
                        <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          Mã: {room.id}
                        </span>
                        <h3 className="text-xs font-bold text-slate-800 leading-tight mt-0.5 line-clamp-2">
                          {room.title}
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-1 flex items-start gap-1">
                          <MapPin size={10} className="shrink-0 text-slate-400 mt-0.5" />
                          <span className="line-clamp-2 leading-tight">{room.address}</span>
                        </p>
                      </div>

                      {/* Giá cả nổi bật */}
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[8px] text-slate-400 uppercase tracking-wider font-extrabold">Giá thuê</span>
                          <span className="text-xs font-bold text-indigo-600 leading-none mt-0.5">
                            {room.priceMax && room.priceMax > room.price
                              ? `${room.price.toLocaleString('vi-VN')} - ${room.priceMax.toLocaleString('vi-VN')}`
                              : room.price.toLocaleString('vi-VN')}{" "}
                            <span className="text-[9px] font-semibold">/tháng</span>
                          </span>
                        </div>
                      </div>

                      {/* Nút chức năng ở góc dưới */}
                      <div className="space-y-1 pt-1">
                        {/* Nút Xem chi tiết chính */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            onViewDetail(room);
                          }}
                          className="w-full py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-indigo-100"
                        >
                          <span>👁️ Xem chi tiết phòng</span>
                        </button>

                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleShare(room)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors shrink-0 cursor-pointer"
                            title={shareSuccess === room.id ? 'Đã sao chép!' : 'Chia sẻ thông tin phòng'}
                          >
                            <Share2 size={10} className={shareSuccess === room.id ? 'text-green-600' : ''} />
                          </button>

                          <a
                            href={room.zalo && (room.zalo.startsWith('http') || room.zalo.includes('zalo.me')) ? room.zalo : `https://zalo.me/${room.zalo || room.phone || '0987654321'}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-1 px-2.5 rounded-lg bg-[#0068ff] hover:bg-[#0056d6] text-white !text-white font-bold text-[10px] text-center transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                            style={{ color: '#ffffff' }}
                          >
                            <MessageSquare size={10} className="text-white" style={{ color: '#ffffff' }} />
                            <span className="text-white font-extrabold" style={{ color: '#ffffff' }}>Zalo</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </Popup>
              )}
            </Marker>
          );
        })}
      </MapContainer>

      {/* Ghi chú hướng dẫn ở góc bản đồ */}
      <div className="absolute bottom-5 right-5 z-[500] pointer-events-none hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md text-[10px] font-semibold text-white rounded-xl shadow-lg border border-slate-700/50 animate-fade-in">
        <BadgeInfo size={12} className="text-indigo-400" />
        <span>Ghim mức giá phòng. Nhấn để xem nhanh hoặc kéo thả ghim quét 🎯</span>
      </div>
    </div>
  );
}
