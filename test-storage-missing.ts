import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
const app = initializeApp({
  projectId: "gen-lang-client-0964398234",
  appId: "1:613454198738:web:441336e610f39a07733a0b",
  apiKey: "AIzaSyCqMyed5PhAsZsMdwKa76EGs_TCa7fgRJA",
  authDomain: "gen-lang-client-0964398234.firebaseapp.com",
});
try {
  const storage = getStorage(app);
  console.log("Storage initialized successfully");
} catch (e) {
  console.error(e);
}
