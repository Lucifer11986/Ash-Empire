// cloud.js — Firebase Cloud Save/Load
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export let db = null, auth = null, currentUser = null;
export const appId = 'lucifers-dominion-imperium';

export async function initFirebase() {
    try {
        const firebaseConfig = {
            apiKey: "AIzaSyCEK1vWNeP2m7iwMPfNcCE238d6oPydyiI",
            authDomain: "browsergame-3d397.firebaseapp.com",
            databaseURL: "https://browsergame-3d397-default-rtdb.europe-west1.firebasedatabase.app",
            projectId: "browsergame-3d397",
            storageBucket: "browsergame-3d397.firebasestorage.app",
            messagingSenderId: "825154831616",
            appId: "1:825154831616:web:7deabb55e0dd01e9095fe5",
            measurementId: "G-P4MSYB48MC"
        };
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        await signInAnonymously(auth);
        onAuthStateChanged(auth, user => {
            currentUser = user;
            let statusUI = document.getElementById('cloud-status');
            if(user && statusUI) {
                statusUI.innerText = "Cloud Status: Verbunden (ID: " + user.uid.substring(0,6) + "...)";
                statusUI.className = "text-xs text-green-400 font-bold uppercase text-center";
            }
        });
    } catch (e) {
        console.warn("Firebase Init Fehler:", e);
        let statusUI = document.getElementById('cloud-status');
        if(statusUI) {
            statusUI.innerText = "Cloud Fehler: " + (e.code || "Unbekannter Fehler");
            statusUI.className = "text-xs text-red-500 font-bold uppercase text-center";
        }
    }
}

export { doc, setDoc, getDoc };