import React from 'react';
import { X, Phone, MessageSquare, Share2, Shield, Calendar, Maximize2, Users, Compass } from 'lucide-react';
import { Room } from '../types';

interface RoomDetailModalProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
  isAdminLoggedIn: boolean;
  onEditRoom?: (room: Room) => void;
}

export default function RoomDetailModal({ room, isOpen, onClose, isAdminLoggedIn, onEditRoom }: RoomDetailModalProps) {
  const [copied, setCopied] = React.useState(false);
  const [syntaxCopied, setSyntaxCopied] = React.useState(false);
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);

  // Trực quan hóa danh sách ảnh (ưu tiên dùng danh sách ảnh thực tế được admin tải lên)
  const images = React.useMemo(() => {
    if (!room) return [];
    
    // Nếu admin đã tải lên nhiều ảnh cho phòng trọ, sử dụng danh sách ảnh thực tế
    if (room.images && room.images.length > 0) {
      const list = [room.image, ...room.images];
      return Array.from(new Set(list)).filter(Boolean);
    }
    
    const list = [room.image];
    
    // Bể ảnh mẫu nội thất cao cấp của Unsplash (bếp, phòng tắm, góc học tập, góc làm việc) (chỉ dùng làm dự phòng)
    const fallbackPool = [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80', // Không gian sống tiện nghi
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80', // Phòng tắm khép kín sạch sẽ
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&q=80', // Kệ bếp tự nấu ăn
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80', // Phòng ngủ ấm cúng
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80', // Gác lửng thông minh
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80', // Góc học tập đón sáng
    ];
    
    // Tính toán hàm băm đơn giản từ ID phòng trọ để hiển thị 3 ảnh khác nhau ổn định theo từng phòng
    const hash = room.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const firstIdx = hash % fallbackPool.length;
    const secondIdx = (hash + 2) % fallbackPool.length;
    const thirdIdx = (hash + 4) % fallbackPool.length;
    
    const extra1 = fallbackPool[firstIdx];
    const extra2 = fallbackPool[secondIdx] === extra1 ? fallbackPool[(secondIdx + 1) % fallbackPool.length] : fallbackPool[secondIdx];
    const extra3 = fallbackPool[thirdIdx] === extra1 || fallbackPool[thirdIdx] === extra2 ? fallbackPool[(thirdIdx + 1) % fallbackPool.length] : fallbackPool[thirdIdx];
    
    list.push(extra1, extra2, extra3);
    return Array.from(new Set(list)).filter(Boolean);
  }, [room]);

  // Reset ảnh active về 0 khi đổi phòng trọ
  React.useEffect(() => {
    setActiveImageIndex(0);
  }, [room?.id]);

  if (!isOpen || !room) return null;

  const priceFormatted = room.priceMax && room.priceMax > room.price
    ? `${room.price.toLocaleString('vi-VN')} - ${room.priceMax.toLocaleString('vi-VN')}`
    : room.price.toLocaleString('vi-VN');

  const handleShare = () => {
    const text = `Tôi muốn hỏi thuê phòng trọ:\n- Mã phòng: ${room.id}\n- Tên phòng: ${room.title}\n- Địa chỉ: ${room.address}\n- Giá thuê: ${priceFormatted} đ/tháng\n(Liên hệ qua UniStay)`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const syntaxText = `${room.id} - ${room.address} - ${priceFormatted} đ/tháng`;

  return (
    <div 
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
      id="room-detail-overlay"
    >
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        id="room-detail-modal"
      >
        {/* Nút đóng */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-all cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Thân Modal */}
        <div className="overflow-y-auto flex-1 pb-8">
          {/* Header Image */}
          <div className="relative h-64 sm:h-80 w-full bg-slate-100">
            <img 
              src={images[activeImageIndex] || room.image || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80'} 
              alt={room.title}
              className="w-full h-full object-cover transition-all duration-300"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent"></div>
            
            {/* Badges bay trên ảnh */}
            <div className="absolute bottom-4 left-6 flex flex-wrap gap-2">
              {room.gender && (
                <span className="px-3 py-1 text-xs font-bold bg-white/95 text-slate-800 rounded-lg shadow-md flex items-center gap-1">
                  <Users size={12} className="text-indigo-600" />
                  Giới tính: {room.gender}
                </span>
              )}
              {room.area && (
                <span className="px-3 py-1 text-xs font-bold bg-indigo-600 text-white rounded-lg shadow-md flex items-center gap-1">
                  <Maximize2 size={12} />
                  Diện tích: {room.area} m²
                </span>
              )}
            </div>
          </div>

          {/* Thumbnail Gallery (Bộ sưu tập ảnh chi tiết phòng) */}
          <div className="flex gap-2.5 px-6 sm:px-8 mt-4 overflow-x-auto shrink-0 py-1.5 scrollbar-thin scrollbar-thumb-slate-200">
            {images.map((img, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveImageIndex(index)}
                className={`relative w-16 h-12 sm:w-20 sm:h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer flex-shrink-0 ${
                  activeImageIndex === index 
                    ? 'border-indigo-600 ring-2 ring-indigo-100 scale-105 shadow-md shadow-indigo-100' 
                    : 'border-slate-100 hover:border-slate-300 hover:scale-102'
                }`}
              >
                <img 
                  src={img} 
                  alt={`Detail ${index + 1}`} 
                  className="w-full h-full object-cover animate-fade-in"
                  referrerPolicy="no-referrer"
                />
              </button>
            ))}
          </div>

          {/* Nội dung chi tiết */}
          <div className="px-6 sm:px-8 pt-6 space-y-6">
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md uppercase tracking-wider inline-block">
                Mã phòng: {room.id}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-tight">
                {room.title}
              </h1>
              <p className="text-sm text-slate-500 flex items-start gap-1.5">
                <Compass size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <span>{room.address}</span>
              </p>
            </div>

            {/* Giá thuê và diện tích */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Giá thuê hàng tháng</span>
                <span className="text-2xl font-black text-indigo-600">
                  {room.priceMax && room.priceMax > room.price
                    ? `${room.price.toLocaleString('vi-VN')} - ${room.priceMax.toLocaleString('vi-VN')}`
                    : room.price.toLocaleString('vi-VN')}{' '}
                  <span className="text-sm font-bold text-slate-500">đ/tháng</span>
                </span>
              </div>
              <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-6">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Diện tích phòng</span>
                <span className="text-2xl font-black text-slate-800">
                  {room.area ? room.area : 'Chưa rõ'}{' '}
                  {room.area ? <span className="text-sm font-bold text-slate-500">m²</span> : null}
                </span>
              </div>
            </div>

            {/* Mô tả chi tiết */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Mô tả phòng trọ</h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-xl border border-slate-200/40">
                {room.description || 'Không có mô tả chi tiết cho phòng trọ này.'}
              </p>
            </div>

            {/* Tiện ích phòng trọ */}
            {room.amenities && room.amenities.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Tiện nghi có sẵn</h3>
                <div className="flex flex-wrap gap-2">
                  {room.amenities.map((amenity, idx) => (
                    <span 
                      key={idx} 
                      className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl border border-slate-200/50 shadow-sm"
                    >
                      ✨ {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Thông tin liên hệ & Chia sẻ */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Thông tin liên hệ chủ nhà</h3>
              
              {/* Box Hướng dẫn cú pháp Zalo */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3 animate-scale-in">
                <div className="flex items-start gap-2.5">
                  <span className="text-base leading-none mt-0.5 select-none">💬</span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Mẫu tin nhắn gửi chủ nhà</p>
                    <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                      Sao chép mẫu thông tin dưới đây gửi qua Zalo để chủ nhà nhận diện chính xác phòng bạn cần thuê nhanh nhất:
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2.5 bg-white border border-slate-200/80 rounded-xl p-2 pl-3.5 shadow-sm hover:border-slate-300 transition-colors duration-300">
                  <span className="text-xs font-sans font-bold text-slate-700 truncate flex-1 select-all" title={syntaxText}>
                    {syntaxText}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(syntaxText);
                      setSyntaxCopied(true);
                      setTimeout(() => setSyntaxCopied(false), 2000);
                    }}
                    className={`px-3 py-1.5 text-[10px] font-extrabold rounded-lg transition-all duration-300 cursor-pointer shadow-sm select-none shrink-0 active:scale-95 ${
                      syntaxCopied 
                        ? 'bg-emerald-600 text-white shadow-emerald-100' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100/50'
                    }`}
                  >
                    {syntaxCopied ? 'Đã sao chép!' : 'Sao chép tin mẫu'}
                  </button>
                </div>
              </div>

              <div className="w-full">
                <a
                  href={room.zalo && (room.zalo.startsWith('http') || room.zalo.includes('zalo.me')) ? room.zalo : `https://zalo.me/${room.zalo || room.phone || '0987654321'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 py-3.5 px-4 bg-[#0068ff] hover:bg-[#0056d6] text-white !text-white rounded-xl font-bold text-sm shadow-md shadow-blue-200/50 transition-all cursor-pointer w-full text-center hover:shadow-lg transform active:scale-[0.99] duration-150"
                  style={{ color: '#ffffff' }}
                >
                  <MessageSquare size={18} className="text-white" style={{ color: '#ffffff' }} />
                  <span className="text-white font-extrabold" style={{ color: '#ffffff' }}>Liên hệ qua Zalo (Hỏi thuê phòng)</span>
                </a>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  <Share2 size={14} />
                  {copied ? 'Đã sao chép liên kết!' : 'Chia sẻ thông tin phòng'}
                </button>

                {isAdminLoggedIn && onEditRoom && (
                  <button
                    onClick={() => {
                      onClose();
                      onEditRoom(room);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    <Shield size={14} />
                    Chỉnh sửa phòng này (Admin)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
