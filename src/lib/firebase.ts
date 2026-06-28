import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  initializeFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  setDoc,
  doc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  writeBatch
} from "firebase/firestore";
import firebaseConfigData from "../../firebase-applet-config.json";
import { Room, University } from "../types";
import { DEFAULT_ROOMS, UNIVERSITIES } from "../data/rooms";

// Cấu hình Firebase Client từ file config do AI Studio cấp
const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId
};

// Khởi tạo Firebase App tránh trùng lặp
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Khởi tạo Firestore với custom Database ID của AI Studio
const db = initializeFirestore(app, {}, firebaseConfigData.firestoreDatabaseId || "(default)");

export { db };

// Khởi tạo dữ liệu mẫu lên Firestore nếu rỗng (Seeding tự động)
export async function seedFirestoreIfNeeded(): Promise<void> {
  try {
    const roomsCol = collection(db, "rooms");
    const roomsSnap = await getDocs(roomsCol);
    
    if (roomsSnap.empty) {
      console.log("Firestore rooms collection is empty. Seeding DEFAULT_ROOMS...");
      const batch = writeBatch(db);
      DEFAULT_ROOMS.forEach((room) => {
        const roomRef = doc(db, "rooms", room.id);
        batch.set(roomRef, room);
      });
      await batch.commit();
      console.log("Successfully seeded rooms to Firestore.");
    }

    const unisCol = collection(db, "universities");
    const unisSnap = await getDocs(unisCol);
    if (unisSnap.empty) {
      console.log("Firestore universities collection is empty. Seeding UNIVERSITIES...");
      const batch = writeBatch(db);
      UNIVERSITIES.forEach((uni) => {
        const uniRef = doc(db, "universities", uni.id);
        batch.set(uniRef, uni);
      });
      await batch.commit();
      console.log("Successfully seeded universities to Firestore.");
    }
  } catch (error) {
    console.error("Lỗi khi seeding Firestore:", error);
  }
}

// 1. Hàm lắng nghe dữ liệu phòng trọ Real-time từ Firestore
export function subscribeRooms(callback: (rooms: Room[]) => void) {
  const roomsCol = collection(db, "rooms");
  return onSnapshot(roomsCol, (snapshot) => {
    const rooms: Room[] = [];
    snapshot.forEach((docSnap) => {
      rooms.push(docSnap.data() as Room);
    });
    // Sắp xếp theo ID hoặc bất kỳ trường nào cần thiết
    callback(rooms);
  }, (error) => {
    console.error("Lỗi subscription rooms:", error);
  });
}

// 2. Hàm lắng nghe dữ liệu đại học Real-time từ Firestore
export function subscribeUniversities(callback: (universities: University[]) => void) {
  const unisCol = collection(db, "universities");
  return onSnapshot(unisCol, (snapshot) => {
    const universities: University[] = [];
    snapshot.forEach((docSnap) => {
      universities.push(docSnap.data() as University);
    });
    callback(universities);
  }, (error) => {
    console.error("Lỗi subscription universities:", error);
  });
}

// Hàm dọn dẹp các trường mang giá trị undefined để tránh lỗi Firestore từ chối ghi nhận dữ liệu
function sanitizeData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeData) as unknown as T;
  }
  if (typeof obj === "object") {
    const clean: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          clean[key] = sanitizeData(val);
        }
      }
    }
    return clean as T;
  }
  return obj;
}

// 3. Thêm mới phòng trọ
export async function addRoomToFirebase(room: Room): Promise<void> {
  const roomRef = doc(db, "rooms", room.id);
  const cleanRoom = sanitizeData(room);
  await setDoc(roomRef, cleanRoom);
}

// 4. Cập nhật phòng trọ
export async function updateRoomInFirebase(room: Room): Promise<void> {
  const roomRef = doc(db, "rooms", room.id);
  const cleanRoom = sanitizeData(room);
  await setDoc(roomRef, cleanRoom);
}

// 5. Xóa phòng trọ
export async function deleteRoomFromFirebase(roomId: string): Promise<void> {
  const roomRef = doc(db, "rooms", roomId);
  await deleteDoc(roomRef);
}

// 6. Thêm mới trường đại học
export async function addUniversityToFirebase(uni: University): Promise<void> {
  const uniRef = doc(db, "universities", uni.id);
  const cleanUni = sanitizeData(uni);
  await setDoc(uniRef, cleanUni);
}

// 7. Xóa trường đại học
export async function deleteUniversityFromFirebase(uniId: string): Promise<void> {
  const uniRef = doc(db, "universities", uniId);
  await deleteDoc(uniRef);
}
