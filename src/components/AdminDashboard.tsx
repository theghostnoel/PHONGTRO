/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import { 
  X, Plus, Edit2, Trash2, MapPin, Upload, Link, Check, AlertCircle, Save, 
  ChevronRight, RefreshCw, Eye, Image as ImageIcon, Search, ShieldCheck, GraduationCap,
  Settings
} from 'lucide-react';
import { Room, University } from '../types';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  onAddRoom: (room: Room) => Promise<any> | any;
  onUpdateRoom: (room: Room, oldId?: string) => Promise<any> | any;
  onDeleteRoom: (roomId: string) => void;
  onSelectRoomOnMap: (room: Room) => void;
  universities: University[];
  onAddUniversity: (uni: University) => Promise<{ success: boolean; message?: string }> | any;
  feedbackUrl: string;
  onUpdateFeedbackUrl: (url: string) => Promise<void> | void;
}

// Hàm phân tích và dọn dẹp địa chỉ để tạo danh sách các chuỗi tìm kiếm từ chi tiết đến tổng quát cho OSM Nominatim
export function getGeocodeQueries(addressText: string): string[] {
  const queries: string[] = [];
  const raw = addressText.trim();
  if (!raw) return queries;

  // Đảm bảo có Hà Nội cuối câu
  const withHaNoi = raw.toLowerCase().includes("hà nội") ? raw : `${raw}, Hà Nội`;
  queries.push(withHaNoi);

  // Hàm dọn dẹp các đơn vị hành chính gây khó khăn cho OSM Nominatim
  const cleanAdminUnits = (s: string) => {
    return s
      .replace(/(?:phường|p\.)\s+/gi, '')
      .replace(/(?:quận|q\.)\s+/gi, '')
      .replace(/(?:thành phố|tp\.)\s+/gi, '')
      .replace(/(?:thị xã|tx\.)\s+/gi, '')
      .replace(/(?:thị trấn|tt\.)\s+/gi, '')
      .replace(/(?:đường|đ\.)\s+/gi, '')
      .replace(/(?:phố)\s+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const cleanedBase = cleanAdminUnits(withHaNoi);
  if (cleanedBase && cleanedBase !== withHaNoi) {
    queries.push(cleanedBase);
  }

  // Tách các thành phần bằng dấu phẩy
  const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
  
  // Thử rút ngắn bằng cách bỏ số nhà/ngõ ngách ở phần đầu tiên (nếu có số nhà)
  if (parts.length > 0) {
    const firstPart = parts[0];
    const firstPartCleaned = firstPart
      .replace(/^\d+[\/\d]*\s+/, '')
      .replace(/(?:ngõ|ngách|hẻm)\s+\d+[\/\d]*\s+/, '');
    if (firstPartCleaned && firstPartCleaned !== firstPart) {
      const simplifiedParts = [firstPartCleaned, ...parts.slice(1)];
      const simplifiedAddress = simplifiedParts.join(', ');
      const simplifiedWithHaNoi = simplifiedAddress.toLowerCase().includes("hà nội") ? simplifiedAddress : `${simplifiedAddress}, Hà Nội`;
      queries.push(simplifiedWithHaNoi);
      
      const cleanedSimplified = cleanAdminUnits(simplifiedWithHaNoi);
      if (cleanedSimplified) {
        queries.push(cleanedSimplified);
      }
    }
  }

  // Thử lấy các phần sau (bỏ dần phần đầu tiên, ví dụ bỏ số nhà + tên đường, lấy phường quận)
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i++) {
      const subAddress = parts.slice(i).join(', ');
      const subWithHaNoi = subAddress.toLowerCase().includes("hà nội") ? subAddress : `${subAddress}, Hà Nội`;
      if (!queries.includes(subWithHaNoi)) {
        queries.push(subWithHaNoi);
      }
      const cleanedSub = cleanAdminUnits(subWithHaNoi);
      if (cleanedSub && !queries.includes(cleanedSub)) {
        queries.push(cleanedSub);
      }
    }
  }

  // Lọc trùng và trả về danh sách truy vấn tối đa 10 cái
  return Array.from(new Set(queries)).filter(q => q.length > 4).slice(0, 10);
}

