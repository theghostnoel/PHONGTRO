/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Room, University, SearchFilters } from '../types';
import { UNIVERSITIES, getDistance } from '../data/rooms';
import { MapPin, Share2, Phone, MessageSquare, X, ShieldAlert, BadgeInfo } from 'lucide-react';

// Thành phần để hỗ trợ di chuyển bản đồ đến tâm mới
function ChangeMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, {
      animate: true,
      duration: 1,
    });
  }, [center, zoom, map]);
  return null;
}

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
}: MapComponentProps) {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  // Tìm thông tin trường đại học đang chọn để lấy tọa độ làm tâm điểm Circle
  const selectedUni = universities.find((u) => u.id === filters.universityId);

  // Tạo icon tùy chỉnh cho các phòng trọ dựa vào mức giá (Airbnb-style)
  const createPriceIcon = (room: Room, isSelected: boolean, isMatchingFilter: boolean) => {
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
      bgClass = 'bg-indigo-600 text-white border-2 border-white ring-4 ring-indigo-100 scale-110 shadow-xl font-extrabold z-[1000]';
      caretColor = 'bg-indigo-600 border-indigo-600';
    } else if (isMatchingFilter) {
      // NẰM TRONG BÁN KÍNH: Có màu xanh lá cây ngọc (Emerald) cực kỳ nổi bật, tượng trưng cho việc đạt chuẩn bán kính gần trường!
      bgClass = 'bg-emerald-500 text-white border-2 border-white shadow-md hover:scale-105 hover:bg-emerald-600 font-extrabold z-[500] scale-105';
      caretColor = 'bg-emerald-500 border-emerald-500';
    } else {
      // NẰM NGOÀI BÁN KÍNH: Vẫn hiển thị sắc nét nổi bật, không mờ, nhưng dùng màu trắng thanh lịch để phân biệt
      bgClass = 'bg-white text-slate-800 border-2 border-slate-700 shadow-md hover:scale-105 hover:border-indigo-600 hover:text-indigo-600 font-bold z-[100] scale-100';
      caretColor = 'bg-white border-slate-700';
    }

    return L.divIcon({
      className: 'custom-leaflet-marker', // Thêm class rỗng để tránh vỡ CSS mặc định
      html: `
        <div class="relative group select-none flex flex-col items-center">
          <div class="flex items-center gap-1 font-sans text-xs rounded-xl px-2.5 py-1.5 border shadow-sm transition-all duration-150 whitespace-nowrap cursor-pointer ${bgClass}">
            <span>${priceText}Tr</span>
            <span class="text-[10px] text-indigo-500 group-hover:text-indigo-600 select-none opacity-90">⌂</span>
          </div>
          <!-- Mũi tên chỉ xuống -->
          <div class="w-2 h-2 -mt-1 rotate-45 border-r border-b shadow-sm ${caretColor}"></div>
        </div>
      `,
      iconSize: [68, 36],
      iconAnchor: [34, 30],
      popupAnchor: [0, -28],
    });
  };

  // Tạo icon tùy chỉnh cho trường Đại học trung tâm
  const universityIcon = L.divIcon({
    className: 'custom-uni-marker',
    html: `
      <div class="flex flex-col items-center">
        <div class="w-4 h-4 bg-red-500 rounded-full ring-4 ring-red-100 shadow-md"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -8],
  });

  // Tạo icon tùy chỉnh cho điểm trung tâm di động ghim tùy ý (bản đồ kéo thả)
  const customCenterIcon = L.divIcon({
    className: 'custom-center-marker',
    html: `
      <div class="flex flex-col items-center relative">
        <div class="absolute -top-[14px] w-8 h-8 bg-indigo-500/30 rounded-full animate-ping pointer-events-none"></div>
        <div class="w-8 h-8 bg-indigo-600 rounded-full ring-4 ring-indigo-100 shadow-lg flex items-center justify-center text-white border border-white font-bold select-none text-sm leading-none">
          🎯
        </div>
        <div class="w-2.5 h-2.5 bg-indigo-600 border-r border-b border-indigo-600 rotate-45 -mt-1 shadow-sm"></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 32],
  });

  const handleShare = (room: Room) => {
    const priceFormatted = room.priceMax && room.priceMax > room.price
      ? `${room.price.toLocaleString('vi-VN')} - ${room.priceMax.toLocaleString('vi-VN')}`
      : room.price.toLocaleString('vi-VN');
    const textToCopy = `📍 Phòng trọ ${room.id} - ${room.title}\n💵 Giá: ${priceFormatted} đ/tháng\n📌 Địa chỉ: ${room.address}\n📞 SĐT: ${room.phone}\nXem trên bản đồ: ${window.location.origin}/?room=${room.id}`;
    navigator.clipboard.writeText(textToCopy);
    setShareSuccess(room.id);
    setTimeout(() => setShareSuccess(null), 3000);
  };

  return (
    <div className="w-full h-full relative" id="leaflet-map-container">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="w-full h-full z-0"
        zoomControl={false} // Tự custom nút zoom hoặc dùng nút của Leaflet ở vị trí khác cho đẹp
        ref={setMapInstance}
      >
        {/* Bản đồ OpenStreetMap miễn phí, tải nhanh, không cần API Key */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> đóng góp'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Cập nhật tâm của bản đồ khi mapCenter thay đổi */}
        <ChangeMapView center={mapCenter} zoom={mapZoom} />

        {/* Vòng tròn bán kính tìm kiếm (Circle) - Luôn vẽ quanh scanCenter */}
        <Circle
          center={scanCenter}
          radius={filters.radius}
          pathOptions={{
            color: '#6366f1', // màu indigo-500
            fillColor: '#818cf8', // màu indigo-400
            fillOpacity: 0.12,
            weight: 1.5,
            dashArray: '5, 5',
          }}
        />

        {/* Marker đại diện cho Trường Đại học đang chọn làm tâm quét */}
        {selectedUni && (
          <Marker position={[selectedUni.lat, selectedUni.lng]} icon={universityIcon}>
            <Popup closeButton={false}>
              <div className="p-3 bg-white max-w-[200px] rounded-lg">
                <span className="text-[10px] bg-rose-50 text-rose-600 font-bold px-1.5 py-0.5 rounded">
                  Trường đại học trọng tâm
                </span>
                <h4 className="font-bold text-slate-900 text-xs mt-1.5">{selectedUni.name}</h4>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{selectedUni.address}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Điểm quét tự do kéo thả khi chọn chế độ "Ghim điểm tùy ý" */}
        {filters.universityId === 'custom_pin' && (
          <Marker
            position={scanCenter}
            icon={customCenterIcon}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                if (marker) {
                  const position = marker.getLatLng();
                  onScanCenterChange([position.lat, position.lng]);
                }
              }
            }}
          >
            <Popup closeButton={false}>
              <div className="p-3 bg-white max-w-[200px] rounded-lg">
                <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-1.5 py-0.5 rounded">
                  Tâm quét di động
                </span>
                <h4 className="font-bold text-slate-900 text-xs mt-1.5">🎯 Ghim quét tùy ý</h4>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                  Bạn có thể kéo thả ghim này sang vị trí bất kỳ để tìm phòng trọ xung quanh vị trí đó!
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Danh sách các Marker Phòng Trọ */}
        {rooms.map((room) => {
          const isSelected = selectedRoom?.id === room.id;
          const isMatchingFilter = filteredRooms.some((r) => r.id === room.id);
          return (
            <Marker
              key={room.id}
              position={[room.lat, room.lng]}
              icon={createPriceIcon(room, isSelected, isMatchingFilter)}
              eventHandlers={{
                click: () => {
                  onRoomSelect(room);
                },
                popupclose: () => {
                  onRoomSelect(null);
                },
              }}
            >
              {/* Popup chi tiết phòng trọ thiết kế bo góc, tinh tế, đẹp mắt */}
              <Popup closeButton={false} autoPan={true}>
                <div className="w-[280px] bg-white rounded-2xl overflow-hidden font-sans relative border border-slate-100 shadow-xl">
                  {/* Ảnh phòng trọ */}
                  <div className="relative h-36 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={room.image}
                      alt={room.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {room.gender && (
                      <span className="absolute bottom-3 left-3 px-2 py-0.5 text-[9px] font-bold bg-white/95 text-slate-800 rounded-md shadow-sm">
                        👫 {room.gender}
                      </span>
                    )}
                    {room.area && room.area > 0 && (
                      <span className="absolute bottom-3 right-3 px-2 py-0.5 text-[9px] font-extrabold bg-indigo-600 text-white rounded-md shadow-sm">
                        {room.area} m²
                      </span>
                    )}
                  </div>

                  {/* Chi tiết nội dung */}
                  <div className="p-4 space-y-3.5 text-left">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Mã: {room.id}
                      </span>
                      <h3 className="text-base font-bold text-slate-800 leading-tight mt-1 line-clamp-2">
                        {room.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1.5 flex items-start gap-1">
                        <MapPin size={13} className="shrink-0 text-slate-400 mt-0.5" />
                        <span className="line-clamp-2 leading-tight">{room.address}</span>
                      </p>
                    </div>

                    {/* Giá cả nổi bật */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Giá thuê</span>
                        <span className="text-base font-bold text-violet-600 leading-none mt-0.5">
                          {room.priceMax && room.priceMax > room.price
                            ? `${room.price.toLocaleString('vi-VN')} - ${room.priceMax.toLocaleString('vi-VN')}`
                            : room.price.toLocaleString('vi-VN')}{" "}
                          <span className="text-xs font-semibold">/tháng</span>
                        </span>
                      </div>
                    </div>

                    {/* Nút chức năng ở góc dưới */}
                    <div className="space-y-2 pt-2">
                      {/* Nút Xem chi tiết chính */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          onViewDetail(room);
                        }}
                        className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100"
                      >
                        <span>👁️ Xem chi tiết phòng</span>
                      </button>

                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleShare(room)}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors shrink-0 cursor-pointer"
                          title={shareSuccess === room.id ? 'Đã sao chép!' : 'Chia sẻ thông tin phòng'}
                        >
                          <Share2 size={13} className={shareSuccess === room.id ? 'text-green-600' : ''} />
                        </button>

                        <a
                          href={room.zalo && (room.zalo.startsWith('http') || room.zalo.includes('zalo.me')) ? room.zalo : `https://zalo.me/${room.zalo || room.phone || '0987654321'}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 px-4 rounded-xl bg-[#0068ff] hover:bg-[#0056d6] text-white !text-white font-bold text-xs text-center transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-200/50 hover:shadow-lg transform active:scale-95 duration-150"
                          style={{ color: '#ffffff' }}
                        >
                          <MessageSquare size={13} className="text-white" style={{ color: '#ffffff' }} />
                          <span className="text-white font-extrabold" style={{ color: '#ffffff' }}>Nhắn Zalo</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Thông báo hướng dẫn di chuột hoặc định vị */}
      <div className="absolute bottom-5 right-5 z-[500] pointer-events-none hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md text-[10px] font-semibold text-white rounded-xl shadow-lg border border-slate-700/50 animate-fade-in">
        <BadgeInfo size={12} className="text-purple-400" />
        <span>Ghim hiển thị mức giá phòng. Nhấp vào ghim để xem chi tiết!</span>
      </div>
    </div>
  );
}
