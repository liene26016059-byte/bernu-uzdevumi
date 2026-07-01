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
  apiKey: "IELIKT_SAVU_API_KEY",
  authDomain: "IELIKT_SAVU.firebaseapp.com",
  projectId: "IELIKT_SAVU_PROJECT_ID",
  storageBucket: "IELIKT_SAVU.appspot.com",
  messagingSenderId: "IELIKT_SAVU",
  appId: "IELIKT_SAVU_APP_ID"
};