export default function AdminDashboard({
  isOpen,
  onClose,
  rooms,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
  onSelectRoomOnMap,
  universities,
  onAddUniversity,
  feedbackUrl,
  onUpdateFeedbackUrl,
}: AdminDashboardProps) {
  // Quản lý Tab: 'rooms' (Quản lý phòng trọ) | 'universities' (Quản lý trường học) | 'settings' (Cài đặt hệ thống)
  const [activeTab, setActiveTab] = useState<'rooms' | 'universities' | 'settings'>('rooms');

  // State quản lý feedback link
  const [tempFeedbackUrl, setTempFeedbackUrl] = useState(feedbackUrl);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');

  useEffect(() => {
    setTempFeedbackUrl(feedbackUrl);
  }, [feedbackUrl]);

  // State quản lý danh sách và form phòng
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  
  // State của Form phòng trọ
  const [roomId, setRoomId] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [priceType, setPriceType] = useState<'fixed' | 'range'>('fixed');
  const [priceMax, setPriceMax] = useState<number | ''>('');
  const [priceUnit, setPriceUnit] = useState<'vnd' | 'million'>('vnd');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | ''>('');
  const [lng, setLng] = useState<number | ''>('');
  const [image, setImage] = useState(''); // Ảnh đại diện chính
  const [imagesList, setImagesList] = useState<string[]>([]); // Danh sách nhiều ảnh chi tiết
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('0987654321');
  const [zalo, setZalo] = useState('0987654321');
  const [area, setArea] = useState<number | ''>('');
  const [gender, setGender] = useState<'Tất cả' | 'Nam' | 'Nữ'>('Tất cả');
  const [amenities, setAmenities] = useState<string[]>(['Wifi', 'Nóng lạnh', 'Tự do']);

  // State của Form Đại học mới
  const [uniName, setUniName] = useState('');
  const [uniShortName, setUniShortName] = useState('');
  const [uniAddress, setUniAddress] = useState('');
  const [uniLat, setUniLat] = useState<number | ''>('');
  const [uniLng, setUniLng] = useState<number | ''>('');
  const [uniError, setUniError] = useState('');
  const [uniSuccess, setUniSuccess] = useState('');
  const [isGettingCoords, setIsGettingCoords] = useState(false);
  
  // Upload States
  const [isDragging, setIsDragging] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'link'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState('');
  const [geocodeSuccessMsg, setGeocodeSuccessMsg] = useState('');
  const [isGettingRoomCoords, setIsGettingRoomCoords] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

  // Refs quản lý bản đồ mini
  const miniMapRef = useRef<L.Map | null>(null);
  const miniMarkerRef = useRef<L.Marker | null>(null);

  // Hiệu ứng khởi tạo bản đồ mini khi chuyển sang form thêm/sửa phòng trọ
  useEffect(() => {
    if (!isEditing || activeTab !== 'rooms' || !isOpen) {
      if (miniMapRef.current) {
        miniMapRef.current.remove();
        miniMapRef.current = null;
        miniMarkerRef.current = null;
      }
      return;
    }

    // Chờ DOM hiển thị rồi mới vẽ bản đồ Leaflet
    const timer = setTimeout(() => {
      const container = document.getElementById('mini-map');
      if (!container || miniMapRef.current) return;

      const initialLat = Number(lat) || 21.0016;
      const initialLng = Number(lng) || 105.8428;

      try {
        const map = L.map('mini-map', {
          center: [initialLat, initialLng],
          zoom: 15,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        const customIcon = L.divIcon({
          className: 'custom-mini-icon',
          html: `<div class="w-7 h-7 bg-indigo-600 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-xs">🏠</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        });

        const marker = L.marker([initialLat, initialLng], {
          icon: customIcon,
          draggable: true,
        }).addTo(map);

        // Kéo thả ghim để chọn vị trí chính xác
        marker.on('dragend', () => {
          const position = marker.getLatLng();
          setLat(Number(position.lat.toFixed(6)));
          setLng(Number(position.lng.toFixed(6)));
        });

        // Nhấp vào bản đồ để chọn tọa độ nhanh
        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setLat(Number(lat.toFixed(6)));
          setLng(Number(lng.toFixed(6)));
        });

        miniMapRef.current = map;
        miniMarkerRef.current = marker;
      } catch (err) {
        console.error('Lỗi khi vẽ bản đồ mini:', err);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      if (miniMapRef.current) {
        miniMapRef.current.remove();
        miniMapRef.current = null;
        miniMarkerRef.current = null;
      }
    };
  }, [isEditing, activeTab, isOpen]);

  // Đồng bộ vị trí ghim khi lat/lng trong form thay đổi
  useEffect(() => {
    if (miniMapRef.current && miniMarkerRef.current && lat !== '' && lng !== '') {
      const newPos: [number, number] = [Number(lat), Number(lng)];
      try {
        miniMarkerRef.current.setLatLng(newPos);
        miniMapRef.current.setView(newPos, miniMapRef.current.getZoom());
      } catch (err) {
        console.warn('Lỗi cập nhật marker bản đồ mini:', err);
      }
    }
  }, [lat, lng]);

  // Hàm nén ảnh tự động bằng Canvas xuống mức dung lượng tối thiểu (JPEG 0.4)
  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // kích thước vừa đủ cho phòng trọ trên mobile/desktop
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Nén mạnh xuống chất lượng JPEG 0.5 để siêu nhẹ (khoảng vài chục KB)
          const compressed = canvas.toDataURL('image/jpeg', 0.5);
          resolve(compressed);
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  if (!isOpen) return null;

  // Lọc phòng theo tìm kiếm của Admin
  const filteredRooms = rooms.filter(room => 
    room.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Mở form thêm phòng mới
  const handleOpenAddForm = () => {
    // Tự động sinh ID phòng ngẫu nhiên dạng LTxxxxxx
    const randomId = `LT${Math.floor(10000000 + Math.random() * 90000000)}`;
    setRoomId(randomId);
    setTitle('');
    setPrice('');
    setPriceType('fixed');
    setPriceMax('');
    setPriceUnit('vnd');
    setAddress('');
    setLat(21.0016);
    setLng(105.8428);
    const defaultImg = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=60';
    setImage(defaultImg);
    setImagesList([defaultImg]);
    setDescription('');
    setPhone('0987654321');
    setZalo('0987654321');
    setArea('');
    setGender('Tất cả');
    setAmenities(['Wifi', 'Nóng lạnh', 'Tự do']);
    setFormError('');
    setGeocodeSuccessMsg('');
    setIsEditing(true);
    setEditingRoom(null); // null nghĩa là thêm mới
  };

  // Mở form sửa phòng có sẵn
  const handleOpenEditForm = (room: Room) => {
    setRoomId(room.id);
    setTitle(room.title);
    if (room.price >= 100000 && room.price % 100000 === 0) {
      setPriceUnit('million');
      setPrice(room.price / 1000000);
      if (room.priceMax && room.priceMax > room.price) {
        setPriceType('range');
        setPriceMax(room.priceMax / 1000000);
      } else {
        setPriceType('fixed');
        setPriceMax('');
      }
    } else {
      setPriceUnit('vnd');
      setPrice(room.price);
      if (room.priceMax && room.priceMax > room.price) {
        setPriceType('range');
        setPriceMax(room.priceMax);
      } else {
        setPriceType('fixed');
        setPriceMax('');
      }
    }
    setAddress(room.address);
    setLat(room.lat);
    setLng(room.lng);
    setImage(room.image);
    const initialImages = Array.from(new Set([room.image, ...(room.images || [])])).filter(Boolean);
    setImagesList(initialImages);
    setDescription(room.description || '');
    setPhone(room.phone || '0987654321');
    setZalo(room.zalo || '0987654321');
    setArea(room.area !== undefined && room.area !== null ? room.area : '');
    setGender(room.gender || 'Tất cả');
    setAmenities(room.amenities || []);
    setFormError('');
    setIsEditing(true);
    setEditingRoom(room);
  };

  // Xử lý kéo thả file ảnh
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Xử lý nén và tải nhiều ảnh cùng lúc
  const processFiles = async (files: FileList) => {
    setFormError('Đang tải và tự động nén dung lượng các ảnh để đồng bộ siêu nhanh...');
    const compressedImages: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          if (e.target?.result) {
            try {
              const compressed = await compressImage(e.target.result as string);
              compressedImages.push(compressed);
            } catch (err) {
              console.error('Lỗi nén ảnh:', err);
              compressedImages.push(e.target.result as string);
            }
          }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    if (compressedImages.length > 0) {
      setImagesList((prev) => {
        // Lọc trùng và gộp ảnh mới vào
        const next = Array.from(new Set([...prev, ...compressedImages])).filter(Boolean);
        // Nếu chưa có ảnh đại diện chính hoặc ảnh đại diện không nằm trong danh sách thì lấy ảnh đầu tiên làm mặc định
        if (!image || !next.includes(image)) {
          setImage(next[0]);
        }
        return next;
      });
      setFormError('');
    } else {
      setFormError('Không chọn được tệp ảnh hợp lệ nào!');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  // Định vị tự động lấy tọa độ qua Nominatim API (tự động điền lat/lng)
  const handleGetRoomCoords = async () => {
    if (!address.trim()) {
      return;
    }
    setIsGettingRoomCoords(true);
    setFormError('');
    setGeocodeSuccessMsg('');
    
    const searchQueries = getGeocodeQueries(address);

    let found = false;
    for (const query of searchQueries) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
        const data = await res.json();
        if (data && data.length > 0) {
          const foundLat = parseFloat(data[0].lat);
          const foundLng = parseFloat(data[0].lon);
          setLat(Number(foundLat.toFixed(6)));
          setLng(Number(foundLng.toFixed(6)));
          setFormError('');
          setGeocodeSuccessMsg(`✅ Đã định vị thành công bằng từ khóa "${query}": Vĩ độ ${foundLat.toFixed(6)}, Kinh độ ${foundLng.toFixed(6)}!`);
          found = true;
          break; // Tìm thấy thì dừng lại
        }
      } catch (err) {
        console.warn(`Lỗi tìm kiếm với từ khóa "${query}":`, err);
      }
    }

    setIsGettingRoomCoords(false);

    if (!found) {
      setFormError('Không thể tự động định vị vị trí này. Vui lòng thử viết lại địa chỉ ngắn gọn (bỏ số nhà/ngõ ngách) hoặc tự ghim trên bản đồ nhỏ dưới đây!');
    }
  };

  // Thêm/bớt tiện ích
  const toggleAmenity = (amenity: string) => {
    if (amenities.includes(amenity)) {
      setAmenities(amenities.filter(a => a !== amenity));
    } else {
      setAmenities([...amenities, amenity]);
    }
  };

  // Lưu Form phòng trọ đồng bộ hóa real-time
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Kiểm tra dữ liệu hợp lệ
    if (!roomId.trim()) return setFormError('Vui lòng nhập Mã phòng!');
    if (!title.trim()) return setFormError('Vui lòng nhập Tiêu đề phòng!');
    
    const finalPrice = priceUnit === 'million' ? Number(price) * 1000000 : Number(price);
    const finalPriceMax = priceType === 'range' && priceMax !== '' ? (priceUnit === 'million' ? Number(priceMax) * 1000000 : Number(priceMax)) : undefined;

    if (price === '' || finalPrice <= 0) return setFormError('Giá phòng phải lớn hơn 0!');
    
    if (priceType === 'range') {
      if (priceMax === '' || finalPriceMax === undefined || finalPriceMax <= 0) {
        return setFormError('Giá tối đa phải lớn hơn 0!');
      }
      if (finalPriceMax <= finalPrice) {
        return setFormError('Giá tối đa phải lớn hơn Giá tối thiểu (từ)!');
      }
    }

    if (!address.trim()) return setFormError('Vui lòng nhập Địa chỉ chi tiết!');
    if (lat === '' || lat < -90 || lat > 90) return setFormError('Vĩ độ (Latitude) không hợp lệ (-90 đến 90)!');
    if (lng === '' || lng < -180 || lng > 180) return setFormError('Kinh độ (Longitude) không hợp lệ (-180 đến 180)!');
    if (!image.trim()) return setFormError('Vui lòng dán link ảnh hoặc tải ảnh lên!');

    const newRoomData: Room = {
      id: roomId,
      title,
      price: finalPrice,
      priceMax: finalPriceMax,
      address,
      lat: Number(lat),
      lng: Number(lng),
      image, // Ảnh đại diện chính được chọn
      images: imagesList.filter((img) => img !== image), // Danh sách ảnh phụ/chi tiết (đã loại trừ ảnh chính)
      description,
      phone,
      zalo,
      area: area !== '' ? Number(area) : undefined,
      gender,
      amenities,
    };

    setFormError('Đang tiến hành lưu phòng trọ...');

    if (editingRoom) {
      // Cập nhật phòng hiện có, truyền thêm ID cũ (editingRoom.id) để hỗ trợ đổi ID phòng trọ
      const result = await onUpdateRoom(newRoomData, editingRoom.id);
      if (result && !result.success) {
        setFormError(result.message || 'Lỗi cập nhật thông tin phòng trọ!');
        return;
      }
    } else {
      // Thêm mới phòng và kiểm tra ID trùng
      if (rooms.some(r => r.id === roomId)) {
        return setFormError('Mã phòng này đã tồn tại trên hệ thống!');
      }
      const result = await onAddRoom(newRoomData);
      if (result && !result.success) {
        setFormError(result.message || 'Lỗi đăng tin phòng trọ mới!');
        return;
      }
    }

    setFormError('');
    setIsEditing(false);
    setEditingRoom(null);
  };

  const availableAmenities = [
    'Điều hòa', 'Nóng lạnh', 'Wifi', 'Máy giặt', 'Khóa vân tay', 
    'Tự do', 'Để xe tầng 1', 'Ban công', 'Tủ lạnh', 'Thang máy'
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in pointer-events-auto">
      <div 
        className="w-full max-w-5xl h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 rounded-lg">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                Bảng Quản Trị Hệ Thống
                <span className="text-[10px] bg-emerald-500 text-slate-900 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">Admin Mode</span>
              </h2>
              <p className="text-xs text-slate-400">Thêm, sửa, xóa và cập nhật tức thì phòng trọ trên bản đồ</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sub-Header Tabs */}
        <div className="flex bg-slate-100 border-b border-slate-200 px-5 py-2 shrink-0 gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab('rooms'); setIsEditing(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'rooms' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            🏠 Quản lý phòng trọ
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('universities'); setIsEditing(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'universities' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            🎓 Quản lý Trường Đại học
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('settings'); setIsEditing(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            ⚙️ Cấu hình hệ thống
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'rooms' ? (
            isEditing ? (
              /* --- FORM THÊM / SỬA PHÒNG TRỌ --- */
            <form onSubmit={handleSaveRoom} className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full"></span>
                    {editingRoom ? 'Cập nhật thông tin phòng trọ' : 'Thêm mới phòng trọ vào hệ thống'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-lg cursor-pointer transition-colors"
                  >
                    Quay lại danh sách
                  </button>
                </div>

                {formError && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold animate-pulse">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Grid Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Mã phòng & Tiêu đề */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex justify-between items-center">
                      <span>Mã phòng trọ</span>
                      {editingRoom && <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-md">Cho phép sửa</span>}
                    </label>
                    <input
                      type="text"
                      required
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      placeholder="Ví dụ: LT00035055"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-xl font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Tiêu đề tin đăng phòng</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ví dụ: Studio cao cấp gác lửng thoáng mát ngõ Phú Mỹ..."
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-xl font-medium text-slate-800"
                    />
                  </div>

                  {/* Giá phòng & Diện tích & Đối tượng */}
                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-3.5 rounded-2xl border border-slate-200/50">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">Hình thức đặt giá</label>
                      <div className="flex bg-slate-200/60 p-1 rounded-xl gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setPriceType('fixed');
                            setPriceMax('');
                          }}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            priceType === 'fixed'
                              ? 'bg-white text-indigo-600 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Giá cố định
                        </button>
                        <button
                          type="button"
                          onClick={() => setPriceType('range')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            priceType === 'range'
                              ? 'bg-white text-indigo-600 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Giá dao động
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-700 block">
                          {priceType === 'fixed' ? 'Mức giá cố định' : 'Khoảng giá dao động'}
                        </label>
                        <div className="flex bg-slate-200/50 p-0.5 rounded-lg border border-slate-300/30">
                          <button
                            type="button"
                            onClick={() => {
                              if (priceUnit === 'million') {
                                setPriceUnit('vnd');
                                if (price !== '') setPrice(Math.round(Number(price) * 1000000));
                                if (priceMax !== '') setPriceMax(Math.round(Number(priceMax) * 1000000));
                              }
                            }}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                              priceUnit === 'vnd'
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            đ
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (priceUnit === 'vnd') {
                                setPriceUnit('million');
                                if (price !== '') setPrice(Number(price) / 1000000);
                                if (priceMax !== '') setPriceMax(Number(priceMax) / 1000000);
                              }
                            }}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                              priceUnit === 'million'
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Triệu
                          </button>
                        </div>
                      </div>

                      {priceType === 'fixed' ? (
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            required
                            value={price}
                            onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder={priceUnit === 'million' ? "Ví dụ: 2.7" : "Ví dụ: 2700000"}
                            className="w-full pl-3 pr-24 py-2 text-sm bg-white border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-xl font-bold text-indigo-600"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            {priceUnit === 'million' ? 'triệu đ/tháng' : 'đ/tháng'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              step="any"
                              required
                              value={price}
                              onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="Từ"
                              className="w-full pl-2 pr-10 py-2 text-xs bg-white border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-xl font-bold text-indigo-600 text-center"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">
                              {priceUnit === 'million' ? 'tr' : 'đ'}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-slate-400 shrink-0">đến</span>
                          <div className="relative flex-1">
                            <input
                              type="number"
                              step="any"
                              required
                              value={priceMax}
                              onChange={(e) => setPriceMax(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="Đến"
                              className="w-full pl-2 pr-10 py-2 text-xs bg-white border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-xl font-bold text-indigo-600 text-center"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">
                              {priceUnit === 'million' ? 'tr' : 'đ'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Diện tích phòng (m²)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={area}
                        onChange={(e) => setArea(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Ví dụ: 20 (Để trống nếu chưa rõ)"
                        className="w-full pl-3 pr-10 py-2 text-sm bg-white border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-xl"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">m²</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Đối tượng thuê phù hợp</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-xl cursor-pointer"
                    >
                      <option value="Tất cả">Tất cả đối tượng (Nam & Nữ)</option>
                      <option value="Nam">Chỉ dành cho Nam</option>
                      <option value="Nữ">Chỉ dành cho Nữ</option>
                    </select>
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MapPin size={13} className="text-indigo-600" />
                        Địa chỉ chi tiết phòng trọ
                      </span>
                      <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md">
                        Mẹo: Ghi rõ số nhà, tên đường để máy chủ nhận diện chính xác nhất
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        onBlur={handleGetRoomCoords}
                        placeholder="Ví dụ: 74 Đ. Phú Mỹ, Mỹ Đình 2, Nam Từ Liêm, Hà Nội"
                        className="w-full pl-3 pr-40 py-2.5 text-sm bg-white border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-xl text-slate-800 font-medium"
                      />
                      <button
                        type="button"
                        onClick={handleGetRoomCoords}
                        disabled={isGettingRoomCoords}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50/80 hover:bg-indigo-100/90 px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-50 border border-indigo-100"
                      >
                        {isGettingRoomCoords ? (
                          <RefreshCw size={12} className="animate-spin text-indigo-600" />
                        ) : (
                          <Search size={12} />
                        )}
                        {isGettingRoomCoords ? 'Đang định vị...' : 'Lấy tọa độ tự động'}
                      </button>
                    </div>

                    {geocodeSuccessMsg && (
                      <p className="text-[11px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl animate-pulse">
                        <span>{geocodeSuccessMsg}</span>
                      </p>
                    )}

                    {/* Khung bản đồ mini Leaflet trực quan */}
                    <div className="mt-2 space-y-1 bg-white p-2 rounded-2xl border border-slate-200/80">
                      <div id="mini-map" className="h-[180px] w-full rounded-xl border border-slate-100 shadow-inner z-10" style={{ minHeight: '180px' }}></div>
                      <p className="text-[10px] text-slate-400 italic font-medium flex items-center gap-1 pl-1">
                        <span>💡</span> Bạn có thể nhấp chuột trực tiếp lên bản đồ hoặc kéo thả ghim màu xanh trên bản đồ nhỏ này để tinh chỉnh vị trí phòng trọ chính xác đến từng mét!
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700">Vĩ độ (Latitude)</label>
                      <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 rounded">Gợi ý: 21.0xxxx</span>
                    </div>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={lat}
                      onChange={(e) => setLat(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="21.0322"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-xl font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700">Kinh độ (Longitude)</label>
                      <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 rounded">Gợi ý: 105.7xxxx</span>
                    </div>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={lng}
                      onChange={(e) => setLng(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="105.7745"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-xl font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Số điện thoại cuộc gọi</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0987654321"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-xl font-semibold text-slate-700"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-3">
                    <label className="text-xs font-bold text-slate-700">Số điện thoại / Link Zalo</label>
                    <input
                      type="text"
                      required
                      value={zalo}
                      onChange={(e) => setZalo(e.target.value)}
                      placeholder="0987654321"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 focus:border-indigo-500 focus:outline-none rounded-xl font-semibold text-slate-700"
                    />
                  </div>
                </div>

                {/* Tiện ích phòng trọ */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">Tiện ích phòng trọ đi kèm</label>
                  <div className="flex flex-wrap gap-2">
                    {availableAmenities.map((amenity) => {
                      const hasAmenity = amenities.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => toggleAmenity(amenity)}
                          className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                            hasAmenity 
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100' 
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {hasAmenity && <Check size={12} />}
                          {amenity}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Ô QUẢN LÝ NHIỀU ẢNH (Upload / Link URL) */}
                <div className="space-y-3 p-4 bg-slate-100/60 rounded-2xl border border-slate-200/50">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <ImageIcon size={14} className="text-indigo-600" />
                        Danh sách hình ảnh phòng trọ ({imagesList.length} ảnh)
                      </label>
                      <p className="text-[10px] text-slate-500">
                        Nên tải lên 3-5 ảnh chi tiết. <strong className="text-indigo-600">Bấm ⭐ trên ảnh</strong> để thiết lập ảnh đại diện hiển thị ngoài trang chủ.
                      </p>
                    </div>
                    <div className="flex border border-slate-200 rounded-lg p-0.5 bg-white text-xs font-semibold self-stretch sm:self-auto justify-center">
                      <button
                        type="button"
                        onClick={() => setImageInputMode('upload')}
                        className={`px-3 py-1 rounded-md cursor-pointer transition-colors ${imageInputMode === 'upload' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        Tải file ảnh
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageInputMode('link')}
                        className={`px-3 py-1 rounded-md cursor-pointer transition-colors ${imageInputMode === 'link' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        Dán link URL
                      </button>
                    </div>
                  </div>

                  {imageInputMode === 'upload' ? (
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[110px] ${
                        isDragging 
                          ? 'border-indigo-600 bg-indigo-50/50' 
                          : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
                      }`}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect}
                        accept="image/*"
                        multiple
                        className="hidden" 
                      />
                      <div className="space-y-1.5">
                        <div className="p-2.5 bg-indigo-50 rounded-full text-indigo-600 inline-block">
                          <Upload size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700">Kéo thả nhiều file ảnh vào đây hoặc nhấp để chọn tệp</p>
                          <p className="text-[10px] text-slate-400">Hệ thống tự nén dung lượng để tải siêu nhanh. Hỗ trợ chọn nhiều ảnh cùng lúc.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Link size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="url"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="Dán link ảnh tại đây (ví dụ: https://images.unsplash.com/photo-...)"
                          className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-xl font-mono text-slate-600"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (urlInput.trim()) {
                            setImagesList(prev => {
                              const next = Array.from(new Set([...prev, urlInput.trim()])).filter(Boolean);
                              if (!image || !next.includes(image)) {
                                setImage(next[0]);
                              }
                              return next;
                            });
                            setUrlInput('');
                          }
                        }}
                        className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer transition-colors shrink-0 shadow-sm"
                      >
                        Thêm link
                      </button>
                    </div>
                  )}

                  {/* Hiển thị lưới hình ảnh trực quan */}
                  {imagesList.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Danh sách hình ảnh ({imagesList.length}):</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3.5">
                        {imagesList.map((img, index) => {
                          const isMain = image === img;
                          return (
                            <div 
                              key={index}
                              className={`group relative h-20 bg-white rounded-xl overflow-hidden border-2 transition-all ${
                                isMain 
                                  ? 'border-indigo-600 ring-2 ring-indigo-600/10 shadow-md scale-[1.02]' 
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <img 
                                src={img} 
                                alt={`Ảnh ${index + 1}`} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              
                              {/* Overlay điều khiển nhanh khi hover */}
                              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                {/* Đặt làm đại diện */}
                                <button
                                  type="button"
                                  onClick={() => setImage(img)}
                                  title="Đặt làm ảnh đại diện chính"
                                  className={`p-1 text-xs rounded-md transition-transform active:scale-95 cursor-pointer ${
                                    isMain 
                                      ? 'bg-amber-400 text-white font-bold' 
                                      : 'bg-white text-slate-800 font-bold hover:bg-slate-100'
                                  }`}
                                >
                                  ⭐
                                </button>
                                {/* Xóa ảnh */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = imagesList.filter(i => i !== img);
                                    setImagesList(next);
                                    if (isMain && next.length > 0) {
                                      setImage(next[0]);
                                    } else if (next.length === 0) {
                                      setImage('');
                                    }
                                  }}
                                  title="Xóa hình ảnh này"
                                  className="p-1 text-xs bg-rose-600 text-white rounded-md hover:bg-rose-700 active:scale-95 cursor-pointer font-extrabold"
                                >
                                  ✕
                                </button>
                              </div>

                              {/* Nhãn ảnh đại diện chính */}
                              {isMain && (
                                <span className="absolute bottom-1 left-1 bg-indigo-600 text-white text-[8px] px-1 rounded font-bold shadow-sm">
                                  Ảnh chính
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Mô tả chi tiết phòng trọ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Mô tả chi tiết về phòng</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Nhập mô tả cụ thể về giờ giấc, an ninh, giá điện nước, các tiện ích xung quanh để thu hút sinh viên..."
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-xl"
                  />
                </div>
              </div>

              {/* Form Bottom Bar */}
              <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md hover:shadow-indigo-100"
                >
                  <Save size={14} />
                  {editingRoom ? 'Lưu cập nhật' : 'Thêm phòng mới'}
                </button>
              </div>
            </form>
          ) : (
            /* --- DANH SÁCH PHÒNG TRỌ (BẢNG TRỰC QUAN) --- */
            <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
              {/* Table search & action toolbars */}
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm theo Mã hoặc Tiêu đề..."
                    className="w-full pl-8 pr-4 py-1.5 text-xs bg-white border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-lg"
                  />
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleOpenAddForm}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer shadow-sm shadow-indigo-100"
                  >
                    <Plus size={14} />
                    Đăng tin phòng mới
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="flex-1 overflow-auto">
                {filteredRooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <RefreshCw size={32} className="animate-spin mb-3 text-slate-300" />
                    <p className="text-sm font-semibold">Không tìm thấy phòng trọ nào trùng khớp!</p>
                    <p className="text-xs text-slate-400 mt-1">Hãy thử tìm kiếm với từ khóa khác.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                        <th className="p-4 w-12 text-center">Ảnh</th>
                        <th className="p-4">Mã số / Tiêu đề phòng</th>
                        <th className="p-4">Giá phòng</th>
                        <th className="p-4 hidden md:table-cell">Địa chỉ chi tiết</th>
                        <th className="p-4 text-center w-36">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                      {filteredRooms.map((room) => (
                        <tr key={room.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-center">
                            <img 
                              src={room.image} 
                              alt="Thumbnail" 
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200 inline-block shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                          </td>
                          <td className="p-4">
                            <div className="font-mono font-bold text-indigo-600 text-[11px] bg-indigo-50 px-1.5 py-0.5 rounded inline-block mb-1">
                              {room.id}
                            </div>
                            <div className="font-bold text-slate-800 line-clamp-1 max-w-[260px] md:max-w-xs">{room.title}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <span>Diện tích: {room.area ? `${room.area}m²` : 'Chưa rõ'}</span>
                              <span>•</span>
                              <span>{room.gender}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-extrabold text-indigo-600">
                              {room.priceMax && room.priceMax > room.price
                                ? `${room.price.toLocaleString('vi-VN')} - ${room.priceMax.toLocaleString('vi-VN')}`
                                : room.price.toLocaleString('vi-VN')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">/tháng</span>
                          </td>
                          <td className="p-4 text-slate-500 hidden md:table-cell max-w-xs truncate">
                            {room.address}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* View on map */}
                              <button
                                onClick={() => {
                                  onSelectRoomOnMap(room);
                                  onClose();
                                }}
                                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg cursor-pointer transition-colors"
                                title="Định vị xem trên bản đồ"
                              >
                                <Eye size={14} />
                              </button>
                              
                              {/* Edit */}
                              <button
                                onClick={() => handleOpenEditForm(room)}
                                className="p-1.5 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg cursor-pointer transition-colors"
                                title="Chỉnh sửa phòng"
                              >
                                <Edit2 size={14} />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setRoomToDelete(room);
                                }}
                                className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                                title="Xóa tin đăng phòng"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer status summary info */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 text-xs text-slate-500 flex justify-between items-center">
                <span>Tổng số phòng hiện có: <strong className="font-bold text-slate-800">{rooms.length} phòng</strong></span>
                <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Cập nhật tức thì</span>
              </div>
            </div>
          )) : activeTab === 'universities' ? (
            /* --- QUẢN LÝ TRƯỜNG ĐẠI HỌC (ĐỒNG BỘ REAL-TIME) --- */
            <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-slate-50 animate-fade-in">
              {/* Form thêm trường đại học ở bên trái */}
              <div className="w-full md:w-96 p-6 border-r border-slate-200 bg-white overflow-y-auto space-y-5 flex flex-col shrink-0">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
                    <GraduationCap size={16} className="text-indigo-600" />
                    Thêm Trường Đại học mới
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">Thêm trường mới để tự động cập nhật hệ thống tìm kiếm bán kính.</p>
                </div>

                {uniError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-medium flex items-start gap-1.5 animate-pulse">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{uniError}</span>
                  </div>
                )}

                {uniSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-medium flex items-start gap-1.5">
                    <Check size={14} className="shrink-0 mt-0.5" />
                    <span>{uniSuccess}</span>
                  </div>
                )}

                <div className="space-y-4 flex-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tên trường đại học</label>
                    <input
                      type="text"
                      value={uniName}
                      onChange={(e) => setUniName(e.target.value)}
                      placeholder="Ví dụ: Đại học Thăng Long"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl font-semibold transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tên viết tắt / Mã</label>
                    <input
                      type="text"
                      value={uniShortName}
                      onChange={(e) => setUniShortName(e.target.value)}
                      placeholder="Ví dụ: TLU"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl font-mono font-bold uppercase transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Địa chỉ chi tiết</label>
                    <textarea
                      rows={2}
                      value={uniAddress}
                      onChange={(e) => setUniAddress(e.target.value)}
                      placeholder="Số 9 Nghiêm Xuân Yêm, Hoàng Mai, Hà Nội"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl font-semibold transition-all"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isGettingCoords || (!uniAddress.trim() && !uniName.trim())}
                    onClick={async () => {
                      setIsGettingCoords(true);
                      setUniError('');
                      setUniSuccess('');
                      
                      const searchQueries: string[] = [];
                      const cleanName = uniName.trim();
                      const cleanShortName = uniShortName.trim();
                      const cleanAddress = uniAddress.trim();
                      
                      // 1. Thử tìm theo tên trường đại học đầy đủ (khả năng trúng cao nhất trên OSM)
                      if (cleanName) {
                        searchQueries.push(cleanName.toLowerCase().includes("hà nội") ? cleanName : `${cleanName}, Hà Nội`);
                        const noTrương = cleanName.replace(/^(?:Trường\s+)/i, '');
                        if (noTrương !== cleanName) {
                          searchQueries.push(noTrương.toLowerCase().includes("hà nội") ? noTrương : `${noTrương}, Hà Nội`);
                        }
                      }
                      
                      // 2. Thử tìm theo tên viết tắt
                      if (cleanShortName) {
                        searchQueries.push(`Đại học ${cleanShortName}, Hà Nội`);
                        searchQueries.push(`${cleanShortName}, Hà Nội`);
                      }
                      
                      // 3. Thử tìm theo danh sách địa chỉ fallback thông minh
                      if (cleanAddress) {
                        const addressQueries = getGeocodeQueries(cleanAddress);
                        searchQueries.push(...addressQueries);
                      }
                      
                      const uniqueQueries = Array.from(new Set(searchQueries.map(q => q.trim()))).filter(q => q.length > 2);
                      
                      let found = false;
                      for (const query of uniqueQueries) {
                        try {
                          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
                          const data = await res.json();
                          if (data && data.length > 0) {
                            const foundLat = parseFloat(data[0].lat);
                            const foundLng = parseFloat(data[0].lon);
                            setUniLat(Number(foundLat.toFixed(6)));
                            setUniLng(Number(foundLng.toFixed(6)));
                            setUniSuccess(`✅ Định vị thành công bằng từ khóa "${query}"!`);
                            setTimeout(() => setUniSuccess(''), 4000);
                            found = true;
                            break;
                          }
                        } catch (err) {
                          console.warn(`Lỗi tìm trường với từ khóa "${query}":`, err);
                        }
                      }
                      
                      setIsGettingCoords(false);
                      if (!found) {
                        setUniError('Không thể tự động tìm tọa độ cho trường này. Vui lòng tự điền tay tọa độ (Vĩ độ / Kinh độ)!');
                      }
                    }}
                    className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isGettingCoords ? (
                      <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      '🔍 Định vị lấy tọa độ tự động'
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Vĩ độ (Lat)</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={uniLat}
                        onChange={(e) => setUniLat(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="21.0016"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl font-mono transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Kinh độ (Lng)</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={uniLng}
                        onChange={(e) => setUniLng(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="105.8428"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl font-mono transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      setUniError('');
                      setUniSuccess('');
                      if (!uniName.trim() || !uniShortName.trim() || !uniAddress.trim() || uniLat === '' || uniLng === '') {
                        setUniError('Vui lòng nhập đầy đủ các thông tin và tọa độ!');
                        return;
                      }
                      
                      const result = await onAddUniversity({
                        id: uniShortName.toLowerCase().trim().replace(/\s+/g, '_'),
                        name: uniName.trim(),
                        shortName: uniShortName.trim().toUpperCase(),
                        lat: Number(uniLat),
                        lng: Number(uniLng),
                        address: uniAddress.trim()
                      });
                      
                      if (result && result.success) {
                        setUniSuccess('Thêm trường đại học mới thành công!');
                        // Reset form
                        setUniName('');
                        setUniShortName('');
                        setUniAddress('');
                        setUniLat('');
                        setUniLng('');
                        setTimeout(() => setUniSuccess(''), 3000);
                      } else {
                        setUniError(result?.message || 'Có lỗi xảy ra khi thêm trường đại học!');
                      }
                    }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} /> Thêm trường mới vào hệ thống
                  </button>
                </div>
              </div>

              {/* Danh sách trường đại học ở bên phải */}
              <div className="flex-1 p-6 flex flex-col h-full bg-white overflow-hidden">
                <div className="mb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Danh sách trường Đại học hiện có ({universities.length})</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Các trường được đồng bộ trực tiếp thời gian thực tới tất cả máy chủ và máy trạm.</p>
                </div>
                
                <div className="flex-1 overflow-y-auto border border-slate-100 rounded-xl shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                        <th className="p-3 w-20">Mã / Viết tắt</th>
                        <th className="p-3">Tên đầy đủ trường</th>
                        <th className="p-3 hidden sm:table-cell">Địa chỉ chi tiết</th>
                        <th className="p-3 font-mono text-center w-36">Tọa độ (Lat, Lng)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 text-xs">
                      {universities.map((uni) => (
                        <tr key={uni.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-mono font-extrabold text-indigo-600">{uni.shortName}</td>
                          <td className="p-3 font-bold text-slate-800">{uni.name}</td>
                          <td className="p-3 text-slate-500 max-w-xs truncate hidden sm:table-cell" title={uni.address}>{uni.address}</td>
                          <td className="p-3 font-mono text-slate-400 text-[11px] text-center">{uni.lat.toFixed(4)}, {uni.lng.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* --- CẤU HÌNH HỆ THỐNG --- */
            <div className="flex-1 p-8 bg-slate-50 overflow-y-auto space-y-6">
              <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Settings size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Cấu hình chung hệ thống</h3>
                    <p className="text-[11px] text-slate-400">Điều chỉnh các liên kết động và cài đặt vận hành</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">Đường liên kết Góp ý & Đăng ký thêm phòng</label>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Địa chỉ URL biểu mẫu (Google Forms, Microsoft Forms, v.v.) sẽ mở ra khi người dùng bấm nút "Góp ý & Thêm phòng" ở góc trên màn hình để góp ý thêm phòng, chỉnh sửa hoặc báo lỗi bản đồ.
                    </p>
                    <input
                      type="url"
                      value={tempFeedbackUrl}
                      onChange={(e) => setTempFeedbackUrl(e.target.value)}
                      placeholder="Ví dụ: https://forms.gle/..."
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl font-bold transition-all"
                    />
                  </div>

                  {settingsSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold">
                      {settingsSuccess}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isSavingSettings || !tempFeedbackUrl.trim()}
                    onClick={async () => {
                      setIsSavingSettings(true);
                      setSettingsSuccess('');
                      try {
                        await onUpdateFeedbackUrl(tempFeedbackUrl.trim());
                        setSettingsSuccess('✅ Cập nhật đường link góp ý thành công và đồng bộ tức thì!');
                        setTimeout(() => setSettingsSuccess(''), 4500);
                      } catch (err) {
                        console.error(err);
                        setSettingsSuccess('❌ Lỗi cập nhật liên kết. Vui lòng thử lại!');
                      } finally {
                        setIsSavingSettings(false);
                      }
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-100 cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    {isSavingSettings ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Save size={13} />
                    )}
                    Lưu cấu hình hệ thống
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Confirm Delete Modal */}
      {roomToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-50 rounded-2xl text-rose-600 shrink-0">
                <Trash2 size={24} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">Xác nhận xóa phòng trọ</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Bạn có chắc chắn muốn xóa phòng trọ <strong className="text-slate-800 font-semibold">{roomToDelete.id}</strong> - <span className="font-semibold text-rose-600">{roomToDelete.title}</span> khỏi hệ thống không? Hành động này không thể hoàn tác.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRoomToDelete(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteRoom(roomToDelete.id);
                  setRoomToDelete(null);
                }}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-100 hover:shadow-rose-200 transition-all cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
