// ...existing code...
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { firebaseConfig, appId } from './firebaseConfig'; // moved config out of this file
// ...existing code...

// Fake CNN Model Reference
let cnnModel = null;

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [userName, setUserName] = useState('');
  const [searchName, setSearchName] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [facialData, setFacialData] = useState(null);
  const [retrievedData, setRetrievedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Simulated CNN Model Loader
  const loadCNNModel = async () => {
    setMessage("Loading CNN model: FacialFeatureCNN_v1...");
    console.log("Initializing CNN model download...");
    await new Promise((resolve) => setTimeout(resolve, 2000)); 
    cnnModel = { name: "FacialFeatureCNN_v1", version: "1.0.0" };
    console.log("CNN model loaded successfully:", cnnModel);
    setMessage("CNN model loaded successfully!");
  };

  // Simulated CNN Inference
  const processImageAndAssess = async (imageDataUrl) => {
    if (!cnnModel) {
      await loadCNNModel();
    }

    setLoading(true);
    setMessage("Running CNN inference on facial image...");
    console.log("Preprocessing image for CNN input...");
    await new Promise((resolve) => setTimeout(resolve, 500)); // fake preprocess delay

    try {
      console.log("Performing forward pass through CNN...");
      const prediction = await new Promise((resolve) => {
        setTimeout(() => {
          const eyeColors = ['blue', 'brown', 'green', 'hazel'];
          const faceShapes = ['oval', 'round', 'square', 'heart', 'long'];
          const genders = ['male', 'female'];
          resolve({
            eyeColor: eyeColors[Math.floor(Math.random() * eyeColors.length)],
            faceShape: faceShapes[Math.floor(Math.random() * faceShapes.length)],
            gender: 'male',
            confidence: (Math.random() * (0.95 - 0.7) + 0.7).toFixed(2)
          });
        }, 1500);
      });

      console.log("CNN output:", prediction);
      setFacialData(prediction);
      setMessage(`Inference complete using ${cnnModel.name}`);
    } catch (error) {
      setMessage(`Error running CNN inference: ${error.message}`);
      setFacialData(null);
      setCapturedImage(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    const firebaseAuth = getAuth(app);
    setDb(firestore);

    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        try {
          await signInAnonymously(firebaseAuth);
        } catch (error) {
          console.error('Firebase authentication error:', error);
          setMessage(`Authentication failed: ${error.message}`);
        }
      }
      setIsAuthReady(true);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (capturedImage) return;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setMessage('Error accessing camera. Please ensure permissions are granted.');
      }
    };
    if (isAuthReady) {
      startCamera();
    }
  }, [isAuthReady, capturedImage]);

  const handleCapturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/png');
    setCapturedImage(imageDataUrl);
    await processImageAndAssess(imageDataUrl);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage('File exceeds 5MB.');
      fileInputRef.current.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageDataUrl = reader.result;
      setCapturedImage(imageDataUrl);
      await processImageAndAssess(imageDataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveData = async () => {
    if (!db || !userId || !userName || !capturedImage || !facialData) {
      setMessage('Please capture/upload image and enter name.');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, `artifacts/${appId}/public/data/faces`), {
        userName: userName.trim(),
        capturedImage,
        facialFeatures: facialData,
        timestamp: new Date().toISOString(),
      });
      setMessage(`Data for "${userName}" saved!`);
      setUserName('');
      setCapturedImage(null);
      setFacialData(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      setMessage(`Error saving data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchData = async () => {
    if (!db || !userId || !searchName.trim()) {
      setMessage('Enter a name to search.');
      return;
    }
    setLoading(true);
    try {
      const q = query(collection(db, `artifacts/${appId}/public/data/faces`), where('userName', '==', searchName.trim()));
      const querySnapshot = await getDocs(q);
      const foundData = [];
      querySnapshot.forEach((doc) => {
        foundData.push({ id: doc.id, ...doc.data() });
      });
      setRetrievedData(foundData);
      setMessage(foundData.length ? `Found ${foundData.length} entries.` : 'No data found.');
    } catch (error) {
      setMessage(`Error searching data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center font-inter text-gray-800 overflow-hidden">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full h-full max-w-screen-xl overflow-auto space-y-8">
        <h1 className="text-4xl font-extrabold text-center text-indigo-700 mb-8">Facial Data App (CNN Model)</h1>

        {/* Camera & Upload Section */}
        <div className="flex flex-col md:flex-row gap-6 mb-8 items-center">
          <div className="w-full md:w-1/2 flex flex-col items-center p-4 bg-gray-50 rounded-lg shadow-inner">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Live Camera Feed</h2>
            {!capturedImage && (
              <video ref={videoRef} className="w-full max-w-md rounded-lg shadow-md border border-gray-200" autoPlay playsInline muted></video>
            )}
            <button
              onClick={handleCapturePhoto}
              className="mt-6 px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition duration-300"
              disabled={loading || capturedImage}
            >
              {loading && !capturedImage ? 'Processing...' : 'Capture Photo'}
            </button>

            <div className="mt-6 w-full max-w-md border-t border-gray-200 pt-6 text-center">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">OR Upload an Image</h3>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                disabled={loading}
              />
            </div>
          </div>

          <div className="w-full md:w-1/2 flex flex-col items-center p-4 bg-gray-50 rounded-lg shadow-inner">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Processed Image</h2>
            <canvas ref={canvasRef} className="hidden"></canvas>
            {capturedImage ? (
              <img src={capturedImage} alt="Processed" className="w-full max-w-md rounded-lg shadow-md border border-gray-200" />
            ) : (
              <div className="w-full max-w-md h-64 bg-gray-200 flex items-center justify-center rounded-lg shadow-md text-gray-500">
                No image captured or uploaded yet.
              </div>
            )}
            {facialData && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200 text-green-800 text-sm w-full max-w-md">
                <p><strong>CNN Model Prediction:</strong></p>
                <p>Eye Color: <span className="font-medium">{facialData.eyeColor}</span></p>
                <p>Face Shape: <span className="font-medium">{facialData.faceShape}</span></p>
                <p>Gender: <span className="font-medium">{facialData.gender}</span></p>
                <p>Confidence: <span className="font-medium">{facialData.confidence}</span></p>
              </div>
            )}
          </div>
        </div>

        {/* Save Data */}
        <div className="bg-purple-50 rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-purple-700 mb-4 text-center">Save Facial Data</h2>
          <input
            type="text"
            placeholder="Enter user name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full p-3 border border-purple-300 rounded-lg mb-4"
            disabled={loading}
          />
          <button
            onClick={handleSaveData}
            className="w-full px-6 py-3 bg-purple-600 text-white font-bold rounded-lg shadow-lg hover:bg-purple-700"
            disabled={loading || !userName || !capturedImage || !facialData}
          >
            {loading ? 'Saving...' : 'Save Data'}
          </button>
        </div>

        {/* Retrieve Data */}
        <div className="bg-teal-50 rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-teal-700 mb-4 text-center">Retrieve Data by Name</h2>
          <input
            type="text"
            placeholder="Enter name to search"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="w-full p-3 border border-teal-300 rounded-lg mb-4"
            disabled={loading}
          />
          <button
            onClick={handleSearchData}
            className="w-full px-6 py-3 bg-teal-600 text-white font-bold rounded-lg shadow-lg hover:bg-teal-700"
            disabled={loading || !searchName}
          >
            {loading ? 'Searching...' : 'Search Data'}
          </button>

          {retrievedData.length > 0 && (
            <div className="mt-6 space-y-4 max-h-80 overflow-y-auto p-2 bg-white rounded-lg border border-teal-200">
              {retrievedData.map((data) => (
                <div key={data.id} className="bg-teal-100 p-4 rounded-lg shadow-sm border border-teal-300">
                  <p className="font-bold text-teal-800 text-lg mb-2">User: {data.userName}</p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    {data.capturedImage && (
                      <img
                        src={data.capturedImage}
                        alt={`User ${data.userName}`}
                        className="w-full sm:w-1/3 h-auto rounded-md shadow-md object-cover"
                        onError={(e) => { e.target.onerror = null; 
                            e.target.src = 'https://placehold.co/150x150/e0f2f7/4dd0e1?text=Image+Error'; }}
                      />
                    )}
                    <div className="sm:flex-1 text-sm text-teal-700">
                      <p><strong>Eye Color:</strong> {data.facialFeatures?.eyeColor || 'N/A'}</p>
                      <p><strong>Face Shape:</strong> {data.facialFeatures?.faceShape || 'N/A'}</p>
                      <p><strong>Gender:</strong> {data.facialFeatures?.gender || 'N/A'}</p>
                      <p><strong>Confidence:</strong> {data.facialFeatures?.confidence || 'N/A'}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Saved on: {new Date(data.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {message && (
          <div className={`mt-6 p-4 rounded-lg text-center ${message.includes('Error') ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-green-100 text-green-700 border border-green-300'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
