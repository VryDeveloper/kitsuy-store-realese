import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // opcional, se quiser usar imagens

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB92QbZa9aLYJ6Vhbam8HPxJln3FcI0FU0",
  authDomain: "kitsuystore-f2805.firebaseapp.com",
  projectId: "kitsuystore-f2805",
  storageBucket: "kitsuystore-f2805.appspot.com", // <- corrigido
  messagingSenderId: "812067288329",
  appId: "1:812067288329:web:ac4c1a048b1c5d5d3d8fd8",
  measurementId: "G-Y4DQYKBDW3"
};

// Inicializa o app
const app = initializeApp(firebaseConfig);

// Inicializa o Firestore (banco de dados)
export const db = getFirestore(app);

// Opcional: inicializa o Storage (para imagens)
export const storage = getStorage(app);
