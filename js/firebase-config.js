// ============================================================
// FIREBASE KONFIGURĀCIJA
// ============================================================
// Kamēr šeit ir šīs "IELIKT_..." vietturu vērtības, lietotne
// strādā LOKĀLAJĀ REŽĪMĀ (dati glabājas tikai šajā telefonā,
// nesinhronizējas ar citām ierīcēm).
//
// Lai iespējotu sinhronizāciju starp abu bērnu telefoniem,
// izveido bezmaksas Firebase projektu (skaties instrukciju,
// ko no manis saņēmi) un ielīmē šeit savu konfigurāciju no
// Firebase konsoles ("Project settings" -> "Your apps" -> "SDK setup").
//
// PĒC IELĪMĒŠANAS šo failu augšupielādē GitHub kopā ar pārējiem.
// ============================================================

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAHWH7ZGPsBXkkVPO7wbJGy0Z-fhMiklzA",
  authDomain: "bernu-uzdevumi.firebaseapp.com",
  projectId: "bernu-uzdevumi",
  storageBucket: "bernu-uzdevumi.firebasestorage.app",
  messagingSenderId: "306868175799",
  appId: "1:306868175799:web:e094536f070f76f9545e32"
};
