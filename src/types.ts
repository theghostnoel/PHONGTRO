/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface University {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lng: number;
  address: string;
}

export interface Room {
  id: string; // ví dụ: "LT00035055"
  title: string; // ví dụ: "AT 74 Phú Mỹ - Studio"
  price: number; // giá tiền tối thiểu, ví dụ: 2700000 (đồng/tháng)
  priceMax?: number; // giá tiền tối đa (nếu là giá dao động)
  address: string; // địa chỉ chi tiết
  lat: number; // vĩ độ
  lng: number; // kinh độ
  image: string; // link ảnh hoặc base64
  images?: string[]; // danh sách nhiều ảnh chi tiết phòng trọ
  description?: string;
  phone?: string;
  zalo?: string;
  amenities?: string[]; // tiện ích (wifi, điều hòa, nóng lạnh,...)
  gender?: 'Tất cả' | 'Nam' | 'Nữ';
  area?: number; // diện tích m2
}

export interface SearchFilters {
  universityId: string;
  radius: number; // tính bằng mét
  minPrice: number;
  maxPrice: number;
  searchQuery: string;
}
